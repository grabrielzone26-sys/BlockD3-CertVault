const {
  getNetworkInfo,
  issueCertificate,
  verifyCertificate,
  revokeCertificate,
} = require('./fabricClient');

class FabricCertificateService {
  constructor() {
    this.channelName = process.env.FABRIC_CHANNEL || 'mychannel';
    this.chaincodeName = process.env.FABRIC_CHAINCODE || 'certificates';
    this.identity = process.env.FABRIC_IDENTITY || 'appUser';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    await getNetworkInfo();
    this.initialized = true;
  }

  async issueCertificate(certificateData) {
    await this.initialize();

    const certificateId = certificateData.id || `cert-${Date.now()}`;
    const result = await issueCertificate({
      certificateId,
      documentHash: certificateData.documentHash,
      ipfsCid: certificateData.ipfsHash || '',
      studentId: certificateData.studentId,
      courseName: certificateData.courseName,
      metadata: certificateData.metadata || {},
    });

    return {
      success: result.ok,
      certificateId,
      network: 'Hyperledger Fabric',
      ...result.value,
    };
  }

  async verifyCertificate(certificateId, documentHash = '') {
    await this.initialize();
    return verifyCertificate({ certificateId, documentHash });
  }

  async revokeCertificate(certificateId, reason) {
    await this.initialize();
    const result = await revokeCertificate({ certificateId, reason });
    return {
      success: result.ok,
      certificateId,
      network: 'Hyperledger Fabric',
      ...result.value,
    };
  }

  async getNetworkInfo() {
    await this.initialize();
    const info = await getNetworkInfo();
    return {
      network: 'Hyperledger Fabric',
      environment: process.env.FABRIC_ENV || 'local',
      channelName: info.channelName,
      chaincodeName: info.chaincodeName,
      identity: info.identity,
      walletPath: info.walletPath,
      connectionProfilePath: info.connectionProfilePath,
      initialized: this.initialized,
      apiVersion: '1.0',
    };
  }

  async healthCheck() {
    try {
      const info = await this.getNetworkInfo();
      return {
        status: 'healthy',
        network: 'Hyperledger Fabric',
        channelName: info.channelName,
        chaincodeName: info.chaincodeName,
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        network: 'Hyperledger Fabric',
        error: error.message,
      };
    }
  }
}

module.exports = FabricCertificateService;
