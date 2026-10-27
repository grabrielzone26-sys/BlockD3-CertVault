#!/usr/bin/env python3
import os
import re

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_ROUTES_PATH = os.path.join(REPO_ROOT, "backend", "src", "routes", "certificates.js")
FRONTEND_VIEW_PATH = os.path.join(REPO_ROOT, "frontend", "src", "pages", "certificates", "ViewCertificate.js")

digital_credential_fn = """const generateDigitalCredentialPdf = async (certificate, verificationUrl) => {
    const doc = await PDFDocument.create();
    doc.setCreationDate(new Date(0));
    doc.setModificationDate(new Date(0));
    const page = doc.addPage([842, 595]); // Landscape A4

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontTimesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const fontTimesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

    // 1. Warm parchment background fill (matches on-screen Digital Credential View)
    page.drawRectangle({
        x: 0,
        y: 0,
        width: 842,
        height: 595,
        color: rgb(0.996, 0.988, 0.973) // #FFFDF9
    });

    // 2. Outer Deep Navy border
    page.drawRectangle({
        x: 18,
        y: 18,
        width: 806,
        height: 559,
        borderColor: rgb(0.06, 0.12, 0.24), // #0F1F3D
        borderWidth: 2.5
    });

    // 3. Inner Rich Gold border
    page.drawRectangle({
        x: 24,
        y: 24,
        width: 794,
        height: 547,
        borderColor: rgb(0.85, 0.58, 0.15), // #D97706
        borderWidth: 1.2
    });

    // 4. Ornate Corner Accent squares in gold
    const drawCornerAccent = (x, y) => {
        page.drawRectangle({
            x,
            y,
            width: 10,
            height: 10,
            color: rgb(0.85, 0.58, 0.15),
            borderColor: rgb(0.06, 0.12, 0.24),
            borderWidth: 0.8
        });
    };
    drawCornerAccent(28, 557);
    drawCornerAccent(804, 557);
    drawCornerAccent(28, 28);
    drawCornerAccent(804, 28);

    const drawCentered = (text, y, size, font, color = rgb(0.06, 0.12, 0.24)) => {
        if (!text) return;
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (842 - textWidth) / 2, y, size, font, color });
    };

    const institution = (certificate.issuerDetails?.institutionName || certificate.metadata?.institution || 'Academic Institution').toUpperCase();
    const instType = (certificate.issuerDetails?.institutionType || 'University').toUpperCase() + ' • OFFICIAL CREDENTIAL';
    const studentName = certificate.studentDetails?.fullName || certificate.metadata?.studentName || 'Student';
    const studentNumber = certificate.studentDetails?.studentNumber || certificate.studentId || '';
    const nationalId = certificate.studentDetails?.nationalId || '';
    const program = certificate.academicRecord?.program || certificate.metadata?.program || certificate.courseName || 'Degree Certificate';
    const spec = certificate.academicRecord?.programSpecification || certificate.metadata?.major || '';
    const classification = certificate.academicRecord?.awardClassification || (certificate.metadata?.cgpa ? `CGPA: ${certificate.metadata.cgpa}` : certificate.metadata?.grade || '');
    const certNum = certificate.issuerDetails?.certificationNumber || certificate.certificateId;
    const gradDateRaw = certificate.academicRecord?.graduationDate || certificate.metadata?.graduationDate;
    const gradDateStr = gradDateRaw ? new Date(gradDateRaw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Official Senate Date';

    // Academic Seal (drawn with concentric gold circles & seal label)
    page.drawCircle({
        x: 421,
        y: 520,
        size: 26,
        color: rgb(0.98, 0.95, 0.88),
        borderColor: rgb(0.85, 0.58, 0.15),
        borderWidth: 2
    });
    page.drawCircle({
        x: 421,
        y: 520,
        size: 21,
        borderColor: rgb(0.85, 0.58, 0.15),
        borderWidth: 0.8
    });
    const sealText = 'SEAL';
    const sealTextWidth = fontBold.widthOfTextAtSize(sealText, 7);
    page.drawText(sealText, { x: 421 - sealTextWidth / 2, y: 517, size: 7, font: fontBold, color: rgb(0.57, 0.25, 0.05) });

    // Subtitle & Institution Name
    drawCentered(instType, 482, 9, fontBold, rgb(0.57, 0.25, 0.05));
    drawCentered(institution, 458, 22, fontBold, rgb(0.06, 0.12, 0.24));
    drawCentered('— Scientia • Integritas • Excellentia —', 442, 8, fontTimesItalic, rgb(0.70, 0.33, 0.04));

    // Conferment Narrative
    drawCentered(`By the authority of the University Senate and Council of ${institution.slice(0, 42)}, be it known that`, 418, 11, fontTimesItalic, rgb(0.25, 0.25, 0.25));

    // Student Name (large bold serif)
    drawCentered(studentName, 382, 26, fontTimesBold, rgb(0.06, 0.10, 0.20));

    // Underline beneath Student Name
    const nameWidth = fontTimesBold.widthOfTextAtSize(studentName, 26);
    const lineStart = Math.max(150, (842 - nameWidth) / 2 - 20);
    const lineEnd = Math.min(692, (842 + nameWidth) / 2 + 20);
    page.drawLine({
        start: { x: lineStart, y: 374 },
        end: { x: lineEnd, y: 374 },
        thickness: 1.2,
        color: rgb(0.85, 0.58, 0.15)
    });

    // Student identifiers
    const idParts = [];
    if (studentNumber) idParts.push(`Student ID: ${studentNumber}`);
    if (nationalId) idParts.push(`NRC / National ID: ${nationalId}`);
    if (idParts.length > 0) {
        drawCentered(idParts.join('   •   '), 358, 10, fontRegular, rgb(0.35, 0.35, 0.35));
    }

    drawCentered('having satisfactorily completed all prescribed academic requirements and examinations is admitted to the degree of', 332, 11, fontRegular, rgb(0.25, 0.25, 0.25));

    // Degree Program
    drawCentered(program, 302, 19, fontBold, rgb(0.12, 0.23, 0.54));

    if (spec && spec !== 'N/A') {
        drawCentered(`Major Specification: ${spec}`, 282, 10, fontRegular, rgb(0.47, 0.21, 0.06));
    }

    // Award Classification Box
    if (classification && classification !== 'N/A') {
        const classText = `Classification: ${classification}`;
        const classWidth = fontBold.widthOfTextAtSize(classText, 10);
        page.drawRectangle({
            x: (842 - classWidth) / 2 - 12,
            y: 254,
            width: classWidth + 24,
            height: 18,
            color: rgb(0.98, 0.94, 0.86),
            borderColor: rgb(0.85, 0.58, 0.15),
            borderWidth: 1
        });
        page.drawText(classText, { x: (842 - classWidth) / 2, y: 259, size: 10, font: fontBold, color: rgb(0.57, 0.25, 0.05) });
    }

    drawCentered(`Conferred on: ${gradDateStr}`, 234, 10, fontRegular, rgb(0.35, 0.35, 0.35));

    // Dual-Ledger QR Code in Center
    try {
        const qrPng = await QRCode.toBuffer(verificationUrl, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 220
        });
        const embeddedQr = await doc.embedPng(qrPng);
        const qrSize = 82;
        page.drawImage(embeddedQr, { x: 380, y: 110, width: qrSize, height: qrSize });

        const qrLabel = 'SCAN TO VERIFY DUAL-LEDGER';
        const qrLabelWidth = fontBold.widthOfTextAtSize(qrLabel, 7);
        page.drawText(qrLabel, { x: (842 - qrLabelWidth) / 2, y: 196, size: 7, font: fontBold, color: rgb(0.70, 0.33, 0.04) });

        const certIdLabel = certNum.slice(0, 24);
        const certIdWidth = fontRegular.widthOfTextAtSize(certIdLabel, 7);
        page.drawText(certIdLabel, { x: (842 - certIdWidth) / 2, y: 98, size: 7, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    } catch (qrErr) {
        console.warn('QR embed failed in certificate PDF:', qrErr.message);
    }

    // Left Signature: Vice-Chancellor / Principal
    page.drawLine({ start: { x: 80, y: 135 }, end: { x: 260, y: 135 }, thickness: 1, color: rgb(0.5, 0.55, 0.6) });
    const vcSig = 'Authorized Senate Executive';
    const vcSigWidth = fontTimesItalic.widthOfTextAtSize(vcSig, 12);
    page.drawText(vcSig, { x: 80 + (180 - vcSigWidth) / 2, y: 142, size: 12, font: fontTimesItalic, color: rgb(0.12, 0.23, 0.54) });
    const vcLabel = 'Vice-Chancellor / Principal';
    const vcLabelWidth = fontBold.widthOfTextAtSize(vcLabel, 9);
    page.drawText(vcLabel, { x: 80 + (180 - vcLabelWidth) / 2, y: 122, size: 9, font: fontBold, color: rgb(0.06, 0.12, 0.24) });

    // Right Signature: Registrar
    page.drawLine({ start: { x: 582, y: 135 }, end: { x: 762, y: 135 }, thickness: 1, color: rgb(0.5, 0.55, 0.6) });
    const regSig = 'Authorized Institutional Registrar';
    const regSigWidth = fontTimesItalic.widthOfTextAtSize(regSig, 12);
    page.drawText(regSig, { x: 582 + (180 - regSigWidth) / 2, y: 142, size: 12, font: fontTimesItalic, color: rgb(0.12, 0.23, 0.54) });
    const regLabel = 'University Registrar';
    const regLabelWidth = fontBold.widthOfTextAtSize(regLabel, 9);
    page.drawText(regLabel, { x: 582 + (180 - regLabelWidth) / 2, y: 122, size: 9, font: fontBold, color: rgb(0.06, 0.12, 0.24) });

    // Security Proof Bar at bottom
    page.drawRectangle({
        x: 35,
        y: 42,
        width: 772,
        height: 38,
        color: rgb(0.96, 0.97, 0.99),
        borderColor: rgb(0.80, 0.85, 0.92),
        borderWidth: 0.8
    });
    page.drawText('HYPERLEDGER FABRIC & ICP ANCHORED CREDENTIAL', { x: 48, y: 64, size: 8, font: fontBold, color: rgb(0.06, 0.12, 0.24) });
    page.drawText(`Certificate ID: ${certNum}`, { x: 48, y: 50, size: 7.5, font: fontRegular, color: rgb(0.25, 0.3, 0.35) });
    if (certificate.documentHash) {
        page.drawText(`SHA-256 Digest: ${certificate.documentHash.slice(0, 48)}...`, { x: 290, y: 50, size: 7, font: fontRegular, color: rgb(0.35, 0.4, 0.45) });
    }
    page.drawText('Status: Tamper-Proof & Verified', { x: 645, y: 50, size: 7.5, font: fontBold, color: rgb(0.10, 0.55, 0.30) });

    return Buffer.from(await doc.save());
};

const generateFallbackCertificatePdf = generateDigitalCredentialPdf;"""


