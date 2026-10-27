const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');
const Certificate = require('../models/Certificate');
const Submission = require('../models/Submission');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const crypto = require('crypto');
const ipfsService = require('../config/ipfs');
const {
    verifyCertificate,
    revokeCertificate
} = require('../services/fabricClient');
const fabricToIcpBridgeService = require('../services/fabricToIcpBridgeService');
const ECDSAService = require('../services/encryption/ecdsaService');
const { issueCertificateRecord } = require('../services/certificateIssuanceService');
const { generateDigitalCredentialPdf } = require('../services/digitalCredentialService');
const AuditLog = require('../models/AuditLog');

const detectFileInfo = (buffer, metadata = {}, certificateId = 'certificate') => {
    const storedType = metadata.originalFileType || metadata.fileType;
    const storedName = metadata.originalFileName || metadata.fileName;

    if (storedType && storedName) {
        return { contentType: storedType, filename: storedName };
    }

    const isPdf = buffer.slice(0, 4).toString('utf8') === '%PDF';
    const isPng = buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4e
        && buffer[3] === 0x47
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a;
    const isJpeg = buffer.length >= 3
        && buffer[0] === 0xff
        && buffer[1] === 0xd8
        && buffer[2] === 0xff;

    if (isPdf) {
        return {
            contentType: 'application/pdf',
            filename: storedName || `certificate-${certificateId}.pdf`
        };
    }

    if (isPng) {
        return {
            contentType: 'image/png',
            filename: storedName || `certificate-${certificateId}.png`
        };
    }

    if (isJpeg) {
        return {
            contentType: 'image/jpeg',
            filename: storedName || `certificate-${certificateId}.jpg`
        };
    }

    return {
        contentType: storedType || 'application/octet-stream',
        filename: storedName || `certificate-${certificateId}.bin`
    };
};

const stampQrOnPdf = async (pdfBytes, verificationUrl, certificateId) => {
    try {
        const pdfDocument = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        pdfDocument.setCreationDate(new Date(0));
        pdfDocument.setModificationDate(new Date(0));
        const qrPng = await QRCode.toBuffer(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 220
        });
        const embeddedQr = await pdfDocument.embedPng(qrPng);
        const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
        const page = pdfDocument.getPages()[0] || pdfDocument.addPage();
        const pageWidth = page.getWidth();
        const qrSize = 92;
        const margin = 24;
        const x = pageWidth - qrSize - margin;
        const y = margin;

        page.drawRectangle({
            x: x - 8,
            y: y - 26,
            width: qrSize + 16,
            height: qrSize + 42,
            color: rgb(1, 1, 1),
            opacity: 0.92,
            borderWidth: 1,
            borderColor: rgb(0.86, 0.89, 0.93)
        });

        page.drawImage(embeddedQr, {
            x,
            y,
            width: qrSize,
            height: qrSize,
        });

        page.drawText('Scan to verify', {
            x,
            y: y + qrSize + 8,
            size: 10,
            font,
            color: rgb(0.2, 0.24, 0.31)
        });

        page.drawText(certificateId.slice(0, 18), {
            x,
            y: y - 14,
            size: 7,
            font,
            color: rgb(0.38, 0.43, 0.5)
        });

        return Buffer.from(await pdfDocument.save());
    } catch (err) {
        console.warn('QR stamp notice (serving original PDF):', err.message);
        return pdfBytes;
    }
};

const imageBufferToPdf = async (buffer, contentType) => {
    const pdfDocument = await PDFDocument.create();
    pdfDocument.setCreationDate(new Date(0));
    pdfDocument.setModificationDate(new Date(0));
    let embeddedImage;

    if (contentType === 'image/png') {
        embeddedImage = await pdfDocument.embedPng(buffer);
    } else {
        embeddedImage = await pdfDocument.embedJpg(buffer);
    }

    const page = pdfDocument.addPage();
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const { width, height } = embeddedImage.scale(1);
    const scale = Math.min((pageWidth - 48) / width, (pageHeight - 48) / height, 1);
    const drawWidth = width * scale;
    const drawHeight = height * scale;

    page.drawImage(embeddedImage, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
    });

    return Buffer.from(await pdfDocument.save());
};

