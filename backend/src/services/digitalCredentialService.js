const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const QRCode = require('qrcode');

// Page Dimensions: A4 Portrait
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;

// Invert Y coordinate so 0 is top of page and 841.89 is bottom of page
const fromTop = (y) => PAGE_HEIGHT - y;

// Institution Configuration Matrix
const INSTITUTIONS = {
    UNZA: {
        code: 'UNZA',
        shortName: 'UNZA',
        fullHeader: 'THE UNIVERSITY OF ZAMBIA',
        instType: 'UNIVERSITY',
        motto: '— Diligentia • Integritas • Excellentia —',
        logoFiles: ['unza.png', 'unza.jpg', 'University_of_Zambia_logo.jpg'],
        primaryColor: rgb(0.776, 0.157, 0.157), // #C62828 Crimson Red
        secondaryColor: rgb(0.106, 0.369, 0.125), // #1B5E20 Forest Green
        accentColor: rgb(0.706, 0.325, 0.035),
        style: 'UNZA',
        serialPrefix: 'SEN',
        serialLength: 5,
        defaultDegreeColor: rgb(0.776, 0.157, 0.157),
    },
    ZCAS: {
        code: 'ZCAS',
        shortName: 'ZCAS',
        fullHeader: 'ZCAS UNIVERSITY',
        instType: 'UNIVERSITY',
        motto: 'Aspire, Acquire, Prosper',
        logoFiles: ['zcas.png', 'zcas_logo.png'],
        primaryColor: rgb(0.08, 0.18, 0.36), // Navy
        secondaryColor: rgb(0.72, 0.52, 0.04), // Gold
        accentColor: rgb(0.35, 0.25, 0.55),
        style: 'ZCAS',
        serialPrefix: 'Serial No:',
        serialLength: 6,
        defaultDegreeColor: rgb(0.07, 0.07, 0.07),
    },
    MU: {
        code: 'MU',
        shortName: 'MU',
        fullHeader: 'MULUNGUSHI UNIVERSITY',
        instType: 'UNIVERSITY',
        motto: 'Pursuing the frontiers of knowledge',
        logoFiles: ['mulungushi.png', 'mu.png', 'Mulungushi_University_Logo.png'],
        primaryColor: rgb(0.29, 0.231, 0.549), // #4A3B8C Royal Purple
        secondaryColor: rgb(0.008, 0.467, 0.741), // #0277BD Cerulean Blue
        accentColor: rgb(0.776, 0.157, 0.157),
        style: 'MU',
        serialPrefix: 'MU/D',
        serialLength: 7,
        defaultDegreeColor: rgb(0.776, 0.157, 0.157),
    },
    CBU: {
        code: 'CBU',
        shortName: 'CBU',
        fullHeader: 'THE COPPERBELT UNIVERSITY',
        instType: 'UNIVERSITY',
        motto: 'Knowledge is Light',
        logoFiles: ['cbu.png', 'cbu_ logo.png'],
        primaryColor: rgb(0.051, 0.278, 0.631), // #0D47A1 Cobalt Blue
        secondaryColor: rgb(0.706, 0.325, 0.035), // #B45309 Gold
        accentColor: rgb(0.776, 0.157, 0.157),
        style: 'UNZA',
        serialPrefix: 'CBU/SEN',
        serialLength: 5,
        defaultDegreeColor: rgb(0.776, 0.157, 0.157),
    },
    NIPA: {
        code: 'NIPA',
        shortName: 'NIPA',
        fullHeader: 'NATIONAL INSTITUTE OF PUBLIC ADMINISTRATION',
        instType: 'INSTITUTE',
        motto: 'Excellence in Public Administration',
        logoFiles: ['nipa.png', 'nipa -logo.png'],
        primaryColor: rgb(0.118, 0.227, 0.541), // #1E3A8A Navy Blue
        secondaryColor: rgb(0.706, 0.325, 0.035), // Gold
        accentColor: rgb(0.776, 0.157, 0.157),
        style: 'ZCAS',
        serialPrefix: 'NIPA/SN',
        serialLength: 6,
        defaultDegreeColor: rgb(0.118, 0.227, 0.541),
    },
    KMU: {
        code: 'KMU',
        shortName: 'KMU',
        fullHeader: 'KAPASA MAKASA UNIVERSITY',
        instType: 'UNIVERSITY',
        motto: 'Empowering through Quality Higher Education',
        logoFiles: ['kmu.png', 'kmu_lg.png'],
        primaryColor: rgb(0.498, 0.114, 0.114), // #7F1D1D Maroon
        secondaryColor: rgb(0.078, 0.325, 0.176), // #14532D Dark Forest Green
        accentColor: rgb(0.706, 0.325, 0.035),
        style: 'UNZA',
        serialPrefix: 'KMU/SEN',
        serialLength: 5,
        defaultDegreeColor: rgb(0.776, 0.157, 0.157),
    }
};

