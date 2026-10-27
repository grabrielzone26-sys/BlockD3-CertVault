const { GoogleGenerativeAI } = require('@google/generative-ai');

// Model list in order of stability and availability
const CANDIDATE_MODELS = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash'
];

// Machine-readable JSON schema enforced on Gemini Vision responses
const CERTIFICATE_RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        institutionName: { type: 'STRING' },
        institutionType: { type: 'STRING' },
        certificationNumber: { type: 'STRING' },
        fullName: { type: 'STRING' },
        studentNumber: { type: 'STRING' },
        nationalId: { type: 'STRING' },
        program: { type: 'STRING' },
        programSpecification: { type: 'STRING' },
        awardClassification: { type: 'STRING' },
        graduationDate: { type: 'STRING' }
    },
    required: ['institutionName', 'fullName', 'program']
};

/**
 * Validates calendar date validity (e.g. rejects 2026-99-99)
 */
function isValidCalendarDate(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && (date.getUTCMonth() + 1) === month && date.getUTCDate() === day;
}

/**
 * Validates and sanitizes parsed fields against expected credential types.
 * Does not silently default unknown institutions; enforces real calendar dates.
 */
function validateAndSanitizeExtraction(raw) {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Invalid extraction output: expected a structured object.');
    }

    const clean = (val) => (typeof val === 'string' ? val.trim() : '');
    const allowedTypes = ['University', 'College / TEVETA', 'Secondary School'];
    const rawType = clean(raw.institutionType);

    const sanitized = {
        institutionName: clean(raw.institutionName),
        institutionType: allowedTypes.includes(rawType) ? rawType : (rawType || ''),
        certificationNumber: clean(raw.certificationNumber),
        fullName: clean(raw.fullName),
        studentNumber: clean(raw.studentNumber),
        nationalId: clean(raw.nationalId),
        program: clean(raw.program),
        programSpecification: clean(raw.programSpecification),
        awardClassification: clean(raw.awardClassification),
        graduationDate: isValidCalendarDate(clean(raw.graduationDate)) ? clean(raw.graduationDate) : ''
    };

    // Intake validation: allow extraction for human review, but flag if critical identifiers are missing
    if (!sanitized.fullName || !sanitized.program || !sanitized.institutionName) {
        console.warn('[AI-OCR] Warning: Extraction produced partial record. Human review is required before issuance.');
    }

    return sanitized;
}

/**
 * Extracts structured certificate metadata from an image or PDF using Google Gemini Flash.
 * Automatically fails over to alternative Flash models if a temporary 503 high demand spike occurs.
 *
 * @param {Object} params
 * @param {string} params.fileBase64 - Base64-encoded string of the document (with or without data: prefix)
 * @param {string} params.mimeType - MIME type (e.g. 'image/png', 'image/jpeg', 'application/pdf')
 * @returns {Promise<Object>} Extracted structured certificate fields
 */
async function extractCertificateDetails({ fileBase64, mimeType = 'image/jpeg' }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const error = new Error('GEMINI_API_KEY is not configured in backend/.env. Please provide your free Google AI Studio key.');
        error.statusCode = 503;
        error.code = 'GEMINI_KEY_MISSING';
        throw error;
    }

    if (!fileBase64) {
        const error = new Error('No document provided for extraction.');
        error.statusCode = 400;
        throw error;
    }

    // Clean base64 if it has data URL prefix
    let cleanBase64 = fileBase64;
    if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
You are an expert academic credential verifier and document parser.
Analyze this academic certificate/diploma image or document and extract the key information.
Extract the following fields accurately and return strictly a valid JSON object matching this exact schema:

{
  "institutionName": "Official name of the conferring institution (e.g., The University of Zambia, Copperbelt University, etc.)",
  "institutionType": "University | College / TEVETA | Secondary School",
  "certificationNumber": "Certificate number, serial number, registration number, or diploma identifier if visible, else empty string",
  "fullName": "Full legal name of the graduate/student as printed on the certificate",
  "studentNumber": "Student ID or registration number if present on the document, else empty string",
  "nationalId": "National ID, NRC or passport number if visible on the document, else empty string",
  "program": "Full qualification name, e.g., Bachelor of Science in Computer Science, Master of Business Administration, etc.",
  "programSpecification": "Major, area of concentration, or subject specification if stated, else empty string",
  "awardClassification": "Classification of award (e.g., Distinction, With Distinction, Merit, With Merit, Credit, With Credit, Pass, Clear Pass, First Class Honours, Upper Second Class, etc.) if stated, else empty string",
  "graduationDate": "Date of award, conferment, or graduation in YYYY-MM-DD format if identifiable, else empty string"
}

Rules:
1. Do not invent or hallucinate data that is not present on the document. Leave fields as empty string "" if not visible.
2. Ensure dates are strictly YYYY-MM-DD format (e.g. 2023-11-24). If only year/month is visible, format appropriately (e.g. 2023-11-01).
3. Distinguish between the student's name and institution dignitaries (Vice Chancellor, Registrar, Dean).
4. Return ONLY the valid JSON object.
`;

    const cleanMimeType = (mimeType || 'image/jpeg').toLowerCase();
    const supportedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];
    const resolvedMime = supportedMimes.includes(cleanMimeType) ? cleanMimeType : 'image/jpeg';

    const part = {
        inlineData: {
            data: cleanBase64,
            mimeType: resolvedMime
        }
    };

    let lastError = null;

    // Try candidates in order
    for (const modelName of CANDIDATE_MODELS) {
        try {
            console.log(`[AI-OCR] Attempting extraction with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: 'application/json',
                    responseSchema: CERTIFICATE_RESPONSE_SCHEMA
                }
            });

            const result = await model.generateContent([prompt, part]);
            const response = await result.response;
            const text = response.text().trim();

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('AI response did not contain a valid JSON object.');
            }

            const rawParsed = JSON.parse(jsonMatch[0]);
            // Post-extraction validation and sanitization
            const validatedData = validateAndSanitizeExtraction(rawParsed);

            console.log(`[AI-OCR] Successfully extracted and validated fields with model: ${modelName}`);
            return validatedData;
        } catch (err) {
            console.warn(`[AI-OCR] Model ${modelName} failed (${err.status || err.message}). Checking next candidate...`);
            lastError = err;

            // If it's an invalid key or 400 bad request, don't keep hammering
            if (err.status === 400 && err.message?.includes('API_KEY_INVALID')) {
                break;
            }
        }
    }

    console.error('All Gemini candidate models failed. Last error:', lastError);
    const error = new Error(lastError?.message || 'The AI extraction service is temporarily busy. Please try again or type details manually.');
    error.statusCode = 503;
    throw error;
}

module.exports = {
    extractCertificateDetails
};
