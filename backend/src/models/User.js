const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: function() {
            return !this.googleId; // Password is required only if not using Google auth
        },
        minlength: 6
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    role: {
        type: String,
        enum: ['student', 'admin', 'verifier'],
        default: 'student'
    },
    profile: {
        fullName: String,
        studentId: {
            type: String,
            sparse: true,
            unique: true
        },
        department: String,
        organization: String,
        organizationType: {
            type: String,
            enum: ['government', 'university', 'company', 'professional', 'embassy'],
            sparse: true
        },

        reason: String,
        verificationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },

    },
    twoFactor: {
        secret: {
            type: String,
            default: null
        },
        enabled: {
            type: Boolean,
            default: false
        },
        verified: {
            type: Boolean,
            default: false
        },
        backupCodes: [
            {
                code: String,
                used: {
                    type: Boolean,
                    default: false
                }
            }
        ]
    },
    settings: {
        twoFactorEnabled: {
            type: Boolean,
            default: false
        },
        profileVisibility: {
            type: String,
            enum: ['public', 'private', 'contacts'],
            default: 'public'
        },
        certificateVisibility: {
            type: String,
            enum: ['public', 'private', 'verified'],
            default: 'public'
        },
        verificationNotifications: {
            type: Boolean,
            default: true
        },
        dataPrivacy: {
            analytics: {
                type: Boolean,
                default: true
            },
            marketing: {
                type: Boolean,
                default: false
            }
        },
        language: {
            type: String,
            default: 'English'
        },
        theme: {
            type: String,
            enum: ['institutional', 'light', 'cyber', 'dark', 'auto'],
            default: 'institutional'
        },
        textSize: {
            type: Number,
            default: 100,
            min: 70,
            max: 150
        },
        notificationSettings: {
            emailNotifications: {
                type: Boolean,
                default: true
            },
            certificateVerified: {
                type: Boolean,
                default: true
            },
            securityAlerts: {
                type: Boolean,
                default: true
            },
            marketingEmails: {
                type: Boolean,
                default: false
            }
        },
        blockchainSettings: {
            gasPrice: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            },
            confirmations: {
                type: Number,
                default: 6,
                min: 1,
                max: 12
            }
        }
    },
    loginHistory: [{
        date: {
            type: Date,
            default: Date.now
        },
        ip: String,
        userAgent: String,
        status: {
            type: String,
            default: 'Successful'
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
    next();
});

// Generate auth token
userSchema.methods.generateAuthToken = async function() {
    const user = this;
    const token = jwt.sign(
        { _id: user._id.toString(), role: user.role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
    );
    
    user.tokens = user.tokens.concat({ token });
    await user.save();
    
    return token;
};

// Find user by credentials
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('Invalid login credentials');
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid login credentials');
    }
    
    return user;
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    delete user.tokens;
    delete user.__v;
    return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