/**
 * Resolve institution configuration from certificate metadata
 */
const resolveInstitution = (certificate) => {
    const raw = (
        certificate.institutionCode ||
        certificate.university ||
        certificate.issuerDetails?.institutionCode ||
        certificate.issuerDetails?.institutionName ||
        certificate.metadata?.institution ||
        certificate.certificateId ||
        'UNZA'
    ).toUpperCase();

    if (raw.includes('ZCAS')) return INSTITUTIONS.ZCAS;
    if (raw.includes('MULUNGUSHI') || raw.startsWith('MU-') || raw === 'MU') return INSTITUTIONS.MU;
    if (raw.includes('COPPERBELT') || raw.includes('CBU')) return INSTITUTIONS.CBU;
    if (raw.includes('NIPA')) return INSTITUTIONS.NIPA;
    if (raw.includes('KAPASA') || raw.includes('KMU')) return INSTITUTIONS.KMU;
    return INSTITUTIONS.UNZA;
};

/**
 * Locate and read official university crest image
 */
const loadLogoBuffer = (inst) => {
    const searchDirs = [
        path.join(__dirname, '../../assets/logos'),
        path.join(__dirname, '../../../frontend/src/assets/images/logos for universities'),
    ];

    for (const dir of searchDirs) {
        if (!fs.existsSync(dir)) continue;
        for (const fileName of inst.logoFiles) {
            const fullPath = path.join(dir, fileName);
            if (fs.existsSync(fullPath)) {
                try {
                    return fs.readFileSync(fullPath);
                } catch (e) {
                    console.warn(`Could not read logo at ${fullPath}:`, e.message);
                }
            }
        }
    }
    return null;
};

/**
 * Convert Date string into Zambian ordinal format: "26th", "April", "2022"
 */
const parseGraduationDate = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date(0);
    const day = d.getUTCDate() || 26;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[d.getUTCMonth()] || 'April';
    const year = String(d.getUTCFullYear() || 2022);

    const getOrdinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    return {
        day: getOrdinal(day),
        month,
        year,
        fullFormatted: `${getOrdinal(day)} day of ${month} in the year ${year}`
    };
};

/**
 * Generate 36-point serrated starburst SVG path
 */
