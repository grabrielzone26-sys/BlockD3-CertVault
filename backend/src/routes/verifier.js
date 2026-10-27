const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AuditLog = require('../models/AuditLog');
const Certificate = require('../models/Certificate');

const HISTORY_ACTIONS = ['fabric.certificate.verify', 'fabric.certificate.batch-verify'];

router.get('/history', auth, async (req, res) => {
    try {
        const {
            status,
            type,
            query,
            startDate,
            endDate,
            limit = 100
        } = req.query;

        const logs = await AuditLog.find({
            actor: req.user._id,
            action: { $in: HISTORY_ACTIONS }
        })
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        const directCertificateIds = logs
            .filter((log) => log.action === 'fabric.certificate.verify' && log.target)
            .map((log) => log.target);

        const certificates = await Certificate.find({
            certificateId: { $in: directCertificateIds }
        }).select('certificateId studentId courseName metadata studentDetails academicRecord issuerDetails');

        const certificateMap = new Map(
            certificates.map((certificate) => [certificate.certificateId, certificate])
        );

        let history = logs.map((log) => {
            if (log.action === 'fabric.certificate.batch-verify') {
                return {
                    id: log._id,
                    type: 'batch',
                    certificateId: null,
                    studentName: `${log.metadata?.valid || 0} valid / ${log.metadata?.invalid || 0} invalid`,
                    courseName: `${log.metadata?.total || 0} certificates processed`,
                    status: 'batch',
                    timestamp: log.createdAt,
                    summary: log.metadata || {}
                };
            }

            const certificate = certificateMap.get(log.target);
            return {
                id: log._id,
                type: 'single',
                certificateId: log.target,
                studentName: certificate?.studentDetails?.fullName || certificate?.metadata?.studentName || certificate?.studentId || 'Unknown student',
                courseName: certificate?.academicRecord?.program || certificate?.courseName || 'Unknown course',
                status: log.metadata?.isValid ? 'success' : 'failed',
                timestamp: log.createdAt,
                summary: log.metadata || {}
            };
        });

        history = history.filter((entry) => {
            if (status && status !== 'all') {
                const normalizedStatus = status === 'valid' ? 'success' : status === 'invalid' ? 'failed' : status;
                if (entry.status !== normalizedStatus) {
                    return false;
                }
            }

            if (type && type !== 'all' && entry.type !== type) {
                return false;
            }

            if (query) {
                const haystack = `${entry.certificateId || ''} ${entry.studentName || ''} ${entry.courseName || ''}`.toLowerCase();
                if (!haystack.includes(String(query).toLowerCase())) {
                    return false;
                }
            }

            if (startDate && new Date(entry.timestamp) < new Date(startDate)) {
                return false;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (new Date(entry.timestamp) > end) {
                    return false;
                }
            }

            return true;
        });

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/stats', auth, async (req, res) => {
    try {
        const logs = await AuditLog.find({
            actor: req.user._id,
            action: { $in: HISTORY_ACTIONS }
        }).select('action metadata');

        const stats = logs.reduce((accumulator, log) => {
            if (log.action === 'fabric.certificate.batch-verify') {
                accumulator.totalVerifications += Number(log.metadata?.total || 0);
                accumulator.successfulVerifications += Number(log.metadata?.valid || 0);
                accumulator.failedVerifications += Number(log.metadata?.invalid || 0) + Number(log.metadata?.failed || 0);
                return accumulator;
            }

            accumulator.totalVerifications += 1;
            if (log.metadata?.isValid) {
                accumulator.successfulVerifications += 1;
            } else {
                accumulator.failedVerifications += 1;
            }
            return accumulator;
        }, {
            totalVerifications: 0,
            successfulVerifications: 0,
            failedVerifications: 0
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
