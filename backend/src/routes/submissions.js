const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Submission = require('../models/Submission');
const AuditLog = require('../models/AuditLog');
const { issueCertificateRecord } = require('../services/certificateIssuanceService');
const { extractCertificateDetails } = require('../services/certificateOcrService');

const router = express.Router();

const buildSubmissionOverview = (submissions) => {
    const sorted = [...submissions].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
    const timeline = sorted.map((submission) => ({
        id: submission._id,
        title: submission.courseName,
        status: submission.status,
        note: submission.reviewNote || '',
        issuedCertificateId: submission.issuedCertificateId || null,
        timestamp: submission.issuedAt || submission.reviewedAt || submission.updatedAt || submission.createdAt,
        metadata: {
            program: submission.metadata?.program || '',
            studentName: submission.metadata?.studentName || ''
        }
    }));

    const notifications = sorted.slice(0, 8).map((submission) => {
        let kind = 'info';
        let title = 'Submission update';
        let message = `${submission.courseName} is being processed.`;

        if (submission.status === 'submitted') {
            title = 'Submission received';
            message = `${submission.courseName} was submitted successfully and is waiting for admin review.`;
        } else if (submission.status === 'under_review') {
            title = 'Submission under review';
            message = `${submission.courseName} is currently being reviewed by an administrator.`;
        } else if (submission.status === 'rejected') {
            kind = 'warning';
            title = 'Submission rejected';
            message = submission.reviewNote
                ? `${submission.courseName} was rejected: ${submission.reviewNote}`
                : `${submission.courseName} was rejected and needs correction.`;
        } else if (submission.status === 'issued') {
            kind = 'success';
            title = 'Certificate ready';
            message = `${submission.courseName} has been issued and is ready to open or download.`;
        }

        return {
            id: submission._id,
            kind,
            title,
            message,
            createdAt: submission.issuedAt || submission.reviewedAt || submission.updatedAt || submission.createdAt,
            issuedCertificateId: submission.issuedCertificateId || null,
            status: submission.status
        };
    });

    return {
        counts: {
            total: submissions.length,
            submitted: submissions.filter((submission) => submission.status === 'submitted').length,
            underReview: submissions.filter((submission) => submission.status === 'under_review').length,
            rejected: submissions.filter((submission) => submission.status === 'rejected').length,
            issued: submissions.filter((submission) => submission.status === 'issued').length,
        },
        notifications,
        timeline,
    };
};

/**
 * POST /api/submissions/scan
 * Intelligent Document Processing (IDP): Extract structured certificate details from image/PDF
 */
router.post('/scan',
    auth,
    async (req, res) => {
        try {
            const { certificateFile, fileType } = req.body;
            if (!certificateFile) {
                return res.status(400).json({
                    success: false,
                    error: 'Please provide certificateFile (base64 string).'
                });
            }

            const extractedData = await extractCertificateDetails({
                fileBase64: certificateFile,
                mimeType: fileType || 'image/jpeg'
            });

            res.json({
                success: true,
                data: extractedData,
                message: 'Certificate details successfully extracted with AI.'
            });
        } catch (error) {
            console.error('Certificate scan endpoint error:', error);
            res.status(error.statusCode || 500).json({
                success: false,
                code: error.code || 'SCAN_FAILED',
                error: error.message || 'Failed to scan and extract certificate data.'
            });
        }
    }
);

