const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
    certificateFile: {
        type: String,
        required: true
    },
    fileName: String,
    fileType: String,
    // Zambian document structured layout fields for submissions
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
    metadata: {
        studentName: String,
        issueDate: Date,
        graduationDate: Date,
        program: String,
        major: String,
        cgpa: Number,
        additionalInfo: mongoose.Schema.Types.Mixed
    },
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'rejected', 'issued'],
        default: 'submitted',
        index: true
    },
    reviewNote: {
        type: String,
        default: ''
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    issuedCertificateId: {
        type: String,
        index: true
    },
    issuedAt: Date
}, {
    timestamps: true
});

submissionSchema.index({ student: 1, createdAt: -1 });
submissionSchema.index({ status: 1, createdAt: -1 });
submissionSchema.index({ 'studentDetails.studentNumber': 1 });
submissionSchema.index({ 'issuerDetails.certificationNumber': 1 });
submissionSchema.index({ 'documentEvidence.fileHash': 1 });

module.exports = mongoose.model('Submission', submissionSchema);