const buildDownloadPayload = async (buffer, metadata, certificateId, verificationUrl) => {
    const fileInfo = detectFileInfo(buffer, metadata, certificateId);

    if (fileInfo.contentType === 'image/png' || fileInfo.contentType === 'image/jpeg') {
        const pdfBuffer = await imageBufferToPdf(buffer, fileInfo.contentType);
        const stampedPdf = await stampQrOnPdf(pdfBuffer, verificationUrl, certificateId);
        return {
            buffer: stampedPdf,
            contentType: 'application/pdf',
            filename: `certificate-${certificateId}.pdf`
        };
    }

    if (fileInfo.contentType === 'application/pdf') {
        const stampedPdf = await stampQrOnPdf(buffer, verificationUrl, certificateId);
        return {
            buffer: stampedPdf,
            contentType: 'application/pdf',
            filename: fileInfo.filename || `certificate-${certificateId}.pdf`
        };
    }

    return {
        buffer,
        contentType: fileInfo.contentType,
        filename: fileInfo.filename
    };
};

const generateFallbackCertificatePdf = generateDigitalCredentialPdf;

const canUserAccessCertificate = async (user, certificate) => {
    if (!user || !certificate) return false;

    // Admins and verifiers can access any certificate
    if (['admin', 'verifier'].includes(user.role)) return true;

    // Certificate issuer
    if (certificate.issuedBy && certificate.issuedBy.toString() === user._id.toString()) {
        return true;
    }

    // Direct studentUser link
    if (certificate.studentUser && certificate.studentUser.toString() === user._id.toString()) {
        return true;
    }

    // Authorized viewers list
    if (Array.isArray(certificate.authorizedViewers) && certificate.authorizedViewers.some(v => v.userId && v.userId.toString() === user._id.toString())) {
        return true;
    }

    // Student ID / Student Number match
    const requestStudentId = user.studentId || user.profile?.studentId;
    if (requestStudentId) {
        if (certificate.studentId === requestStudentId) return true;
        if (certificate.studentDetails?.studentNumber === requestStudentId) return true;
    }

    // National ID match
    const userNationalId = user.nationalId || user.profile?.nationalId;
    if (userNationalId && certificate.studentDetails?.nationalId === userNationalId) {
        return true;
    }

    // Name match
    const userName = (user.profile?.fullName || user.username || '').trim().toLowerCase();
    const certName = (certificate.studentDetails?.fullName || certificate.metadata?.studentName || '').trim().toLowerCase();
    if (userName && certName && userName === certName) {
        return true;
    }

    // Linked submission check
    try {
        const submissionQuery = {
            issuedCertificateId: certificate.certificateId,
            $or: [
                { student: user._id },
                ...(requestStudentId ? [{ studentId: requestStudentId }] : [])
            ]
        };
        const submissionExists = await Submission.exists(submissionQuery);
        if (submissionExists) return true;
    } catch (subErr) {
        console.warn('Submission check error during auth:', subErr.message);
    }

    return false;
};