router.post('/',
    auth,
    [
        body('certificateFile').notEmpty(),
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
        const hasOldStyle = req.body.courseName && req.body.metadata;
        const hasNewStyle = req.body.studentDetails && req.body.issuerDetails && req.body.academicRecord;

        if (!hasOldStyle && !hasNewStyle) {
            return res.status(400).json({
                success: false,
                error: 'Invalid submission payload. Must provide either (courseName and metadata) OR (issuerDetails, studentDetails, and academicRecord).'
            });
        }

        try {
            if (req.user.role !== 'student') {
                return res.status(403).json({
                    success: false,
                    error: 'Only student accounts can submit certificate requests.'
                });
            }

            const studentId = req.user.profile?.studentId;
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    error: 'Student profile is incomplete. Add your student ID first.'
                });
            }

            const resolvedCourseName = req.body.academicRecord?.program || req.body.courseName;
            const resolvedStudentName = req.body.studentDetails?.fullName || req.body.metadata?.studentName || req.user.profile?.fullName || '';

            const submission = await Submission.create({
                student: req.user._id,
                studentId,
                courseName: resolvedCourseName,
                certificateFile: req.body.certificateFile,
                fileName: req.body.fileName || null,
                fileType: req.body.fileType || null,
                issuerDetails: req.body.issuerDetails,
                studentDetails: req.body.studentDetails,
                academicRecord: req.body.academicRecord,
                documentEvidence: req.body.documentEvidence,
                metadata: {
                    ...req.body.metadata,
                    studentName: resolvedStudentName
                },
                status: 'submitted'
            });

            await AuditLog.create({
                actor: req.user._id,
                actorEmail: req.user.email,
                action: 'submission.create',
                target: submission._id.toString(),
                metadata: {
                    studentId,
                    courseName: submission.courseName
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(201).json({
                success: true,
                data: submission,
                message: 'Submission received. An admin will review it before blockchain issuance.'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

router.get('/mine', auth, async (req, res) => {
    try {
        const submissions = await Submission.find({ student: req.user._id })
            .sort({ createdAt: -1 });

        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/mine/overview', auth, async (req, res) => {
    try {
        const submissions = await Submission.find({ student: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                submissions,
                ...buildSubmissionOverview(submissions)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/pending', auth, admin, async (req, res) => {
    try {
        const submissions = await Submission.find({ status: { $in: ['submitted', 'under_review'] } })
            .sort({ createdAt: -1 })
            .populate('student', 'email profile.fullName profile.studentId');

        res.json({ success: true, data: submissions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.put('/:submissionId/review',
    auth,
    admin,
    [
        body('decision').isIn(['approve', 'reject']),
        body('note').optional().isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            // Rejection branch with atomic state transition
            if (req.body.decision === 'reject') {
                const submission = await Submission.findOneAndUpdate(
                    { _id: req.params.submissionId, status: { $in: ['submitted', 'under_review'] } },
                    { $set: { status: 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body.note || '' } },
                    { new: true }
                );

                if (!submission) {
                    const existing = await Submission.findById(req.params.submissionId);
                    if (!existing) return res.status(404).json({ success: false, error: 'Submission not found.' });
                    return res.status(409).json({ success: false, error: `Cannot reject: submission is already in '${existing.status}' state.` });
                }

                await AuditLog.create({
                    actor: req.user._id,
                    actorEmail: req.user.email,
                    action: 'submission.reject',
                    target: submission._id.toString(),
                    metadata: {
                        studentId: submission.studentId,
                        note: submission.reviewNote
                    },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });

                return res.json({
                    success: true,
                    data: submission,
                    message: 'Submission rejected.'
                });
            }

            // Approval branch: ATOMIC LOCK transition from 'submitted' to 'under_review'
            // Prevents concurrent requests from simultaneously reaching the blockchain issuance service
            const submission = await Submission.findOneAndUpdate(
                { _id: req.params.submissionId, status: 'submitted' },
                { $set: { status: 'under_review', reviewedBy: req.user._id, reviewedAt: new Date(), reviewNote: req.body.note || '' } },
                { new: true }
            ).populate('student');

            if (!submission) {
                const existing = await Submission.findById(req.params.submissionId);
                if (!existing) return res.status(404).json({ success: false, error: 'Submission not found.' });
                return res.status(409).json({ success: false, error: `Concurrent review conflict: submission is already in '${existing.status}' state.` });
            }

            const certificate = await issueCertificateRecord({
                studentId: submission.studentDetails?.studentNumber || submission.studentId,
                courseName: submission.academicRecord?.program || submission.courseName,
                metadata: submission.metadata,
                certificateFile: submission.certificateFile,
                fileName: submission.fileName,
                fileType: submission.fileType,
                issuedByUser: req.user,
                studentUserId: submission.student?._id || submission.student,
                requestMeta: {
                    source: 'submission-approval',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                },
                // Pass structured Zambian metadata
                issuerDetails: submission.issuerDetails,
                studentDetails: submission.studentDetails,
                academicRecord: submission.academicRecord,
                documentEvidence: submission.documentEvidence
            });

            submission.status = 'issued';
            submission.issuedCertificateId = certificate.certificateId;
            submission.issuedAt = new Date();
            await submission.save();

            await AuditLog.create({
                actor: req.user._id,
                actorEmail: req.user.email,
                action: 'submission.approve',
                target: submission._id.toString(),
                metadata: {
                    studentId: submission.studentId,
                    issuedCertificateId: certificate.certificateId,
                    note: submission.reviewNote
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                data: {
                    submission,
                    certificate
                },
                message: 'Submission approved and certificate issued to blockchain.'
            });
        } catch (error) {
            res.status(error.statusCode || 500).json({ success: false, error: error.message });
        }
    }
);

module.exports = router;
