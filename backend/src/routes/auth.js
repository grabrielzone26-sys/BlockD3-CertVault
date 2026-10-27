const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Public signup route for students and verifiers
router.post('/signup', 
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('role').isIn(['student', 'verifier']),
        body('profile.fullName').if(body('role').equals('verifier')).notEmpty(),
        body('profile.organization').if(body('role').equals('verifier')).notEmpty(),
        body('profile.organizationType').if(body('role').equals('verifier')).isIn(['government', 'university', 'company', 'professional', 'embassy']),
        body('profile.reason').if(body('role').equals('verifier')).notEmpty()
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

            // Check if user already exists
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already registered'
                });
            }

            // Compute a fallback username if not provided
            const computedUsername = req.body.username || 
                (req.body.profile?.fullName ? req.body.profile.fullName.trim().replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : null) || 
                req.body.email.split('@')[0];

            // Create user object
            const user = new User({
                username: computedUsername,
                email: req.body.email,
                password: req.body.password,
                role: req.body.role,
                profile: req.body.profile
            });

            await user.save();

            res.status(201).json({
                success: true,
                message: req.body.role === 'verifier' 
                    ? 'Registration submitted successfully. Please wait for admin approval.'
                    : 'Account created successfully.',
                data: { user }
            });
        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);


// Register new user (admin only can create new users)
router.post('/register',
    auth,
    admin,
    [
        body('username').trim().isLength({ min: 3 }),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('role').isIn(['student', 'admin', 'verifier']),
        body('profile').isObject()
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

            // Check if user already exists
            const existingUser = await User.findOne({
                $or: [
                    { email: req.body.email },
                    { username: req.body.username }
                ]
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'User already exists'
                });
            }

            const user = new User({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                role: req.body.role,
                profile: req.body.profile
            });

            await user.save();
            const token = await user.generateAuthToken();

            res.status(201).json({
                success: true,
                data: {
                    user,
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Login user
router.post('/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').exists()
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

            const user = await User.findByCredentials(req.body.email, req.body.password);
            
            // Check if 2FA is enabled
            if (user.twoFactor && user.twoFactor.enabled && user.twoFactor.verified) {
                // Record login attempt without completing it
                user.loginHistory.push({
                    date: new Date(),
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    status: '2FA Required'
                });
                await user.save();
                
                // Return response indicating 2FA is required
                return res.json({
                    success: true,
                    requireTwoFactor: true,
                    userId: user._id,
                    email: user.email,
                    message: 'Two-factor authentication code required'
                });
            }
            
            // If 2FA is not enabled, proceed with normal login
            const token = await user.generateAuthToken();

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
                data: {
                    user,
                    token
                }
            });
        } catch (error) {
            res.status(401).json({
                success: false,
                error: 'Invalid login credentials'
            });
        }
    }
);

// Get current user profile
router.get('/profile', auth, async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update user profile
router.patch('/profile',
    auth,
    [
        body('profile').isObject(),
        body('email').optional().isEmail().normalizeEmail(),
        body('username').optional().trim().isLength({ min: 3 })
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

            const updates = Object.keys(req.body);
            const allowedUpdates = ['username', 'email', 'password', 'profile'];
            const isValidOperation = updates.every(update => 
                allowedUpdates.includes(update)
            );

            if (!isValidOperation) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid updates'
                });
            }

            updates.forEach(update => {
                req.user[update] = req.body[update];
            });

            await req.user.save();

            res.json({
                success: true,
                data: req.user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// Logout user
router.post('/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter(token => 
            token.token !== req.token
        );
        await req.user.save();

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Logout from all devices
router.post('/logout-all', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/google-login', async (req, res) => {
    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, error: 'Token is required' });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({ success: false, error: 'Google OAuth is not configured on this server.' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const fullName = payload.name;

        let user = await User.findOne({ email });
        if (!user) {
            // Create new user with Google info
            user = new User({
                email,
                password: null,
                role: 'student', // default role, or you can customize
                profile: {
                    fullName,
                },
                googleId: payload.sub,
            });
            await user.save();
        }

        const authToken = await user.generateAuthToken();

        res.json({
            success: true,
            data: {
                user,
                token: authToken,
            },
        });
    } catch (error) {
        res.status(401).json({ success: false, error: 'Invalid Google token' });
    }
});

module.exports = router;
