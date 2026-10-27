const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

/**
 * @route   POST /api/2fa/setup
 * @desc    Generate 2FA secret and QR code
 * @access  Private
 */
router.post('/setup', auth, async (req, res) => {
    try {
        // Generate a secret key
        const secret = speakeasy.generateSecret({
            name: `BlockD3 CertVault:${req.user.email}`
        });

        // Generate QR code for the secret
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            const code = speakeasy.generateSecret({ length: 10 }).base32.substring(0, 10);
            backupCodes.push({
                code: code,
                used: false
            });
        }

        // Atomically update user document to avoid VersionError race conditions
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'twoFactor.secret': secret.base32,
                'twoFactor.verified': false,
                'twoFactor.backupCodes': backupCodes
            }
        });

        // Send response with QR code data URL and secret
        res.json({
            success: true,
            message: 'Two-factor authentication setup initiated',
            data: {
                qrCode: qrCodeUrl,
                secret: secret.base32,
                backupCodes: backupCodes.map(code => code.code)
            }
        });
    } catch (error) {
        console.error('2FA Setup Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error setting up two-factor authentication',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/2fa/verify
 * @desc    Verify and enable 2FA
 * @access  Private
 */
router.post('/verify', auth, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Verification token is required'
            });
        }

        const cleanToken = String(token).replace(/\s+/g, '').trim();

        // Fetch fresh user from database to ensure latest secret is read
        const user = await User.findById(req.user._id);

        if (!user || !user.twoFactor || !user.twoFactor.secret) {
            return res.status(400).json({
                success: false,
                message: '2FA setup has not been initiated'
            });
        }

        // Verify the token against stored secret with window: 2 to allow clock drift
        const verified = speakeasy.totp.verify({
            secret: user.twoFactor.secret,
            encoding: 'base32',
            token: cleanToken,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Enable 2FA for the user atomically
        await User.findByIdAndUpdate(user._id, {
            $set: {
                'twoFactor.enabled': true,
                'twoFactor.verified': true,
                'settings.twoFactorEnabled': true
            }
        });

        res.json({
            success: true,
            message: 'Two-factor authentication has been enabled'
        });
    } catch (error) {
        console.error('2FA Verification Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying two-factor authentication',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/2fa/disable
 * @desc    Disable 2FA
 * @access  Private
 */
router.post('/disable', auth, async (req, res) => {
    try {
        const { token, password } = req.body;

        // Verify user's password for security
        const isMatch = await bcrypt.compare(password, req.user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Incorrect password'
            });
        }

        // If 2FA is enabled, verify token
        if (req.user.twoFactor.enabled) {
            // Check if it's a backup code
            const backupCodeIndex = req.user.twoFactor.backupCodes.findIndex(
                bc => bc.code === token && !bc.used
            );

            let verified = false;
            
            if (backupCodeIndex >= 0) {
                verified = true;
            } else {
                // Verify TOTP
                verified = speakeasy.totp.verify({
                    secret: req.user.twoFactor.secret,
                    encoding: 'base32',
                    token: token,
                    window: 1
                });
            }

            if (!verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification code'
                });
            }
        }

        // Disable 2FA
        await User.findByIdAndUpdate(req.user._id, {
            $set: {
                'twoFactor.enabled': false,
                'twoFactor.verified': false,
                'twoFactor.secret': null,
                'twoFactor.backupCodes': [],
                'settings.twoFactorEnabled': false
            }
        });

        res.json({
            success: true,
            message: 'Two-factor authentication has been disabled'
        });
    } catch (error) {
        console.error('2FA Disable Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error disabling two-factor authentication',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/2fa/validate
 * @desc    Validate 2FA token during login
 * @access  Public
 */
router.post('/validate', async (req, res) => {
    try {
        const { email, userId, token, isBackupCode } = req.body;
        const identifier = email || userId;
        
        if (!identifier || !token) {
            return res.status(400).json({
                success: false,
                message: 'Email or User ID and verification token are required'
            });
        }

        let user = null;
        if (userId) {
            user = await User.findById(userId);
        }
        if (!user && identifier) {
            // Check if identifier is an ObjectId
            if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
                user = await User.findById(identifier);
            }
            if (!user) {
                user = await User.findOne({ email: identifier });
            }
        }
        
        if (!user || !user.twoFactor || !user.twoFactor.enabled) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request or user does not have 2FA enabled'
            });
        }

        let verified = false;
        
        if (isBackupCode) {
            // Check if it's a valid backup code
            const backupCodeIndex = user.twoFactor.backupCodes.findIndex(
                bc => bc.code === token && !bc.used
            );

            if (backupCodeIndex >= 0) {
                // Mark backup code as used
                user.twoFactor.backupCodes[backupCodeIndex].used = true;
                await user.save();
                verified = true;
            }
        } else {
            // Verify TOTP
            const cleanToken = String(token).replace(/\s+/g, '').trim();
            verified = speakeasy.totp.verify({
                secret: user.twoFactor.secret,
                encoding: 'base32',
                token: cleanToken,
                window: 2
            });
        }

        if (!verified) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Generate authentication token
        const authToken = await user.generateAuthToken();

        // Update login history
        user.loginHistory.push({
            date: new Date(),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            status: 'Successful'
        });

        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            user: user,
            token: authToken,
            data: {
                user: user,
                token: authToken
            }
        });
    } catch (error) {
        console.error('2FA Validation Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating two-factor authentication',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/2fa/status
 * @desc    Check 2FA status
 * @access  Private
 */
router.get('/status', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            twoFactorEnabled: req.user.twoFactor.enabled,
            twoFactorVerified: req.user.twoFactor.verified
        });
    } catch (error) {
        console.error('2FA Status Error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking two-factor authentication status',
            error: error.message
        });
    }
});

module.exports = router;
