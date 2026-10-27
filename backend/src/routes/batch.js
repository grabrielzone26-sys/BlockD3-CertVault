const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Certificate = require('../models/Certificate');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const crypto = require('crypto');
const AuditLog = require('../models/AuditLog');
const ipfsService = require('../config/ipfs');
const {
    issueCertificate,
    verifyCertificate
} = require('../services/fabricClient');
const { issueCertificateRecord } = require('../services/certificateIssuanceService');

const hashBuffer = (buffer) => {
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

const generateCertificateId = (studentId, documentHash) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    return crypto
        .createHash('sha256')
        .update(`${studentId}-${documentHash}-${Date.now()}-${nonce}`)
        .digest('hex');
};

// Batch certificate issuance (admin only)
router.post('/certificates', 
    auth, 
    admin,
    [
        body('certificates').isArray().withMessage('Certificates must be an array'),
        body('certificates.*.studentId').notEmpty().trim().withMessage('Student ID is required'),
        body('certificates.*.courseName').notEmpty().trim().withMessage('Course name is required'),
        body('certificates.*.metadata').isObject().withMessage('Metadata must be an object'),
        body('certificates.*.certificateFile').optional()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const results = {
            success: true,
            data: {
                totalProcessed: req.body.certificates.length,
                successful: 0,
                failed: 0,
                certificates: []
            }
        };

        try {
            // Process each certificate using centralized issuance service
            for (const certData of req.body.certificates) {
                try {
                    const resolvedCourseName = certData.metadata?.program || certData.courseName;
                    const resolvedStudentName = certData.metadata?.studentName || '';

                    const certificate = await issueCertificateRecord({
                        studentId: certData.studentId,
                        courseName: resolvedCourseName,
                        metadata: certData.metadata || {},
                        certificateFile: certData.certificateFile || null,
                        fileName: certData.fileName || null,
                        fileType: certData.fileType || null,
                        issuedByUser: req.user,
                        requestMeta: {
                            source: 'batch',
                            ipAddress: req.ip,
                            userAgent: req.headers['user-agent']
                        },
                        issuerDetails: certData.issuerDetails || {
                            institutionType: 'University',
                            institutionName: certData.metadata?.institution || 'BlockD3 University'
                        },
                        studentDetails: certData.studentDetails || {
                            studentNumber: certData.studentId,
                            fullName: resolvedStudentName,
                            nationalId: ''
                        },
                        academicRecord: certData.academicRecord || {
                            program: resolvedCourseName,
                            programSpecification: certData.metadata?.major || '',
                            awardClassification: certData.metadata?.cgpa ? String(certData.metadata.cgpa) : '',
                            graduationDate: certData.metadata?.graduationDate || new Date().toISOString()
                        }
                    });

                    results.data.successful++;
                    results.data.certificates.push({
                        certificateId: certificate.certificateId,
                        studentId: certData.studentId,
                        success: true,
                        transactionHash: null
                    });
                } catch (certError) {
                    console.error('Certificate processing error:', certError);
                    results.data.failed++;
                    results.data.certificates.push({
                        studentId: certData.studentId,
                        success: false,
                        error: certError.message
                    });
                }
            }

            res.status(201).json(results);
        } catch (error) {
            console.error('Batch issuance error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message,
                data: results.data
            });
        }
    }
);