const isMatchingCertificateHash = async (providedHash, certificate, req) => {
    if (!providedHash || !certificate) return { matches: false };

    const cleanProvided = providedHash.trim().toLowerCase();

    // 1. Match original on-chain document hash
    if (certificate.documentHash && certificate.documentHash.toLowerCase() === cleanProvided) {
        return { matches: true, type: 'original_document' };
    }
    if (certificate.documentEvidence?.fileHash && certificate.documentEvidence.fileHash.toLowerCase() === cleanProvided) {
        return { matches: true, type: 'original_document' };
    }

    // 2. Match stored downloaded file hash
    if (certificate.metadata?.downloadedFileHash && certificate.metadata.downloadedFileHash.toLowerCase() === cleanProvided) {
        return { matches: true, type: 'issued_credential_pdf' };
    }

    // 3. Match recognized file hashes array
    if (Array.isArray(certificate.metadata?.recognizedFileHashes)) {
        if (certificate.metadata.recognizedFileHashes.some(h => h && h.toLowerCase() === cleanProvided)) {
            return { matches: true, type: 'issued_credential_pdf' };
        }
    }

    // 4. Try dynamic generation match
    try {
        const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${certificate.certificateId}`;
        let fileBuffer = null;
        if (certificate.metadata?.certificateFile) {
            fileBuffer = Buffer.from(certificate.metadata.certificateFile, 'base64');
            const payload = await buildDownloadPayload(fileBuffer, certificate.metadata, certificate.certificateId, verificationUrl);
            const genHash = crypto.createHash('sha256').update(payload.buffer).digest('hex').toLowerCase();
            if (genHash === cleanProvided) {
                if (!certificate.metadata.recognizedFileHashes) certificate.metadata.recognizedFileHashes = [];
                if (!certificate.metadata.recognizedFileHashes.includes(genHash)) {
                    certificate.metadata.recognizedFileHashes.push(genHash);
                    certificate.metadata.downloadedFileHash = genHash;
                    await certificate.save();
                }
                return { matches: true, type: 'issued_credential_pdf' };
            }
        }

        // Also test fallback PDF hash if applicable
        const fallbackPdf = await generateFallbackCertificatePdf(certificate, verificationUrl);
        const fallbackHash = crypto.createHash('sha256').update(fallbackPdf).digest('hex').toLowerCase();
        if (fallbackHash === cleanProvided) {
            if (!certificate.metadata) certificate.metadata = {};
            if (!certificate.metadata.recognizedFileHashes) certificate.metadata.recognizedFileHashes = [];
            if (!certificate.metadata.recognizedFileHashes.includes(fallbackHash)) {
                certificate.metadata.recognizedFileHashes.push(fallbackHash);
                certificate.metadata.downloadedFileHash = fallbackHash;
                await certificate.save();
            }
            return { matches: true, type: 'issued_credential_pdf' };
        }
    } catch (dynErr) {
        console.warn('Dynamic hash verification notice:', dynErr.message);
    }

    return { matches: false };
};

// Get all certificates (admin only)
router.get('/', auth, admin, async (req, res) => {
    try {
        const certificates = await Certificate.find()
            .sort({ 'metadata.issueDate': -1 })
            .limit(100);
        res.json({ success: true, data: certificates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Get certificates by student ID
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const requestUserStudentId = req.user?.studentId || req.user?.profile?.studentId;

        // Collect all issued certificate IDs for submissions by this user
        let submissionCertIds = [];
        if (req.user?._id) {
            const submissions = await Submission.find({
                student: req.user._id,
                status: 'issued',
                issuedCertificateId: { $exists: true, $ne: null }
            }).select('issuedCertificateId').lean();
            submissionCertIds = submissions.map(s => s.issuedCertificateId).filter(Boolean);
        }

        const orConditions = [
            { studentId },
            { 'studentDetails.studentNumber': studentId }
        ];
        if (submissionCertIds.length > 0) {
            orConditions.push({ certificateId: { $in: submissionCertIds } });
        }

        const certificates = await Certificate.find({
            isValid: true,
            $or: orConditions
        }).sort({ 'metadata.issueDate': -1 });

        res.json({ success: true, data: certificates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Lookup certificate metadata by document SHA-256 fingerprint
router.get('/lookup-by-hash/:hash', async (req, res) => {
    try {
        const cleanHash = (req.params.hash || '').trim().toLowerCase();
        if (!cleanHash) {
            return res.status(400).json({ success: false, error: 'Document hash is required' });
        }
        const certificate = await Certificate.findOne({
            $or: [
                { documentHash: cleanHash },
                { 'documentEvidence.fileHash': cleanHash },
                { 'metadata.downloadedFileHash': cleanHash },
                { 'metadata.recognizedFileHashes': cleanHash }
            ]
        });
        if (!certificate) {
            return res.status(404).json({ success: false, error: 'No certificate found matching this document fingerprint' });
        }
        return res.json({
            success: true,
            data: {
                certificateId: certificate.certificateId,
                studentId: certificate.studentId,
                courseName: certificate.academicRecord?.program || certificate.courseName,
                studentName: certificate.studentDetails?.fullName || certificate.metadata?.studentName || '',
                documentHash: certificate.documentHash,
                institutionName: certificate.issuerDetails?.institutionName || certificate.metadata?.institution || '',
                issueDate: certificate.createdAt
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Verify a certificate
router.get('/verify/:certificateId', async (req, res) => {
    try {
        const providedHash = (req.query.documentHash || req.query.hash || '').trim();
        let certificate = await Certificate.findOne({ certificateId: req.params.certificateId });

        // If certificate was not found by certificateId or was queried as by-hash,
        // attempt to resolve the certificate using the provided documentHash!
        if (!certificate && providedHash) {
            const cleanHash = providedHash.toLowerCase();
            certificate = await Certificate.findOne({
                $or: [
                    { documentHash: cleanHash },
                    { 'documentEvidence.fileHash': cleanHash },
                    { 'metadata.downloadedFileHash': cleanHash },
                    { 'metadata.recognizedFileHashes': cleanHash }
                ]
            });
            if (certificate) {
                console.log(`Auto-resolved certificate ID ${certificate.certificateId} from document hash ${cleanHash}`);
            }
        }

        const effectiveCertificateId = certificate ? certificate.certificateId : req.params.certificateId;

        let hashCheck = { matches: true, type: 'on_chain_hash' };
        let hashToPassToFabric = certificate?.documentHash || providedHash || '';

        if (providedHash && certificate) {
            hashCheck = await isMatchingCertificateHash(providedHash, certificate, req);
            if (hashCheck.matches) {
                // Since the file matches a valid official representation of this certificate,
                // verify the on-chain certificate status using the on-chain recorded hash
                hashToPassToFabric = certificate.documentHash;
            } else {
                // The provided file does not match any valid document for this certificate
                hashToPassToFabric = providedHash;
            }
        }

        if (!hashToPassToFabric && !certificate) {
            return res.status(400).json({
                success: false,
                error: 'documentHash is required for verification'
            });
        }

        let isValid = false;
        let blockchainVerified = false;
        let status = 'unknown';
        let verificationData = null;
        let matchesHash = false;

        try {
            verificationData = await verifyCertificate({
                certificateId: effectiveCertificateId,
                documentHash: hashToPassToFabric
            });
            blockchainVerified = true;
            isValid = Boolean(verificationData.isValid) && hashCheck.matches;
            matchesHash = verificationData.matchesHash !== false && hashCheck.matches;

            if (!verificationData.exists) {
                status = 'not_found';
            } else if (verificationData.certificate?.revokedAt) {
                status = 'revoked';
            } else if (!matchesHash) {
                status = 'hash_mismatch';
            } else if (isValid) {
                status = 'valid';
            } else {
                status = 'invalid';
            }
        } catch (error) {
            return res.status(502).json({
                success: false,
                error: 'Fabric verification failed'
            });
        }

        if (verificationData && !verificationData.exists) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found on Hyperledger Fabric'
            });
        }
        let icpResult = { checked: false, verified: false, status: 'skipped' };
        if (certificate?.icpAnchor?.isAnchored || certificate?.certificateId) {
            try {
                const isAnchored = await fabricToIcpBridgeService.verifyCertificateAnchor(certificate.certificateId);
                icpResult = {
                    checked: true,
                    verified: Boolean(isAnchored),
                    canisterId: fabricToIcpBridgeService.icpService?.config?.canisterId || process.env.ICP_CANISTER_ID || null,
                    status: isAnchored ? 'anchored' : 'unanchored'
                };
            } catch (icpErr) {
                icpResult = {
                    checked: true,
                    verified: false,
                    error: icpErr.message,
                    status: 'replica_offline'
                };
            }
        }

        // Cryptographic Verification: Verify ECDSA Digital Signature if present
        let ecdsaVerified = false;
        if (certificate?.encryption?.digitalSignature?.signature && certificate?.encryption?.issuerKeys?.publicKey) {
            try {
                const docHash = certificate.encryption.encryptedDocumentHash || certificate.documentHash;
                ecdsaVerified = ECDSAService.verify(
                    docHash,
                    certificate.encryption.digitalSignature.signature,
                    certificate.encryption.issuerKeys.publicKey
                );
            } catch (ecdsaErr) {
                ecdsaVerified = false;
            }
        }

        res.json({
            success: true,
            data: {
                isValid,
                matchesHash,
                blockchainVerified,
                fabricVerified: blockchainVerified && isValid,
                icpVerified: icpResult.verified,
                icpDetails: icpResult,
                ecdsaVerified,
                status,
                verifiedDocumentType: hashCheck.type || 'on_chain_hash',
                certificate: certificate || null
            }
        });

        await AuditLog.create({
            actor: req.user?._id,
            actorEmail: req.user?.email,
            action: 'fabric.certificate.verify',
            target: req.params.certificateId,
            metadata: {
                isValid,
                matchesHash,
                blockchainVerified
            },
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Issue new certificate (admin only)
router.post('/', 
    auth, 
    admin,
    [
        body('certificateFile').optional(),
        body('studentId').optional().trim(),
        body('courseName').optional().trim(),
        body('metadata').optional().isObject(),
        body('issuerDetails').optional().isObject(),
        body('studentDetails').optional().isObject(),
        body('academicRecord').optional().isObject()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Custom validation check: must provide either old style fields or new style objects
        const hasOldStyle = req.body.studentId && req.body.courseName;
        const hasNewStyle = req.body.studentDetails && req.body.issuerDetails && req.body.academicRecord;

        if (!hasOldStyle && !hasNewStyle) {
            return res.status(400).json({
                success: false,
                error: 'Invalid certificate payload. Must provide either (studentId and courseName) OR (issuerDetails, studentDetails, and academicRecord).'
            });
        }

        try {
            const certificate = await issueCertificateRecord({
                studentId: req.body.studentId,
                courseName: req.body.courseName,
                metadata: req.body.metadata || {},
                certificateFile: req.body.certificateFile,
                fileName: req.body.fileName || null,
                fileType: req.body.fileType || null,
                issuedByUser: req.user,
                requestMeta: {
                    source: 'manual',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                },
                // New structured payload fields
                issuerDetails: req.body.issuerDetails,
                studentDetails: req.body.studentDetails,
                academicRecord: req.body.academicRecord,
                documentEvidence: req.body.documentEvidence
            });

            res.status(201).json({
                success: true,
                data: certificate,
                message: 'Certificate issued and recorded on Hyperledger Fabric successfully'
            });
        } catch (error) {
            console.error('Certificate issuance error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);


// Revoke certificate (admin only)
router.put('/revoke/:certificateId',
    auth,
    admin,
    async (req, res) => {
        try {
            const certificate = await Certificate.findOne({ 
                certificateId: req.params.certificateId 
            });

            if (!certificate) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Certificate not found' 
                });
            }

            const fabricResult = await revokeCertificate({
                certificateId: certificate.certificateId,
                reason: req.body?.reason || null
            });

            if (!fabricResult.ok) {
                return res.status(502).json({
                    success: false,
                    error: fabricResult.error || 'Fabric revoke failed'
                });
            }

            // Update in database
            certificate.isValid = false;
            await certificate.save();

            await AuditLog.create({
                actor: req.user?._id,
                actorEmail: req.user?.email,
                action: 'fabric.certificate.revoke',
                target: certificate.certificateId,
                metadata: {
                    transactionHash: certificate.transactionHash || null,
                    studentId: certificate.studentId
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: certificate,
                message: 'Certificate revoked on Hyperledger Fabric successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);


// Get certificate by ID
router.get('/:certificateId', auth, async (req, res) => {
    try {
        const certificate = await Certificate.findOne({
            certificateId: req.params.certificateId
        }).populate('issuedBy', 'email profile.fullName');

        if (!certificate) {
            return res.status(404).json({
                success: false,
                error: 'Certificate not found'
            });
        }

        const hasAccess = await canUserAccessCertificate(req.user, certificate);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this certificate'
            });
        }

        res.json({
            success: true,
            data: certificate
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


// Download certificate
router.get('/:certificateId/download', auth, async (req, res) => {
    try {
        const certificate = await Certificate.findValidCertificate(req.params.certificateId);
        
        if (!certificate) {
            return res.status(404).json({ 
                success: false, 
                error: 'Certificate not found or invalid' 
            });
        }
        
        // Check if user has access to this certificate
        const hasAccess = await canUserAccessCertificate(req.user, certificate);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this certificate'
            });
        }

        // Check if user explicitly requested the raw original uploaded document/evidence
        const wantOriginal = req.query.original === 'true' || req.query.type === 'original' || req.query.type === 'evidence';
        if (wantOriginal) {
            let rawFileBase64 = certificate.metadata?.certificateFile;
            let rawFileName = certificate.metadata?.originalFileName;
            let rawFileType = certificate.metadata?.originalFileType;

            if (!rawFileBase64) {
                const sub = await Submission.findOne({
                    issuedCertificateId: certificate.certificateId,
                    certificateFile: { $exists: true, $ne: null }
                }).lean();
                if (sub) {
                    rawFileBase64 = sub.certificateFile;
                    rawFileName = sub.fileName;
                    rawFileType = sub.fileType;
                }
            }

            if (rawFileBase64) {
                const rawBuffer = Buffer.from(rawFileBase64, 'base64');
                const fileInfo = detectFileInfo(rawBuffer, { originalFileName: rawFileName, originalFileType: rawFileType }, certificate.certificateId);
                const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
                res.setHeader('Content-Type', fileInfo.contentType);
                res.setHeader('Content-Disposition', `${disposition}; filename="${fileInfo.filename}"`);
                return res.send(rawBuffer);
            } else if (certificate.ipfsHash) {
                try {
                    const rawBuffer = await ipfsService.downloadWithRetry(certificate.ipfsHash);
                    const fileInfo = detectFileInfo(rawBuffer, certificate.metadata, certificate.certificateId);
                    const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
                    res.setHeader('Content-Type', fileInfo.contentType);
                    res.setHeader('Content-Disposition', `${disposition}; filename="${fileInfo.filename}"`);
                    return res.send(rawBuffer);
                } catch (e) {
                    console.warn('IPFS original retrieval failed:', e.message);
                }
            }
        }

        try {
            const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${certificate.certificateId}`;
            
            // Default: Generate the official Digital Credential Diploma PDF matching the on-screen digital credential parchment view!
            console.log(`Generating official Digital Credential Diploma PDF for certificate ${certificate.certificateId}...`);
            const outBuffer = await generateDigitalCredentialPdf(certificate, verificationUrl);
            const outContentType = 'application/pdf';
            const outFilename = `digital-credential-${certificate.certificateId}.pdf`;

            // Register the downloaded file hash so it is guaranteed to verify on /verify
            try {
                const downloadHash = crypto.createHash('sha256').update(outBuffer).digest('hex').toLowerCase();
                if (!certificate.metadata) certificate.metadata = {};
                if (!certificate.metadata.recognizedFileHashes) certificate.metadata.recognizedFileHashes = [];
                if (!certificate.metadata.recognizedFileHashes.includes(downloadHash)) {
                    certificate.metadata.recognizedFileHashes.push(downloadHash);
                }
                certificate.metadata.downloadedFileHash = downloadHash;
                await certificate.save();
            } catch (saveErr) {
                console.warn('Could not record download hash:', saveErr.message);
            }

            const disposition = req.query.inline === 'true' ? 'inline' : 'attachment';
            res.setHeader('Content-Type', outContentType);
            res.setHeader('Content-Disposition', `${disposition}; filename="${outFilename}"`);
            return res.send(outBuffer);
            
        } catch (retrievalError) {
            console.error('Certificate retrieval error:', retrievalError);
            res.status(500).json({ success: false, error: 'Failed to retrieve certificate file' });
        }
    } catch (error) {
        console.error('Certificate download error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
