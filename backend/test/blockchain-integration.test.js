/**
 * Blockchain Integration Test Suite
 * Hyperledger Fabric certificate operations
 */

const http = require('http');
const express = require('express');
const FabricCertificateService = require('../src/services/fabricCertificateService');

jest.mock('../src/services/fabricClient', () => ({
  getNetworkInfo: jest.fn().mockResolvedValue({
    channelName: 'mychannel',
    chaincodeName: 'certificates',
    identity: 'appUser'
  }),
  issueCertificate: jest.fn().mockResolvedValue({ ok: true, value: {} }),
  verifyCertificate: jest.fn().mockResolvedValue({ exists: true, isValid: true })
}));

describe('Blockchain Integration (Hyperledger Fabric)', () => {
  let fabricService;

  const callJson = async ({ app, method, path, body, headers }) => {
    const server = http.createServer(app);

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}${path}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(headers || {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseBody = await response.json();
      return {
        status: response.status,
        body: responseBody,
      };
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  };

  beforeAll(() => {
    process.env.FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'mychannel';
    process.env.FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'certificates';
    fabricService = new FabricCertificateService();
  });

  // ============================================================
  // FABRIC CERTIFICATE SERVICE TESTS
  // ============================================================

  describe('FabricCertificateService', () => {
    test('should initialize Fabric connection', async () => {
      await fabricService.initialize();
      expect(fabricService.initialized).toBe(true);
    });

    test('getNetworkInfo should return Fabric network configuration', async () => {
      const info = await fabricService.getNetworkInfo();
      expect(info).toBeDefined();
      expect(info.network).toBe('Hyperledger Fabric');
      expect(info.environment).toBeDefined();
      expect(info.channelName).toBeDefined();
      expect(info.chaincodeName).toBeDefined();
    });

    test('healthCheck should verify Fabric connectivity', async () => {
      const health = await fabricService.healthCheck();
      expect(health).toBeDefined();
      expect(health.network).toBe('Hyperledger Fabric');
      expect(['healthy', 'unhealthy']).toContain(health.status);
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================

  describe('Blockchain API Integration', () => {
    let app;

    beforeAll(() => {
      app = express();
      app.use(express.json());

      app.use((req, res, next) => {
        if (req.header('Authorization')) {
          req.user = { id: 'test-user', role: 'admin' };
        }
        next();
      });

      const blockchainRoutes = require('../src/routes/blockchain');
      app.use('/api/blockchain', blockchainRoutes);
    });

    test('GET /api/blockchain/networks should return Fabric network information', async () => {
      const response = await callJson({
        app,
        method: 'GET',
        path: '/api/blockchain/networks',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.networks).toBeDefined();
      expect(response.body.networks.fabric).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    test('GET /api/blockchain/status should return Fabric integration status', async () => {
      const response = await callJson({
        app,
        method: 'GET',
        path: '/api/blockchain/status',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBeDefined();
      expect(response.body.status.fabric).toBeDefined();
    });

    test('POST /api/blockchain/issue-certificate should require admin auth', async () => {
      const response = await callJson({
        app,
        method: 'POST',
        path: '/api/blockchain/issue-certificate',
        body: {
          studentId: 'STU001',
          courseName: 'BC101',
          documentHash: '0xabc...',
          ipfsHash: 'QmXyz...'
        },
      });

      expect([401, 403]).toContain(response.status);
    });

    test('GET /api/blockchain/verify/:certificateId should work without auth', async () => {
      const response = await callJson({
        app,
        method: 'GET',
        path: '/api/blockchain/verify/test-cert-123',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.fabric).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});

module.exports = {};