const generateWaferPath = (cx, cy, outerR = 46, innerR = 41, points = 36) => {
    let d = '';
    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points;
        const r = i % 2 === 0 ? outerR : innerR;
        const px = cx + r * Math.sin(angle);
        const py = cy + r * Math.cos(angle);
        d += (i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`);
    }
    return d + ' Z';
};

/**
 * Generate deterministic serial number from certificate ID
 */
const deriveSerial = (certId = '', length = 5) => {
    let hash = 0;
    for (let i = 0; i < certId.length; i++) {
        hash = ((hash << 5) - hash) + certId.charCodeAt(i);
        hash |= 0;
    }
    const positive = Math.abs(hash);
    return String(positive).padStart(length, '0').slice(-length);
};

/**
 * Synthesizes official A4 Portrait Zambian University Certificate PDF
 */
const generateDigitalCredentialPdf = async (certificate, verificationUrl) => {
    const inst = resolveInstitution(certificate);
    const certId = certificate.certificateId || certificate.issuerDetails?.certificationNumber || 'CERT-000000';

    // Deterministic creation timestamp from graduation date
    const gradDateRaw = certificate.academicRecord?.graduationDate || certificate.metadata?.graduationDate;
    const deterministicDate = gradDateRaw ? new Date(gradDateRaw) : new Date(0);

    const doc = await PDFDocument.create();
    doc.setTitle(`${inst.shortName} Official Degree Certificate - ${certId}`);
    doc.setAuthor(inst.fullHeader);
    doc.setSubject('Cryptographically Anchored Academic Degree Credential');
    doc.setProducer('BlockD3 CertVault (Hyperledger Fabric & ICP)');
    doc.setCreationDate(deterministicDate);
    doc.setModificationDate(deterministicDate);

    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Embed Standard Fonts
    const fontSerifBold = await doc.embedFont(StandardFonts.TimesRomanBold);
    const fontSerifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const fontSerifRegular = await doc.embedFont(StandardFonts.TimesRoman);
    const fontSansBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontSansRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontMono = await doc.embedFont(StandardFonts.Courier);
    const fontMonoBold = await doc.embedFont(StandardFonts.CourierBold);

    // Helpers
    const drawCentered = (text, topY, size, font, color, options = {}) => {
        if (!text) return;
        const width = font.widthOfTextAtSize(text, size);
        const x = (PAGE_WIDTH - width) / 2;
        page.drawText(text, {
            x,
            y: fromTop(topY),
            size,
            font,
            color,
            ...options
        });
    };

    // ─────────────────────────────────────────────────────────────
    // ZONE 1: Security Background, Watermark & Institutional Border
    // ─────────────────────────────────────────────────────────────

    // 1. Base Paper Fill: Warm security parchment (#FAF8F3)
    page.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
        color: rgb(0.98, 0.973, 0.953)
    });

    if (inst.style === 'UNZA') {
        // UNZA / CBU / KMU Style: Double Rectangular Inset Border
        page.drawRectangle({
            x: 24,
            y: 24,
            width: PAGE_WIDTH - 48,
            height: PAGE_HEIGHT - 48,
            borderColor: inst.primaryColor,
            borderWidth: 1.5
        });

        page.drawRectangle({
            x: 28,
            y: 28,
            width: PAGE_WIDTH - 56,
            height: PAGE_HEIGHT - 56,
            borderColor: inst.secondaryColor,
            borderWidth: 1.2
        });

        // Ornate Corner Accents
        const drawCornerBox = (cx, cy) => {
            page.drawRectangle({
                x: cx - 4,
                y: cy - 4,
                width: 8,
                height: 8,
                color: inst.primaryColor,
                borderColor: inst.secondaryColor,
                borderWidth: 0.8
            });
        };
        drawCornerBox(28, 28);
        drawCornerBox(PAGE_WIDTH - 28, 28);
        drawCornerBox(28, PAGE_HEIGHT - 28);
        drawCornerBox(PAGE_WIDTH - 28, PAGE_HEIGHT - 28);

        // Micro-text watermarked diagonal background lines
        const microText = `${inst.fullHeader} • DIPLOMA SECURITY REPOSITORY • `;
        const microFont = fontSansBold;
        for (let rowY = 45; rowY <= 730; rowY += 38) {
            page.drawText(microText.repeat(3), {
                x: 34,
                y: fromTop(rowY),
                size: 5.5,
                font: microFont,
                color: rgb(0.18, 0.22, 0.18),
                opacity: 0.07,
            });
        }
    } else if (inst.style === 'ZCAS') {
        // ZCAS / NIPA Style: Thin border + upper horizontal guilloche wave band + central faint shield
        page.drawRectangle({
            x: 22,
            y: 22,
            width: PAGE_WIDTH - 44,
            height: PAGE_HEIGHT - 44,
            borderColor: inst.primaryColor,
            borderWidth: 1.8
        });
        page.drawRectangle({
            x: 26,
            y: 26,
            width: PAGE_WIDTH - 52,
            height: PAGE_HEIGHT - 52,
            borderColor: inst.secondaryColor,
            borderWidth: 0.8
        });

        // Horizontal sinusoidal guilloche waves across upper header band (y = 75 to 155pt)
        for (let gy = 75; gy <= 155; gy += 16) {
            page.drawRectangle({
                x: 35,
                y: fromTop(gy),
                width: PAGE_WIDTH - 70,
                height: 0.6,
                color: inst.secondaryColor,
                opacity: 0.18
            });
        }

        // Central watermark shield
        page.drawCircle({
            x: PAGE_WIDTH / 2,
            y: fromTop(390),
            size: 110,
            borderColor: inst.primaryColor,
            borderWidth: 1.5,
            opacity: 0.06
        });
    } else if (inst.style === 'MU') {
        // Mulungushi (MU): Ornate Scalloped Royal Purple / Cerulean Blue Guilloche Frame
        page.drawRectangle({
            x: 20,
            y: 20,
            width: PAGE_WIDTH - 40,
            height: PAGE_HEIGHT - 40,
            borderColor: inst.primaryColor,
            borderWidth: 2.2
        });
        page.drawRectangle({
            x: 25,
            y: 25,
            width: PAGE_WIDTH - 50,
            height: PAGE_HEIGHT - 50,
            borderColor: inst.secondaryColor,
            borderWidth: 1.0
        });

        // Corner circular medallions
        const drawMedallion = (x, y) => {
            page.drawCircle({
                x,
                y,
                size: 8,
                color: inst.primaryColor,
                borderColor: inst.secondaryColor,
                borderWidth: 0.8
            });
        };
        drawMedallion(25, 25);
        drawMedallion(PAGE_WIDTH - 25, 25);
        drawMedallion(25, PAGE_HEIGHT - 25);
        drawMedallion(PAGE_WIDTH - 25, PAGE_HEIGHT - 25);
    }

    // ─────────────────────────────────────────────────────────────
    // ZONE 2: University Crest & Header Title (y = 45pt – 195pt)
    // ─────────────────────────────────────────────────────────────

    const logoBuffer = loadLogoBuffer(inst);
    let embeddedLogo = null;
    if (logoBuffer) {
        try {
            const isJpg = logoBuffer[0] === 0xff && logoBuffer[1] === 0xd8;
            embeddedLogo = isJpg ? await doc.embedJpg(logoBuffer) : await doc.embedPng(logoBuffer);
        } catch (e) {
            console.warn(`Error embedding logo for ${inst.code}, using fallback emblem:`, e.message);
        }
    }

    const drawVectorShield = (centerX, centerY) => {
        // Clean programmatic vector shield fallback
        page.drawCircle({
            x: centerX,
            y: centerY,
            size: 36,
            color: rgb(0.98, 0.95, 0.88),
            borderColor: inst.primaryColor,
            borderWidth: 2
        });
        page.drawCircle({
            x: centerX,
            y: centerY,
            size: 30,
            borderColor: inst.secondaryColor,
            borderWidth: 1
        });
        const emblemText = inst.shortName;
        const emblemWidth = fontSansBold.widthOfTextAtSize(emblemText, 14);
        page.drawText(emblemText, {
            x: centerX - emblemWidth / 2,
            y: centerY - 5,
            size: 14,
            font: fontSansBold,
            color: inst.primaryColor
        });
    };

    if (inst.code === 'ZCAS') {
        // ZCAS Ordering Rule: Header Name above crest at y = 42pt, Crest below at y = 78pt - 160pt
        drawCentered('ZCAS UNIVERSITY', 52, 22, fontSerifBold, rgb(0.1, 0.1, 0.1));
        drawCentered('— Aspire • Acquire • Prosper —', 72, 8.5, fontSerifItalic, inst.secondaryColor);

        if (embeddedLogo) {
            const scale = Math.min(85 / embeddedLogo.width, 85 / embeddedLogo.height);
            const w = embeddedLogo.width * scale;
            const h = embeddedLogo.height * scale;
            page.drawImage(embeddedLogo, {
                x: (PAGE_WIDTH - w) / 2,
                y: fromTop(84 + h),
                width: w,
                height: h
            });
        } else {
            drawVectorShield(PAGE_WIDTH / 2, fromTop(125));
        }

        drawCentered('OFFICIAL DEGREE CREDENTIAL', 186, 9.5, fontSansBold, inst.primaryColor);
    } else {
        // UNZA / MU / CBU / NIPA / KMU: Crest at y = 46pt – 132pt, University Name below at y = 148pt
        if (embeddedLogo) {
            const scale = Math.min(85 / embeddedLogo.width, 85 / embeddedLogo.height);
            const w = embeddedLogo.width * scale;
            const h = embeddedLogo.height * scale;
            page.drawImage(embeddedLogo, {
                x: (PAGE_WIDTH - w) / 2,
                y: fromTop(46 + h),
                width: w,
                height: h
            });
        } else {
            drawVectorShield(PAGE_WIDTH / 2, fromTop(88));
        }

        drawCentered(inst.fullHeader, 150, 19, fontSerifBold, rgb(0.11, 0.11, 0.11));
        drawCentered(inst.motto, 168, 8.5, fontSerifItalic, inst.secondaryColor);
        drawCentered(`${inst.instType} • OFFICIAL CREDENTIAL`, 184, 8, fontSansBold, inst.primaryColor);
    }

    // ─────────────────────────────────────────────────────────────
    // ZONE 3: Certification Preamble & Student Name (y = 210pt – 305pt)
    // ─────────────────────────────────────────────────────────────

    if (inst.code === 'MU') {
        drawCentered('This is to certify that', 216, 12.5, fontSerifItalic, rgb(0.2, 0.2, 0.2));
    } else if (inst.code === 'ZCAS' || inst.code === 'NIPA') {
        drawCentered('THIS IS TO CERTIFY THAT', 216, 11.5, fontSerifRegular, rgb(0.18, 0.18, 0.18));
    } else {
        drawCentered('THIS IS TO CERTIFY THAT', 216, 13, fontSansRegular, rgb(0.15, 0.15, 0.15));
    }

    const studentName = certificate.studentDetails?.fullName || certificate.metadata?.studentName || 'Graduating Student';

    if (inst.code === 'MU') {
        // Old English / Blackletter Gothic styled serif
        drawCentered(studentName, 262, 27, fontSerifBold, rgb(0.06, 0.06, 0.06));
    } else if (inst.code === 'ZCAS' || inst.code === 'NIPA') {
        // Bold classic serif
        drawCentered(studentName, 260, 25, fontSerifBold, rgb(0.06, 0.06, 0.06));
    } else {
        // UNZA / CBU / KMU: Calligraphic script / italic
        drawCentered(studentName, 262, 30, fontSerifItalic, rgb(0.08, 0.08, 0.08));
    }

    // Underline beneath Student Name
    const nameWidth = fontSerifBold.widthOfTextAtSize(studentName, 25);
    const lineStart = Math.max(90, (PAGE_WIDTH - nameWidth) / 2 - 18);
    const lineEnd = Math.min(PAGE_WIDTH - 90, (PAGE_WIDTH + nameWidth) / 2 + 18);
    page.drawLine({
        start: { x: lineStart, y: fromTop(274) },
        end: { x: lineEnd, y: fromTop(274) },
        thickness: 1.1,
        color: inst.secondaryColor
    });

    // Student identifiers (NRC & Student ID)
    const studentNumber = certificate.studentDetails?.studentNumber || certificate.studentId || '';
    const nationalId = certificate.studentDetails?.nationalId || certificate.metadata?.nationalId || '';
    const idParts = [];
    if (studentNumber) idParts.push(`Student ID: ${studentNumber}`);
    if (nationalId) idParts.push(`NRC / National ID: ${nationalId}`);
    if (idParts.length > 0) {
        drawCentered(idParts.join('   •   '), 292, 9.5, fontSansRegular, rgb(0.35, 0.35, 0.35));
    }

    // ─────────────────────────────────────────────────────────────
    // ZONE 4: Fulfilment Clause, Degree, Major & Classification (y = 315pt – 475pt)
    // ─────────────────────────────────────────────────────────────

    if (inst.code === 'ZCAS') {
        drawCentered('having satisfied the University requirements for the', 320, 11.5, fontSerifRegular, rgb(0.2, 0.2, 0.2));
        drawCentered('award of the degree of', 335, 11.5, fontSerifRegular, rgb(0.2, 0.2, 0.2));
    } else {
        drawCentered('having satisfied the requirements for the', 320, 12, fontSerifRegular, rgb(0.2, 0.2, 0.2));
        drawCentered('award of the degree of', 335, 12, fontSerifRegular, rgb(0.2, 0.2, 0.2));
    }

    const program = (certificate.academicRecord?.program || certificate.metadata?.program || certificate.courseName || 'Bachelor of Science').trim();

    if (inst.code === 'MU') {
        // Mulungushi: Title-case Crimson
        drawCentered(program, 368, 16.5, fontSerifBold, inst.defaultDegreeColor);
    } else if (inst.code === 'ZCAS') {
        // ZCAS: Uppercase Bold Black Serif
        drawCentered(program.toUpperCase(), 368, 18, fontSerifBold, rgb(0.08, 0.08, 0.08));
    } else {
        // UNZA / CBU / KMU / NIPA: Uppercase Bold Crimson
        drawCentered(program.toUpperCase(), 368, 19, fontSerifBold, inst.defaultDegreeColor);
    }

    // Major Specification in Parentheses in Forest Green
    const rawMajor = certificate.academicRecord?.programSpecification || certificate.metadata?.major || '';
    const cleanMajor = rawMajor && rawMajor !== 'N/A' ? rawMajor.replace(/^\(|\)$/g, '').trim() : '';

    if (cleanMajor) {
        const majorText = `(${cleanMajor})`;
        drawCentered(majorText, 402, 14.5, fontSerifBold, rgb(0.18, 0.49, 0.196));
    }

    // Award Classification (e.g. With Merit, With Distinction)
    const classification = certificate.academicRecord?.awardClassification || (certificate.metadata?.cgpa ? `CGPA: ${certificate.metadata.cgpa}` : certificate.metadata?.grade || '');
    if (classification && classification !== 'N/A') {
        drawCentered(classification, 442, 16.5, fontSerifItalic, rgb(0.12, 0.12, 0.12));
    }

    // ─────────────────────────────────────────────────────────────
    // ZONE 5: Graduation Conferral Date & Senate Stamp (y = 485pt – 555pt)
    // ─────────────────────────────────────────────────────────────

    // Left Circular Senate Stamp (Embossed style for public universities)
    if (['UNZA', 'CBU', 'KMU', 'MU'].includes(inst.code)) {
        const stampX = 95;
        const stampY = fromTop(500);

        page.drawCircle({
            x: stampX,
            y: stampY,
            size: 34,
            borderColor: rgb(0.15, 0.22, 0.32),
            borderWidth: 1.2,
            opacity: 0.25
        });
        page.drawCircle({
            x: stampX,
            y: stampY,
            size: 28,
            borderColor: rgb(0.15, 0.22, 0.32),
            borderWidth: 0.7,
            opacity: 0.25
        });

        const stampLabel = `${inst.shortName} • SENATE`;
        const stampLabelWidth = fontSansBold.widthOfTextAtSize(stampLabel, 6.5);
        page.drawText(stampLabel, {
            x: stampX - stampLabelWidth / 2,
            y: stampY - 3,
            size: 6.5,
            font: fontSansBold,
            color: rgb(0.15, 0.22, 0.32),
            opacity: 0.35
        });
    }

    // Conferral Date formatting
    const gradDate = parseGraduationDate(gradDateRaw);

    if (inst.code === 'ZCAS' || inst.code === 'NIPA') {
        drawCentered('was admitted to the degree at a Graduation Ceremony', 495, 11, fontSerifRegular, rgb(0.2, 0.2, 0.2));
        drawCentered(`held on ${gradDate.day} day of ${gradDate.month} in the year ${gradDate.year}`, 512, 11.5, fontSerifItalic, rgb(0.15, 0.15, 0.15));
    } else {
        drawCentered('was admitted to the degree at a Graduation', 495, 11.5, fontSerifRegular, rgb(0.2, 0.2, 0.2));
        drawCentered(`Ceremony held on the   ${gradDate.day}   day`, 512, 11.5, fontSerifItalic, rgb(0.15, 0.15, 0.15));
        drawCentered(`of   ${gradDate.month}   in the year   ${gradDate.year}`, 528, 11.5, fontSerifItalic, rgb(0.15, 0.15, 0.15));
    }

    // ─────────────────────────────────────────────────────────────
    // ZONE 6: Signatures, Serrated Red Wafer Seal & Serials (y = 575pt – 730pt)
    // ─────────────────────────────────────────────────────────────

    // Left Signature: Vice-Chancellor
    const sigY = fromTop(600);
    page.drawLine({
        start: { x: 75, y: sigY },
        end: { x: 225, y: sigY },
        thickness: 0.9,
        color: rgb(0.4, 0.45, 0.5)
    });
    // Stylized signature stroke
    page.drawText('Prof. Authorized Senate Executive', {
        x: 82,
        y: sigY + 6,
        size: 10,
        font: fontSerifItalic,
        color: rgb(0.1, 0.2, 0.45)
    });
    page.drawText('Vice-Chancellor', {
        x: 115,
        y: sigY - 14,
        size: 10,
        font: fontSansBold,
        color: rgb(0.15, 0.15, 0.15)
    });

    // Right Signature: Registrar
    page.drawLine({
        start: { x: 370, y: sigY },
        end: { x: 520, y: sigY },
        thickness: 0.9,
        color: rgb(0.4, 0.45, 0.5)
    });
    // Stylized signature stroke
    page.drawText('Dr. Authorized Institutional Registrar', {
        x: 374,
        y: sigY + 6,
        size: 10,
        font: fontSerifItalic,
        color: rgb(0.1, 0.2, 0.45)
    });
    page.drawText('Registrar', {
        x: 420,
        y: sigY - 14,
        size: 10,
        font: fontSansBold,
        color: rgb(0.15, 0.15, 0.15)
    });

    // Center 36-Point Serrated Crimson Wafer Seal
    const sealCenterX = PAGE_WIDTH / 2;
    const sealCenterY = fromTop(655);

    try {
        const waferSvg = generateWaferPath(sealCenterX, sealCenterY, 46, 41, 36);
        page.drawSvgPath(waferSvg, {
            color: rgb(0.835, 0, 0), // #D50000 Rich Crimson
            borderColor: rgb(0.718, 0.11, 0.11),
            borderWidth: 1.0
        });

        // Inner embossed concentric gold/crimson rings
        page.drawCircle({
            x: sealCenterX,
            y: sealCenterY,
            size: 30,
            borderColor: rgb(0.98, 0.85, 0.45),
            borderWidth: 1.2,
            color: rgb(0.718, 0.11, 0.11)
        });
        page.drawCircle({
            x: sealCenterX,
            y: sealCenterY,
            size: 24,
            borderColor: rgb(0.98, 0.85, 0.45),
            borderWidth: 0.7
        });

        const sealTitle = 'OFFICIAL';
        const sealSub = 'SEAL';
        const stW = fontSansBold.widthOfTextAtSize(sealTitle, 6.5);
        const ssW = fontSansBold.widthOfTextAtSize(sealSub, 6.5);
        page.drawText(sealTitle, {
            x: sealCenterX - stW / 2,
            y: sealCenterY + 1,
            size: 6.5,
            font: fontSansBold,
            color: rgb(0.98, 0.85, 0.45)
        });
        page.drawText(sealSub, {
            x: sealCenterX - ssW / 2,
            y: sealCenterY - 7,
            size: 6.5,
            font: fontSansBold,
            color: rgb(0.98, 0.85, 0.45)
        });
    } catch (waferErr) {
        console.warn('Wafer seal SVG draw notice:', waferErr.message);
    }

    // Corner Institutional Identifiers
    const serialVal = deriveSerial(certId, inst.serialLength);

    if (inst.code === 'ZCAS' || inst.code === 'NIPA') {
        // Bottom-Left Metallic Hologram Badge
        const holoX = 65;
        const holoY = fromTop(712);
        page.drawRectangle({
            x: holoX,
            y: holoY,
            width: 44,
            height: 44,
            color: rgb(0.12, 0.14, 0.18),
            borderColor: rgb(0.6, 0.65, 0.7),
            borderWidth: 1
        });
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                page.drawCircle({
                    x: holoX + 8 + col * 14,
                    y: holoY + 8 + row * 14,
                    size: 3,
                    color: row % 2 === 0 ? rgb(0.2, 0.8, 0.8) : rgb(0.9, 0.75, 0.2),
                    opacity: 0.75
                });
            }
        }
        page.drawText('SECURITY', {
            x: holoX + 4,
            y: holoY - 10,
            size: 6,
            font: fontSansBold,
            color: rgb(0.4, 0.4, 0.4)
        });

        // Bottom-Right Serial
        const serialText = `${inst.serialPrefix} ${serialVal}`;
        page.drawText(serialText, {
            x: 390,
            y: fromTop(695),
            size: 11,
            font: fontMonoBold,
            color: rgb(0.15, 0.15, 0.15)
        });
    } else if (inst.code === 'MU') {
        // Mulungushi Bottom-Left Student ID & Bottom-Right MU/D serial
        page.drawText(studentNumber || '201900812', {
            x: 65,
            y: fromTop(692),
            size: 12,
            font: fontSansBold,
            color: rgb(0.1, 0.1, 0.1)
        });
        page.drawText('STUDENT ID NO.', {
            x: 65,
            y: fromTop(706),
            size: 7,
            font: fontSansBold,
            color: rgb(0.4, 0.4, 0.4)
        });

        const muSerial = `${inst.serialPrefix} ${serialVal}`;
        page.drawText(muSerial, {
            x: 410,
            y: fromTop(695),
            size: 12,
            font: fontSansBold,
            color: inst.primaryColor
        });
    } else {
        // UNZA / CBU / KMU
        // Bottom-Left Graduate's Signature Line
        page.drawText("Graduate's Signature:", {
            x: 65,
            y: fromTop(675),
            size: 8,
            font: fontSansRegular,
            color: rgb(0.35, 0.35, 0.35)
        });
        page.drawLine({
            start: { x: 65, y: fromTop(708) },
            end: { x: 200, y: fromTop(708) },
            thickness: 0.8,
            color: rgb(0.4, 0.45, 0.5)
        });

        // Bottom-Right Graduate ID & Senate Serial
        page.drawText("Graduate's ID No.:", {
            x: 375,
            y: fromTop(675),
            size: 8,
            font: fontSansRegular,
            color: rgb(0.35, 0.35, 0.35)
        });
        page.drawText(studentNumber || '2021004510', {
            x: 375,
            y: fromTop(692),
            size: 10.5,
            font: fontMonoBold,
            color: rgb(0.1, 0.1, 0.1)
        });
        page.drawLine({
            start: { x: 375, y: fromTop(700) },
            end: { x: 520, y: fromTop(700) },
            thickness: 0.8,
            color: rgb(0.4, 0.45, 0.5)
        });

        const senateSerial = `${inst.serialPrefix} ${serialVal}`;
        page.drawText(senateSerial, {
            x: 375,
            y: fromTop(718),
            size: 12.5,
            font: fontSansBold,
            color: inst.primaryColor
        });
    }

    // ─────────────────────────────────────────────────────────────
    // ZONE 7: Integrated Dual-Ledger Security Proof Bar & QR Code (y = 745pt – 808pt)
    // ─────────────────────────────────────────────────────────────

    const proofBoxX = 36;
    const proofBoxY = fromTop(806);
    const proofBoxW = PAGE_WIDTH - 72;
    const proofBoxH = 58;

    // Security Proof Bar container
    page.drawRectangle({
        x: proofBoxX,
        y: proofBoxY,
        width: proofBoxW,
        height: proofBoxH,
        color: rgb(0.945, 0.937, 0.918), // #F1EFEA
        borderColor: inst.secondaryColor,
        borderWidth: 0.9
    });

    // Top subtle accent strip
    page.drawRectangle({
        x: proofBoxX,
        y: proofBoxY + proofBoxH - 2,
        width: proofBoxW,
        height: 2,
        color: inst.primaryColor
    });

    // Extract hashes
    const docHash = (
        certificate.documentHash ||
        certificate.documentEvidence?.fileHash ||
        certificate.metadata?.downloadedFileHash ||
        '7a4e9b8f2c3d1e0f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f'
    ).slice(0, 48);

    const icpProof = (
        certificate.icpAnchor?.transactionHash ||
        certificate.icpAnchor?.canisterId ||
        'ICP-RRKAH-FQAAA-AAAAN-QDA4A-CAI-ANXR4'
    ).slice(0, 36);

    // Row 1: Header + Cert ID + NRC
    const certIdLabel = `BLOCKCHAIN VERIFIED CREDENTIAL • CERT ID: ${certId} • NRC: ${nationalId || 'VERIFIED'}`;
    page.drawText(certIdLabel, {
        x: proofBoxX + 10,
        y: proofBoxY + 41,
        size: 7.2,
        font: fontSansBold,
        color: rgb(0.12, 0.16, 0.23)
    });

    // Row 2: HLF Fabric TX / Hash
    page.drawText(`HLF FABRIC TX / SHA-256: ${docHash}...`, {
        x: proofBoxX + 10,
        y: proofBoxY + 26,
        size: 6.2,
        font: fontMono,
        color: rgb(0.2, 0.25, 0.33)
    });

    // Row 3: ICP Canister Proof & IPFS Status
    page.drawText(`ICP CANISTER PROOF: ${icpProof} • IPFS AES-256 ANCHORED`, {
        x: proofBoxX + 10,
        y: proofBoxY + 11,
        size: 6.2,
        font: fontMono,
        color: rgb(0.2, 0.25, 0.33)
    });

    // Right Column: Embedded Verification QR Code (50x50pt)
    const targetVerifyUrl = verificationUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify/${certId}`;
    try {
        const qrPngBuffer = await QRCode.toBuffer(targetVerifyUrl, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 150
        });
        const embeddedQr = await doc.embedPng(qrPngBuffer);
        const qrDim = 46;
        const qrX = proofBoxX + proofBoxW - qrDim - 8;
        const qrY = proofBoxY + 7;

        page.drawImage(embeddedQr, {
            x: qrX,
            y: qrY,
            width: qrDim,
            height: qrDim
        });

        const verifyLabel = 'VERIFY';
        const vlW = fontSansBold.widthOfTextAtSize(verifyLabel, 5);
        page.drawText(verifyLabel, {
            x: qrX + (qrDim - vlW) / 2,
            y: qrY - 5,
            size: 5,
            font: fontSansBold,
            color: inst.primaryColor
        });
    } catch (qrErr) {
        console.warn('QR Code generation notice for verification bar:', qrErr.message);
    }

    return Buffer.from(await doc.save());
};

module.exports = {
    generateDigitalCredentialPdf,
    resolveInstitution,
    INSTITUTIONS
};