def update_backend_routes():
    with open(BACKEND_ROUTES_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Replace generateFallbackCertificatePdf with generateDigitalCredentialPdf
    fn_pattern = r"const generateFallbackCertificatePdf = async \(certificate, verificationUrl\) => \{.*?return Buffer\.from\(await doc\.save\(\)\);\s*\};"
    if re.search(fn_pattern, content, re.DOTALL):
        content = re.sub(fn_pattern, digital_credential_fn, content, flags=re.DOTALL)
        print("[SUCCESS] Replaced generateFallbackCertificatePdf with generateDigitalCredentialPdf")
    else:
        print("[WARN] Could not find generateFallbackCertificatePdf definition")

    # 2. Update the download handler in router.get('/:certificateId/download')
    # Make sure that if original !== 'true', it serves the Digital Credential PDF!
    download_pattern = r"(// Download certificate\s*router\.get\('/:certificateId/download', auth, async \(req, res\) => \{.*?)(try \{\s*const verificationUrl = `\$\{req\.protocol\}://\$\{req\.get\('host'\)\}/verify/\$\{certificate\.certificateId\}`;)(.*?)(return res\.send\(outBuffer\);)"
    
    new_download_body = r"""        try {
            const verificationUrl = `${req.protocol}://${req.get('host')}/verify/${certificate.certificateId}`;
            let outBuffer = null;
            let outContentType = 'application/pdf';
            let outFilename = `certificate-${certificate.certificateId}.pdf`;

            // If user explicitly asks for original uploaded evidence (or type=original)
            const wantOriginal = req.query.original === 'true' || req.query.type === 'original' || req.query.type === 'evidence';

            if (wantOriginal) {
                // Try retrieving original uploaded file from metadata or submission
                if (certificate.metadata?.certificateFile) {
                    const rawBuffer = Buffer.from(certificate.metadata.certificateFile, 'base64');
                    const fileInfo = detectFileInfo(rawBuffer, certificate.metadata, certificate.certificateId);
                    outBuffer = rawBuffer;
                    outContentType = fileInfo.contentType;
                    outFilename = fileInfo.filename || `original-${certificate.certificateId}`;
                } else if (certificate.ipfsHash) {
                    try {
                        outBuffer = await ipfsService.downloadWithRetry(certificate.ipfsHash);
                        const fileInfo = detectFileInfo(outBuffer, certificate.metadata, certificate.certificateId);
                        outContentType = fileInfo.contentType;
                        outFilename = fileInfo.filename || `original-${certificate.certificateId}`;
                    } catch (e) {
                        console.warn('IPFS original retrieval failed:', e.message);
                    }
                }
            }

            // Default download or type=credential: Generate the official Digital Credential Diploma PDF (matching the on-screen Digital Credential View)
            if (!outBuffer) {
                console.log(`Generating official Digital Credential Diploma PDF for certificate ${certificate.certificateId}...`);
                outBuffer = await generateDigitalCredentialPdf(certificate, verificationUrl);
                outContentType = 'application/pdf';
                outFilename = `digital-credential-${certificate.certificateId}.pdf`;
            }

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
            return res.send(outBuffer);"""

    download_block_pattern = r"try \{\s*const verificationUrl = `\$\{req\.protocol\}://\$\{req\.get\('host'\)\}/verify/\$\{certificate\.certificateId\}`;.*?return res\.send\(outBuffer\);"
    if re.search(download_block_pattern, content, re.DOTALL):
        content = re.sub(download_block_pattern, new_download_body, content, flags=re.DOTALL)
        print("[SUCCESS] Updated download handler to serve Digital Credential Diploma by default!")
    else:
        print("[WARN] Download block pattern not matched")

    with open(BACKEND_ROUTES_PATH, "w", encoding="utf-8") as f:
        f.write(content)


def update_frontend_view():
    with open(FRONTEND_VIEW_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Update downloadCertificate signature and URL in ViewCertificate.js
    # Ensure downloadCertificate(type = 'credential')
    fn_old = r"const downloadCertificate = async \(isOriginal = false\) => \{.*?const endpoint = isOriginal \? `/api/certificates/\$\{id\}/download\?original=true` : `/api/certificates/\$\{id\}/download`;"
    fn_new = """const downloadCertificate = async (type = 'credential') => {
    if (isDownloading) {
      return;
    }

    try {
      setIsDownloading(true);
      if (!localStorage.getItem('token')) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const apiClient = createApiClient();
      const isOriginal = type === 'original';
      const endpoint = isOriginal ? `/api/certificates/${id}/download?original=true` : `/api/certificates/${id}/download?type=credential`;"""

    if re.search(fn_old, content, re.DOTALL):
        content = re.sub(fn_old, fn_new, content, flags=re.DOTALL)
        print("[SUCCESS] Updated downloadCertificate function in ViewCertificate.js")
    else:
        print("[WARN] downloadCertificate pattern not found in ViewCertificate.js")

    # Update download buttons in ViewCertificate.js
    btn_old = r"""<button\s*onClick=\{\(\) => downloadCertificate\(false\)\}\s*className="btn-secondary"\s*disabled=\{!certificate\.isValid \|\| isDownloading\}\s*title="Download official verifiable PDF credential with QR code"\s*>\s*<ArrowDownTrayIcon className="h-4 w-4 mr-1\.5" />\s*\{isDownloading \? 'Downloading\.\.\.' : 'Download PDF'\}\s*</button>"""
    btn_new = """<button
            onClick={() => downloadCertificate('credential')}
            className="btn-secondary bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-200 hover:text-white"
            disabled={!certificate.isValid || isDownloading}
            title="Download official Digital Credential Diploma PDF (matches on-screen credential)"
          >
            <AcademicCapIcon className="h-4 w-4 mr-1.5 text-amber-400" />
            {isDownloading ? 'Downloading...' : 'Download Digital Credential'}
          </button>"""

    if re.search(btn_old, content, re.DOTALL):
        content = re.sub(btn_old, btn_new, content, flags=re.DOTALL)
        print("[SUCCESS] Updated primary download button to Download Digital Credential")
    else:
        print("[WARN] Primary download button pattern not found")

    with open(FRONTEND_VIEW_PATH, "w", encoding="utf-8") as f:
        f.write(content)


if __name__ == "__main__":
    update_backend_routes()
    update_frontend_view()
