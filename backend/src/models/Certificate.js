const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
    certificateId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    studentId: {
        type: String,
        required: true,
        index: true
    },
    courseName: {
        type: String,
        required: true
    },
    documentHash: {
        type: String,
        required: true
    },
    ipfsHash: {
        type: String,
        required: false // Made optional
    },
    // Zambian document structured layout fields
    issuerDetails: {
        institutionType: {
            type: String,
            enum: ['University', 'College / TEVETA', 'Secondary School']
        },
        institutionName: String,
        certificationNumber: String
    },
    studentDetails: {
        studentNumber: String,
        fullName: String,
        nationalId: String
    },
    academicRecord: {
        program: String,
        programSpecification: String,
        awardClassification: String,
        graduationDate: Date
    },
    documentEvidence: {
        fileHash: String,
        storageURI: String
    },
    bridge_status: {
        type: String,
        enum: ['pending', 'anchored', 'failed'],
        default: 'pending'
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    studentUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    isValid: {
        type: Boolean,
        default: true
    },
    transactionHash: {
        type: String,
        required: false // Made optional
    },
    // Enhanced encryption fields
    encryption: {
        // SHA-256 hash of the encrypted document
        encryptedDocumentHash: {
            type: String,
            required: true,
            index: true
        },
        // Encrypted AES key data
        encryptedAESKey: {
            ephemeralPublicKey: String,
            encrypted: String,
            iv: String,
            authTag: String,
            algorithm: {
                type: String,
                default: 'ECIES-secp256k1-AES256'
            }
        },
        // AES encryption metadata
        aesEncryption: {
            iv: String,
            authTag: String,
            algorithm: {
                type: String,
                default: 'AES-256-GCM'
            }
        },
        // Digital signature
        digitalSignature: {
            signature: String,
            recovery: Number,
            hash: String,
            algorithm: {
                type: String,
                default: 'ECDSA-secp256k1'
            }
        },
        // Issuer key information
        issuerKeys: {
            publicKey: {
                type: String,
                index: true
            },
            keyPairId: String
        },
        // Encryption metadata
        encryptionVersion: {
            type: String,
            default: '1.0.0'
        },
        encryptedAt: {
            type: Date,
            default: Date.now
        }
    },
    // Users authorized to decrypt this certificate
    authorizedViewers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        },
        publicKey: String,
        authorizedAt: {
            type: Date,
            default: Date.now
        },
        authorizedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    // Verification proof for blockchain
    verificationProof: {
        proofHash: String,
        algorithm: {
            type: String,
            default: 'SHA-256'
        }
    },
    metadata: {
        studentName: String,
        issueDate: {
            type: Date,
            default: Date.now
        },
        graduationDate: Date,
        program: String,
        major: String,
        cgpa: Number,
        originalFileName: String,
        originalFileType: String,
        certificateFile: String,
        downloadedFileHash: String,
        recognizedFileHashes: [String],
        encryptedCertificate: mongoose.Schema.Types.Mixed,
        additionalInfo: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes for faster queries
certificateSchema.index({ studentId: 1, isValid: 1 });
certificateSchema.index({ studentUser: 1, isValid: 1 });
certificateSchema.index({ 'metadata.issueDate': 1 });
certificateSchema.index({ 'encryption.encryptedDocumentHash': 1 });
certificateSchema.index({ 'encryption.issuerKeys.publicKey': 1 });
certificateSchema.index({ 'authorizedViewers.userId': 1 });
certificateSchema.index({ 'studentDetails.studentNumber': 1 });
certificateSchema.index({ 'issuerDetails.certificationNumber': 1 });
certificateSchema.index({ 'documentEvidence.fileHash': 1 });

// Virtual for checking if certificate is encrypted
certificateSchema.virtual('isEncrypted').get(function() {
    return !!(this.encryption && this.encryption.encryptedDocumentHash);
});

// Methods
certificateSchema.methods.toJSON = function() {
    const certificate = this.toObject();
    delete certificate.__v;
    return certificate;
};

// Method to add authorized viewer
certificateSchema.methods.addAuthorizedViewer = function(userId, publicKey, authorizedBy) {
    // Check if user is already authorized
    const existingAuth = this.authorizedViewers.find(
        viewer => viewer.userId.toString() === userId.toString()
    );
    
    if (!existingAuth) {
        this.authorizedViewers.push({
            userId,
            publicKey,
            authorizedBy
        });
    }
    
    return this.save();
};

// Method to remove authorized viewer
certificateSchema.methods.removeAuthorizedViewer = function(userId) {
    this.authorizedViewers = this.authorizedViewers.filter(
        viewer => viewer.userId.toString() !== userId.toString()
    );
    
    return this.save();
};

// Method to check if user is authorized to decrypt
certificateSchema.methods.isUserAuthorized = function(userId) {
    return this.authorizedViewers.some(
        viewer => viewer.userId.toString() === userId.toString()
    );
};

// Static methods
certificateSchema.statics.findByStudentId = function(studentId) {
    return this.find({
        isValid: true,
        $or: [
            { studentId },
            { 'studentDetails.studentNumber': studentId }
        ]
    }).sort({ 'metadata.issueDate': -1 });
};

certificateSchema.statics.findValidCertificate = function(certificateId) {
    return this.findOne({ certificateId, isValid: true });
};

// Static method to find certificates by encryption hash
certificateSchema.statics.findByEncryptionHash = function(hash) {
    return this.findOne({ 'encryption.encryptedDocumentHash': hash });
};

// Static method to find certificates by issuer public key
certificateSchema.statics.findByIssuerPublicKey = function(publicKey) {
    return this.find({ 'encryption.issuerKeys.publicKey': publicKey });
};

// Static method to find certificates user is authorized to view
certificateSchema.statics.findAuthorizedForUser = function(userId) {
    return this.find({ 
        'authorizedViewers.userId': userId,
        isValid: true 
    }).sort({ 'metadata.issueDate': -1 });
};

// Database Performance Indexes
certificateSchema.index({ documentHash: 1 });
certificateSchema.index({ 'studentDetails.studentNumber': 1 });
certificateSchema.index({ 'authorizedViewers.userId': 1 });
certificateSchema.index({ 'metadata.issueDate': -1 });

module.exports = mongoose.model('Certificate', certificateSchema);
