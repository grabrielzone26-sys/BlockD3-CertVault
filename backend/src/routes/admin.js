const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { body, validationResult } = require('express-validator');

// Get admin dashboard stats
router.get('/stats', auth, admin, async (req, res) => {
    try {
        const stats = {
            totalCertificates: await Certificate.countDocuments(),
            totalStudents: await User.countDocuments({ role: 'student' }),
            totalVerifiers: await User.countDocuments({ role: 'verifier' }),
            recentCertificates: await Certificate.countDocuments({
                createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            })
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent activity
router.get('/recent-activity', auth, admin, async (req, res) => {
    try {
        const recentCertificates = await Certificate.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('issuedBy', 'profile.fullName');

        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password -tokens');

        const activity = {
            recentCertificates,
            recentUsers
        };

        res.json({ success: true, data: activity });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get pending verifier registrations
router.get('/pending-verifiers', auth, admin, async (req, res) => {
    try {
        const pendingVerifiers = await User.find({
            role: 'verifier',
            $or: [
                { 'profile.verificationStatus': 'pending' },
                { 'profile.verificationStatus': { $exists: false } },
                { 'profile.verificationStatus': null }
            ]
        }).select('-password -tokens').sort({ createdAt: -1 });

        res.json({ success: true, data: pendingVerifiers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all verifiers (admin only)
router.get('/verifiers', auth, admin, async (req, res) => {
    try {
        const verifiers = await User.find({ role: 'verifier' })
            .select('-password -tokens')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: verifiers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reset 2FA for any user (admin only)
router.post('/reset-2fa/:userId', auth, admin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.twoFactor = {
            secret: null,
            enabled: false,
            verified: false,
            backupCodes: []
        };
        if (!user.settings) user.settings = {};
        user.settings.twoFactorEnabled = false;

        await user.save();

        try {
            await AuditLog.create({
                actor: req.user._id,
                action: 'user.2fa.reset',
                target: user.email,
                metadata: {
                    userId: user._id.toString(),
                    email: user.email,
                    resetBy: req.user.email
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        } catch (logErr) {
            console.warn('Audit log notice:', logErr.message);
        }

        res.json({
            success: true,
            message: `Two-factor authentication has been disabled for ${user.email}.`,
            data: {
                userId: user._id,
                email: user.email,
                twoFactorEnabled: false
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Approve or reject verifier registration
router.post('/verifier-action/:userId',
    auth,
    admin,
    [
        body('action').isIn(['approve', 'reject', 'deny']),
        body('reason').optional().isString()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { userId } = req.params;
            const { action, reason } = req.body;
            const isApproved = action === 'approve';
            const normalizedStatus = isApproved ? 'approved' : 'rejected';

            // Find user - check for pending first, or fallback to any verifier user
            let user = await User.findOne({
                _id: userId,
                role: 'verifier',
                $or: [
                    { 'profile.verificationStatus': 'pending' },
                    { 'profile.verificationStatus': { $exists: false } },
                    { 'profile.verificationStatus': null }
                ]
            });

            if (!user) {
                user = await User.findOne({ _id: userId, role: 'verifier' });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Verifier user not found'
                });
            }

            user.profile = user.profile || {};
            user.profile.verificationStatus = normalizedStatus;
            if (reason) {
                user.profile.verificationNote = reason;
            }

            await user.save();

            // Record in audit log
            try {
                await AuditLog.create({
                    actor: req.user._id,
                    action: `verifier.${isApproved ? 'approve' : 'reject'}`,
                    target: user.email,
                    metadata: {
                        userId: user._id.toString(),
                        email: user.email,
                        fullName: user.profile?.fullName || user.username,
                        organization: user.profile?.organization,
                        action: normalizedStatus,
                        reason: reason || null
                    },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } catch (logError) {
                console.warn('Verifier audit log notice:', logError.message);
            }

            res.json({
                success: true,
                message: `Verifier registration ${normalizedStatus} successfully`,
                data: { user }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Get audit logs (admin only)
router.get('/audit-logs', auth, admin, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        const filter = {};
        if (req.query.action === 'blockchain') {
            filter.action = { $in: ['fabric.certificate.issue', 'fabric.certificate.revoke', 'fabric.certificate.verify', 'fabric.certificate.batch-verify', 'fabric.certificate.batch-download'] };
        } else if (req.query.action) {
            filter.action = req.query.action;
        }
        const logs = await AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
