const crypto = require('crypto');
const bridge = require('../src/services/fabricToIcpBridgeService');
const { issueCertificate } = require('../src/services/fabricClient');
const IcpCertificateAnchorService = require('../src/services/icpCertificateAnchorService');

async function main() {
  const certificateId = `cert-${Date.now()}`;
  const documentHash = crypto.createHash('sha256').update(`demo-${certificateId}`).digest('hex');
  const icp = new IcpCertificateAnchorService();

  await bridge.start();
  await issueCertificate({
    certificateId,
    documentHash,
    ipfsCid: 'bafybeigdemo',
    studentId: 'student-001',
    courseName: 'Blockchain Systems',
    metadata: { source: 'bridge-test' },
  });

  await new Promise((resolve) => setTimeout(resolve, 10000));
  const verified = await icp.verifyCertificate(certificateId, documentHash);

  console.log(JSON.stringify({ certificateId, documentHash, verified }, null, 2));
  await bridge.stop();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await bridge.stop();
  } catch (_) {
    // ignore cleanup errors
  }
  process.exit(1);
});
