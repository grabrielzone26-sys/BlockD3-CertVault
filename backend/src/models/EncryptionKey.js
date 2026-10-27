const mongoose = require('mongoose');

const encryptionKeySchema = new mongoose.Schema({
    keyPairId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    publicKey: {
        type: String,
        required: true,
        index: true
    },
    encryptedPrivateKey: {
        encrypted: {
            type: String,
            required: true
        },
        iv: {
            type: String,
            required: true
        },
        authTag: {
            type: String,
            required: true
        },
        algorithm: {
            type: String,
            default: 'AES-256-GCM'
        },
        keyDerivation: {
            type: String,
            default: 'PBKDF2-SHA256'
        },
        iterations: {
            type: Number,
            default: 100000
        }
    },
    salt: {
        type: String,
        required: true
    },
    keyType: {
        type: String,
        enum: ['ECDSA-secp256k1'],
        default: 'ECDSA-secp256k1'
    },
    purpose: {
        type: String,
        enum: ['certificate-encryption', 'signing', 'general'],
        default: 'certificate-encryption'
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    expiresAt: {
        type: Date,
        index: true
    },
    lastUsed: {
        type: Date
    },
    usageCount: {
        type: Number,
        default: 0
    },
    // Key rotation information
    rotationInfo: {
        previousKeyId: String,
        rotationReason: {
            type: String,
            enum: ['scheduled', 'compromised', 'user-requested', 'policy']
        },
        rotatedAt: Date,
        rotatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    // Key backup information
    backupInfo: {
        hasBackup: {
            type: Boolean,
            default: false
        },
        backupId: String,
        backupCreatedAt: Date,
        backupLocation: String // encrypted reference to backup location
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
encryptionKeySchema.index({ userId: 1, isActive: 1 });
encryptionKeySchema.index({ userId: 1, purpose: 1, isActive: 1 });
encryptionKeySchema.index({ expiresAt: 1 }, { sparse: true });
encryptionKeySchema.index({ 'rotationInfo.rotatedAt': 1 });

// Virtual to check if key is expired
encryptionKeySchema.virtual('isExpired').get(function() {
    return this.expiresAt && this.expiresAt < new Date();
});

// Virtual to check if key needs rotation (based on usage or age)
encryptionKeySchema.virtual('needsRotation').get(function() {
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    const maxUsage = 10000; // Maximum usage count
    
    const ageBasedRotation = (Date.now() - this.createdAt.getTime()) > maxAge;
    const usageBasedRotation = this.usageCount > maxUsage;
    
    return ageBasedRotation || usageBasedRotation || this.isExpired;
});

// Method to increment usage count
encryptionKeySchema.methods.incrementUsage = function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    return this.save();
};

// Method to deactivate key
encryptionKeySchema.methods.deactivate = function(reason, deactivatedBy) {
    this.isActive = false;
    this.rotationInfo = {
        ...this.rotationInfo,
        rotationReason: reason,
        rotatedAt: new Date(),
        rotatedBy: deactivatedBy
    };
    return this.save();
};

// Method to create backup reference
encryptionKeySchema.methods.setBackupInfo = function(backupId, backupLocation) {
    this.backupInfo = {
        hasBackup: true,
        backupId,
        backupCreatedAt: new Date(),
        backupLocation
    };
    return this.save();
};

// Static method to find active keys for user
encryptionKeySchema.statics.findActiveForUser = function(userId, purpose = null) {
    const query = { userId, isActive: true };
    if (purpose) {
        query.purpose = purpose;
    }
    return this.find(query).sort({ createdAt: -1 });
};

// Static method to find keys that need rotation
encryptionKeySchema.statics.findKeysNeedingRotation = function() {
    const maxAge = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)); // 1 year ago
    const maxUsage = 10000;
    
    return this.find({
        isActive: true,
        $or: [
            { createdAt: { $lt: maxAge } },
            { usageCount: { $gt: maxUsage } },
            { expiresAt: { $lt: new Date() } }
        ]
    });
};

// Static method to find user's primary encryption key
encryptionKeySchema.statics.findPrimaryForUser = function(userId) {
    return this.findOne({
        userId,
        purpose: 'certificate-encryption',
        isActive: true
    }).sort({ createdAt: -1 });
};

// Static method to cleanup expired keys
encryptionKeySchema.statics.cleanupExpiredKeys = function() {
    return this.updateMany(
        {
            expiresAt: { $lt: new Date() },
            isActive: true
        },
        {
            $set: {
                isActive: false,
                'rotationInfo.rotationReason': 'expired',
                'rotationInfo.rotatedAt': new Date()
            }
        }
    );
};

module.exports = mongoose.model('EncryptionKey', encryptionKeySchema);
