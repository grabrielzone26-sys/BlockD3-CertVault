const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const bcrypt = require('bcryptjs');

// Get current user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all users (admin only)
router.get('/', auth, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update user profile
router.put('/profile', 
    auth,
    [
        body('fullName').optional().trim(),
        body('email').optional().isEmail(),
        body('department').optional().trim(),
        body('studentId').optional().trim()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const updateData = {};
            if (req.body.fullName) updateData.fullName = req.body.fullName;
            if (req.body.email) updateData.email = req.body.email;
            if (req.body.department) updateData.department = req.body.department;
            if (req.body.studentId) updateData.studentId = req.body.studentId;

            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: updateData },
                { new: true }
            ).select('-password');

            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Update user settings
router.put('/settings',
    auth,
    [
        body('settings').isObject(),
        body('settings.profileVisibility').optional().isIn(['public', 'private', 'contacts']),
        body('settings.certificateVisibility').optional().isIn(['public', 'private', 'verified']),
        body('settings.verificationNotifications').optional().isBoolean(),
        body('settings.dataPrivacy').optional().isObject(),
        body('settings.language').optional(),
        body('settings.theme').optional().isIn(['institutional', 'light', 'cyber', 'dark', 'auto']),
        body('settings.textSize').optional().isInt({ min: 70, max: 150 }),
        body('settings.notificationSettings').optional().isObject(),
        body('settings.blockchainSettings').optional().isObject()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: { settings: { ...req.user.settings, ...req.body.settings } } },
                { new: true }
            ).select('-password');

            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Change password
router.put('/change-password',
    auth,
    [
        body('currentPassword').exists(),
        body('newPassword').isLength({ min: 6 }),
        body('confirmPassword').custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const user = await User.findById(req.user._id);
            const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
            
            if (!isMatch) {
                return res.status(400).json({ success: false, error: 'Current password is incorrect' });
            }

            user.password = req.body.newPassword;
            await user.save();

            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Toggle 2FA
router.put('/two-factor',
    auth,
    [
        body('enabled').isBoolean()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {
            const user = await User.findByIdAndUpdate(
                req.user._id,
                { $set: { 'settings.twoFactorEnabled': req.body.enabled } },
                { new: true }
            ).select('-password');

            res.json({ success: true, data: user });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Get login history
router.get('/login-history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('loginHistory');
        res.json({ success: true, data: user.loginHistory });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record login attempt
router.post('/login-history',
    auth,
    [
        body('ip').optional(),
        body('userAgent').optional(),
        body('status').optional()
    ],
    async (req, res) => {
        try {
            const user = await User.findByIdAndUpdate(
                req.user._id,
                {
                    $push: {
                        loginHistory: {
                            ip: req.body.ip,
                            userAgent: req.body.userAgent,
                            status: req.body.status
                        }
                    }
                },
                { new: true }
            ).select('loginHistory');

            res.json({ success: true, data: user.loginHistory });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

module.exports = router;