// Batch certificate download
router.post('/certificates/download', 
    auth,
    [
        body('certificateIds').isArray().withMessage('Certificate IDs must be an array')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { certificateIds } = req.body;
            const results = [];
            
            for (const certificateId of certificateIds) {
                try {
                    const certificate = await Certificate.findOne({ certificateId });
                    
                    if (!certificate) {
                        results.push({
                            certificateId,
                            success: false,
                            error: 'Certificate not found'
                        });
                        continue;
                    }

                    // Check if user has access to this certificate
                    const isPrivilegedUser = ['admin', 'verifier'].includes(req.user.role);
                    const requestStudentId = req.user.studentId || req.user.profile?.studentId;
                    const isOwner = certificate.studentId === requestStudentId;
                    if (!isPrivilegedUser && !isOwner) {
                        results.push({
                            certificateId,
                            success: false,
                            error: 'Permission denied'
                        });
                        continue;
                    }

                    // Add download URL for frontend to use
                    results.push({
                        certificateId,
                        success: true,
                        downloadUrl: `/api/certificates/${certificateId}/download`
                    });
                } catch (error) {
                    results.push({
                        certificateId,
                        success: false,
                        error: error.message
                    });
                }
            }

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Batch certificate verification
router.post('/certificates/verify',
    auth,
    [
        body('certificateIds').isArray().withMessage('Certificate IDs must be an array')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { certificateIds } = req.body;
            const results = [];
            
            for (const certificateId of certificateIds) {
                try {
                    const certificate = await Certificate.findValidCertificate(certificateId);
                    
                    if (!certificate) {
                        results.push({
                            certificateId,
                            success: false,
                            error: 'Certificate not found or invalid'
                        });
                        continue;
                    }

                    let isValid = false;
                    let matchesHash = false;
                    let status = 'unknown';

                    try {
                        const verificationData = await verifyCertificate({
                            certificateId: certificate.certificateId,
                            documentHash: certificate.documentHash
                        });
                        isValid = verificationData.isValid;
                        matchesHash = verificationData.matchesHash !== false;

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
                        results.push({
                            certificateId,
                            success: false,
                            error: 'Fabric verification failed'
                        });
                        continue;
                    }

                    results.push({
                        certificateId,
                        success: true,
                        isValid,
                        matchesHash,
                        status,
                        verificationDate: new Date().toISOString(),
                        certificate: {
                            certificateId: certificate.certificateId,
                            studentId: certificate.studentId,
                            studentName: certificate.studentDetails?.fullName || certificate.metadata.studentName || '',
                            courseName: certificate.academicRecord?.program || certificate.courseName,
                            issueDate: certificate.metadata.issueDate || certificate.createdAt,
                            issuerDetails: certificate.issuerDetails || null,
                            studentDetails: certificate.studentDetails || null,
                            academicRecord: certificate.academicRecord || null,
                            documentEvidence: certificate.documentEvidence || null
                        }
                    });
                } catch (error) {
                    results.push({
                        certificateId,
                        success: false,
                        error: error.message
                    });
                }
            }

            await AuditLog.create({
                actor: req.user?._id,
                actorEmail: req.user?.email,
                action: 'fabric.certificate.batch-verify',
                target: `${certificateIds.length} certificate(s)`,
                metadata: {
                    total: results.length,
                    valid: results.filter((item) => item.isValid).length,
                    invalid: results.filter((item) => item.success && !item.isValid).length,
                    failed: results.filter((item) => !item.success).length,
                    certificateIds
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Batch certificate download URL generation
router.post('/certificates/download',
    auth,
    [
        body('certificateIds').isArray().withMessage('Certificate IDs must be an array')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const { certificateIds } = req.body;
            const certificates = await Certificate.find({
                certificateId: { $in: certificateIds }
            });

            const certificateMap = new Map(
                certificates.map((cert) => [cert.certificateId, cert])
            );

            const results = certificateIds.map((id) => {
                const cert = certificateMap.get(id);
                if (!cert) {
                    return {
                        certificateId: id,
                        downloadUrl: null,
                        error: 'Certificate not found'
                    };
                }
                return {
                    certificateId: id,
                    downloadUrl: `/api/certificates/${cert.certificateId}/download`,
                    studentId: cert.studentId,
                    status: cert.isValid ? 'valid' : 'revoked'
                };
            });

            await AuditLog.create({
                actor: req.user?._id,
                actorEmail: req.user?.email,
                action: 'fabric.certificate.batch-download',
                target: `${certificateIds.length} certificate(s)`,
                metadata: {
                    requested: certificateIds.length,
                    found: certificates.length,
                    certificateIds
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

module.exports = router;
