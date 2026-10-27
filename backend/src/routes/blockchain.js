/**
 * Blockchain Integration Routes
 * Handles certificate issuance and verification on Hyperledger Fabric
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const QRCode = require('qrcode');
const { getNetworkInfo, issueCertificate, verifyCertificate } = require('../services/fabricClient');
const fabricToIcpBridgeService = require('../services/fabricToIcpBridgeService');

const checkQrServiceHealth = async () => {
  const startedAt = Date.now();

  try {
    await QRCode.toBuffer('health-check', {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 96
    });

    const latencyMs = Date.now() - startedAt;

    return {
      status: latencyMs > 1000 ? 'degraded' : 'operational',
      latency: `${latencyMs}ms`
    };
  } catch (error) {
    return {
      status: 'offline',
      latency: 'n/a',
      error: error.message
    };
  }
};

// ============================================================
// NETWORK INFORMATION ENDPOINTS
// ============================================================

/**
 * GET /api/blockchain/networks
 * Get available blockchain networks
 */
router.get('/networks', async (req, res) => {
  try {
    const fabricInfo = await getNetworkInfo();

    res.json({
      success: true,
      networks: {
        fabric: {
          name: 'Hyperledger Fabric',
          type: 'permissioned',
          ...fabricInfo
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      networks: {
        fabric: {
          name: 'Hyperledger Fabric',
          type: 'permissioned',
          status: 'offline',
          error: error.message
        }
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/blockchain/status
 * Get blockchain integration status
 */
router.get('/status', async (req, res) => {
  try {
    const fabricInfo = await getNetworkInfo();

    res.json({
      success: true,
      status: {
        fabric: {
          configured: !!fabricInfo.channelName && !!fabricInfo.chaincodeName,
          status: fabricInfo.status,
          connected: fabricInfo.connected,
          channelName: fabricInfo.channelName,
          chaincodeName: fabricInfo.chaincodeName,
          identity: fabricInfo.identity
        },
        bridge: fabricToIcpBridgeService.getStatus()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      status: {
        fabric: {
          configured: false,
          status: 'offline',
          error: error.message
        },
        bridge: fabricToIcpBridgeService.getStatus()
      },
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/health', auth, admin, async (req, res) => {
  try {
    const [fabricInfo, qrService] = await Promise.all([
      getNetworkInfo(),
      checkQrServiceHealth()
    ]);
    const bridge = fabricToIcpBridgeService.getStatus();

    res.json({
      success: true,
      data: {
        fabric: {
          configured: !!fabricInfo.channelName && !!fabricInfo.chaincodeName,
          status: fabricInfo.status,
          connected: fabricInfo.connected,
          channelName: fabricInfo.channelName,
          chaincodeName: fabricInfo.chaincodeName,
          identity: fabricInfo.identity,
          error: fabricInfo.error
        },
        bridge,
        qrService
      },
      bridge,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      success: true,
      data: {
        fabric: {
          configured: false,
          status: 'offline',
          connected: false,
          error: error.message
        },
        bridge: fabricToIcpBridgeService.getStatus(),
        qrService: { status: 'operational' }
      },
      bridge: fabricToIcpBridgeService.getStatus(),
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================
// FABRIC ENDPOINTS
// ============================================================

/**
 * POST /api/blockchain/fabric/issue-certificate
 * Issue certificate on Hyperledger Fabric
 * Auth: Admin only
 */
router.post('/fabric/issue-certificate', auth, admin, async (req, res) => {
  try {
    const { studentId, courseName, documentHash, ipfsHash } = req.body;

    if (!studentId || !courseName || !documentHash || !ipfsHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, courseName, documentHash, ipfsHash'
      });
    }

    const certificateId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await issueCertificate({
      certificateId,
      documentHash,
      ipfsCid: ipfsHash,
      studentId,
      courseName,
      metadata: {}
    });

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to issue certificate on Hyperledger Fabric'
      });
    }

    res.json({
      success: true,
      certificateId,
      message: 'Certificate issued on Hyperledger Fabric',
      data: {
        studentId,
        courseName,
        documentHash,
        ipfsHash,
        issuedAt: new Date().toISOString(),
        network: 'Hyperledger Fabric'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/blockchain/fabric/verify/:certificateId
 * Verify certificate on Hyperledger Fabric
 */
router.get('/fabric/verify/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { documentHash } = req.query;

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        error: 'Certificate ID required'
      });
    }

    const result = await verifyCertificate({
      certificateId,
      documentHash: documentHash || ''
    });

    res.json({
      success: true,
      verification: result,
      network: 'Hyperledger Fabric',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// COMBINED ENDPOINTS
// ============================================================

/**
 * POST /api/blockchain/issue-certificate
 * Issue certificate on Hyperledger Fabric
 * Auth: Admin only
 */
router.post('/issue-certificate', auth, admin, async (req, res) => {
  try {
    const { studentId, courseName, documentHash, ipfsHash } = req.body;

    if (!studentId || !courseName || !documentHash || !ipfsHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: studentId, courseName, documentHash, ipfsHash'
      });
    }

    const certificateId = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await issueCertificate({
      certificateId,
      documentHash,
      ipfsCid: ipfsHash,
      studentId,
      courseName,
      metadata: {}
    });

    if (!result.ok) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to issue certificate on Hyperledger Fabric'
      });
    }

    res.json({
      success: true,
      results: {
        fabric: {
          status: 'issued',
          certificateId,
          data: {
            studentId,
            courseName,
            documentHash,
            ipfsHash,
            issuedAt: new Date().toISOString()
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/blockchain/verify/:certificateId
 * Verify certificate on Hyperledger Fabric
 */
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;
    const { documentHash } = req.query;

    if (!certificateId) {
      return res.status(400).json({
        success: false,
        error: 'Certificate ID required'
      });
    }

    let result;
    try {
      result = await verifyCertificate({
        certificateId,
        documentHash: documentHash || ''
      });
    } catch (error) {
      result = { error: error.message };
    }

    let icpResult = { checked: false, verified: false };
    const targetHash = documentHash || result?.certificate?.documentHash || result?.certificate?.hash;
    if (targetHash && fabricToIcpBridgeService.enabled) {
      try {
        const isAnchored = await fabricToIcpBridgeService.icpService.verifyCertificate(certificateId, targetHash);
        icpResult = {
          checked: true,
          verified: !!isAnchored,
          canisterId: fabricToIcpBridgeService.icpService.config.canisterId
        };
      } catch (icpError) {
        icpResult = { checked: true, verified: false, error: icpError.message };
      }
    }

    res.json({
      success: true,
      results: {
        fabric: result,
        icp: icpResult
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// LEGACY ENDPOINTS (for backward compatibility)
// ============================================================

/**
 * GET /api/blockchain/network
 * Legacy: Get blockchain network information
 */
router.get('/network', async (req, res) => {
  try {
    const info = await getNetworkInfo();
    const bridgeStatus = fabricToIcpBridgeService.getStatus();

    res.json({
      success: true,
      data: {
        networkName: 'Hyperledger Fabric + Internet Computer (ICP)',
        status: info.status || 'offline',
        connected: info.connected || false,
        channelName: info.channelName,
        chaincodeName: info.chaincodeName,
        identity: info.identity,
        canisterId: process.env.ICP_CANISTER_ID || '',
        bridge: bridgeStatus,
        ipfsGateway: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io',
        error: info.error
      }
    });
  } catch (error) {
    const bridgeStatus = fabricToIcpBridgeService.getStatus();
    res.json({
      success: true,
      data: {
        networkName: 'Hyperledger Fabric + Internet Computer (ICP)',
        status: 'offline',
        connected: false,
        channelName: 'mychannel',
        chaincodeName: 'certificates',
        identity: 'appUser',
        canisterId: process.env.ICP_CANISTER_ID || '',
        bridge: bridgeStatus,
        ipfsGateway: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io',
        error: error.message
      }
    });
  }
});

module.exports = router;
