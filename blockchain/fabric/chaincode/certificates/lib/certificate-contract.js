'use strict';

const { Contract } = require('fabric-contract-api');

class CertificateContract extends Contract {
  getTransactionTimestamp(ctx) {
    const timestamp = ctx.stub.getTxTimestamp();
    const seconds = Number(timestamp.seconds && typeof timestamp.seconds.toNumber === 'function'
      ? timestamp.seconds.toNumber()
      : timestamp.seconds || 0);
    const nanos = Number(timestamp.nanos || 0);

    return new Date((seconds * 1000) + Math.floor(nanos / 1000000)).toISOString();
  }

  async IssueCertificate(ctx, payloadJson) {
    const payload = JSON.parse(payloadJson);
    
    // Support new payload structure as well as legacy parameters
    const certificateId = payload.id || payload.certificateId || (payload.issuerDetails && payload.issuerDetails.certificationNumber);
    const fileHash = payload.fileHash || payload.documentHash || (payload.documentEvidence && payload.documentEvidence.fileHash);

    if (!certificateId || !fileHash) {
      throw new Error('certificate identifier (id/certificateId/certificationNumber) and fileHash/documentHash are required');
    }

    const exists = await this.CertificateExists(ctx, certificateId);
    if (exists) {
      throw new Error(`Certificate ${certificateId} already exists`);
    }

    const issuedAt = this.getTransactionTimestamp(ctx);

    // Dynamic resolution of new Zambian document layout fields
    const institutionType = payload.institutionType || (payload.issuerDetails && payload.issuerDetails.institutionType) || '';
    const institutionName = payload.institutionName || (payload.issuerDetails && payload.issuerDetails.institutionName) || '';
    const studentNumber = payload.studentNumber || payload.studentId || (payload.studentDetails && payload.studentDetails.studentNumber) || '';
    const fullName = payload.fullName || payload.studentName || (payload.studentDetails && payload.studentDetails.fullName) || '';
    const nationalId = payload.nationalId || (payload.studentDetails && payload.studentDetails.nationalId) || '';
    const program = payload.program || payload.courseName || (payload.academicRecord && payload.academicRecord.program) || '';
    const programSpecification = payload.programSpecification || payload.major || (payload.academicRecord && payload.academicRecord.programSpecification) || '';
    const awardClassification = payload.awardClassification || payload.cgpa || (payload.academicRecord && payload.academicRecord.awardClassification) || '';
    const graduationDate = payload.graduationDate || (payload.academicRecord && payload.academicRecord.graduationDate) || '';
    const ipfsCid = payload.ipfsCid || payload.ipfsHash || (payload.documentEvidence && payload.documentEvidence.storageURI) || '';

    const certificate = {
      id: certificateId,
      certificateId, // legacy support
      institutionType,
      institutionName,
      studentNumber,
      studentId: studentNumber, // legacy support
      fullName,
      studentName: fullName, // legacy support
      nationalId,
      program,
      courseName: program, // legacy support
      programSpecification,
      awardClassification,
      graduationDate,
      fileHash,
      documentHash: fileHash, // legacy support
      ipfsCid,
      metadata: payload.metadata || {},
      issuerMspId: ctx.clientIdentity.getMSPID(),
      issuerId: ctx.clientIdentity.getID(),
      issuedAt,
      isValid: true,
      revokedAt: null,
      revokeReason: null,
      docType: 'certificate',
      timestamp: ctx.stub.getTxTimestamp()
    };

    await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(certificate)));
    await ctx.stub.setEvent(
      'CertificateIssued',
      Buffer.from(
        JSON.stringify({
          certificateId,
          documentHash: fileHash,
          issuedAt: certificate.issuedAt,
          txId: ctx.stub.getTxID(),
        }),
      ),
    );
    return JSON.stringify(certificate);
  }

  async GetCertificate(ctx, certificateId) {
    const certificateBytes = await ctx.stub.getState(certificateId);
    if (!certificateBytes || certificateBytes.length === 0) {
      throw new Error(`Certificate ${certificateId} does not exist`);
    }

    return certificateBytes.toString();
  }

  async VerifyCertificate(ctx, certificateId, documentHash) {
    const certificateBytes = await ctx.stub.getState(certificateId);
    if (!certificateBytes || certificateBytes.length === 0) {
      return JSON.stringify({
        exists: false,
        isValid: false,
        matchesHash: false,
        certificate: null,
      });
    }

    const certificate = JSON.parse(certificateBytes.toString());
    const matchesHash = documentHash ? (certificate.fileHash === documentHash || certificate.documentHash === documentHash) : true;

    return JSON.stringify({
      exists: true,
      isValid: Boolean(certificate.isValid) && matchesHash,
      matchesHash,
      certificate: {
        id: certificate.id || certificate.certificateId,
        certificateId: certificate.certificateId,
        studentId: certificate.studentId,
        courseName: certificate.courseName,
        institutionType: certificate.institutionType,
        institutionName: certificate.institutionName,
        studentNumber: certificate.studentNumber,
        fullName: certificate.fullName,
        nationalId: certificate.nationalId,
        program: certificate.program,
        programSpecification: certificate.programSpecification,
        awardClassification: certificate.awardClassification,
        graduationDate: certificate.graduationDate,
        fileHash: certificate.fileHash || certificate.documentHash,
        issuedAt: certificate.issuedAt,
        revokedAt: certificate.revokedAt,
        ipfsCid: certificate.ipfsCid,
        issuerMspId: certificate.issuerMspId,
      },
    });
  }

  async RevokeCertificate(ctx, certificateId, reason) {
    const certificateBytes = await ctx.stub.getState(certificateId);
    if (!certificateBytes || certificateBytes.length === 0) {
      throw new Error(`Certificate ${certificateId} does not exist`);
    }

    const certificate = JSON.parse(certificateBytes.toString());
    if (!certificate.isValid) {
      throw new Error(`Certificate ${certificateId} is already revoked`);
    }

    certificate.isValid = false;
    certificate.revokedAt = this.getTransactionTimestamp(ctx);
    certificate.revokeReason = reason || '';

    await ctx.stub.putState(certificateId, Buffer.from(JSON.stringify(certificate)));
    return JSON.stringify(certificate);
  }

  async CertificateExists(ctx, certificateId) {
    const certificateBytes = await ctx.stub.getState(certificateId);
    return Boolean(certificateBytes && certificateBytes.length > 0);
  }
}

module.exports = CertificateContract;
