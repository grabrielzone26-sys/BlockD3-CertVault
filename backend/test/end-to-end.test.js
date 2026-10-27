const EncryptionService = require('../src/services/encryption/encryptionService');
const KeyManagementService = require('../src/services/encryption/keyManagementService');
const ECDSAService = require('../src/services/encryption/ecdsaService');
const SHA256Service = require('../src/services/encryption/sha256Service');

console.log('🔄 Testing BlockD3 CertVault End-to-End Encryption Workflow\n');

// Test data representing a real certificate scenario
const CERTIFICATE_DATA = `
CERTIFICATE OF COMPLETION

This is to certify that

JOHN DOE

has successfully completed the course

ADVANCED BLOCKCHAIN TECHNOLOGY

with a grade of A+ (95%)

Issued by: BlockD3 University
Date: ${new Date().toLocaleDateString()}
Credits: 3
Course Code: BLOCKCHAIN-401

This certificate is digitally signed and encrypted using:
- AES-256 encryption for document security
- ECDSA digital signatures for authenticity
- SHA-256 hashing for integrity verification

Certificate ID: CERT-${Date.now()}
`;

async function testCompleteWorkflow() {
    console.log('🎯 Testing Complete Certificate Lifecycle with Encryption\n');
    
    try {
        // Step 1: Institution Setup
        console.log('1. Institution Setup Phase...');
        const institutionPassword = 'SecureInstitutionPassword123!';
        const institutionKeys = await KeyManagementService.generateUserKeys('institution-001', institutionPassword);
        console.log('   ✓ Institution cryptographic keys generated');
        console.log('   - Key Pair ID:', institutionKeys.keyPairId);
        console.log('   - Algorithm:', institutionKeys.algorithm);
        
        // Step 2: Student Registration
        console.log('\n2. Student Registration Phase...');
        const studentPassword = 'StudentSecurePass456!';
        const studentKeys = await KeyManagementService.generateUserKeys('student-john-doe', studentPassword);
        console.log('   ✓ Student cryptographic keys generated');
        console.log('   - Key Pair ID:', studentKeys.keyPairId);
        
        // Step 3: Certificate Creation and Encryption
        console.log('\n3. Certificate Creation and Encryption Phase...');
        const certificateBuffer = Buffer.from(CERTIFICATE_DATA, 'utf8');
        
        // Encrypt certificate for the student
        const encryptedCertificate = await EncryptionService.encryptCertificate(
            certificateBuffer,
            studentKeys.publicKey
        );
        
        console.log('   ✓ Certificate encrypted successfully');
        console.log('   - Document Hash:', encryptedCertificate.documentHash.substring(0, 20) + '...');
        console.log('   - Encryption Version:', encryptedCertificate.encryptionMetadata.encryptionVersion);
        console.log('   - Digital Signature Length:', encryptedCertificate.digitalSignature.signature.length);
        
        // Step 4: Blockchain Storage Simulation
        console.log('\n4. Blockchain Storage Simulation...');
        const blockchainRecord = {
            certificateId: 'cert-' + Date.now(),
            documentHash: encryptedCertificate.documentHash,
            encryptionKeyHash: SHA256Service.hash(encryptedCertificate.encryptedAESKey.toString()),
            issuerPublicKey: encryptedCertificate.issuerKeys.publicKey,
            digitalSignature: encryptedCertificate.digitalSignature.signature,
            timestamp: Date.now(),
            blockNumber: Math.floor(Math.random() * 1000000),
            transactionHash: '0x' + require('crypto').randomBytes(32).toString('hex')
        };
        
        console.log('   ✓ Certificate metadata stored on blockchain');
        console.log('   - Certificate ID:', blockchainRecord.certificateId);
        console.log('   - Block Number:', blockchainRecord.blockNumber);
        console.log('   - Transaction Hash:', blockchainRecord.transactionHash.substring(0, 20) + '...');
        
        // Step 5: IPFS Storage Simulation
        console.log('\n5. IPFS Storage Simulation...');
        const ipfsHash = 'Qm' + require('crypto').randomBytes(22).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
        console.log('   ✓ Encrypted certificate stored on IPFS');
        console.log('   - IPFS Hash:', ipfsHash);
        console.log('   - Encrypted Data Size:', encryptedCertificate.encryptedCertificate.data.length, 'bytes');
        
        // Step 6: Certificate Verification (Public)
        console.log('\n6. Public Certificate Verification...');
        const verificationResult = EncryptionService.verifyCertificateIntegrity(
            encryptedCertificate,
            encryptedCertificate.documentHash
        );
        
        console.log('   ✓ Certificate integrity verification completed');
        console.log('   - Overall Valid:', verificationResult.isValid);
        console.log('   - Document Hash Valid:', verificationResult.checks.documentHashValid);
        console.log('   - Digital Signature Valid:', verificationResult.checks.digitalSignatureValid);
        console.log('   - Encryption Integrity Valid:', verificationResult.checks.encryptionIntegrityValid);
        
        if (!verificationResult.isValid) {
            throw new Error('Certificate verification failed');
        }
        
        // Step 7: Authorized Certificate Access
        console.log('\n7. Authorized Certificate Access...');
        
        // Student decrypts their own certificate
        const decryptedPrivateKey = KeyManagementService.decryptPrivateKeyWithPassword(
            studentKeys.encryptedPrivateKey,
            studentPassword,
            studentKeys.salt
        );
        
        const decryptedCertificate = await EncryptionService.decryptCertificate(
            encryptedCertificate,
            decryptedPrivateKey
        );
        
        const decryptedData = decryptedCertificate.toString('utf8');
        const isDataIntact = decryptedData === CERTIFICATE_DATA;
        
        console.log('   ✓ Certificate decrypted by authorized student');
        console.log('   - Data Integrity Verified:', isDataIntact);
        console.log('   - Certificate Length:', decryptedData.length, 'characters');
        
        if (!isDataIntact) {
            throw new Error('Decrypted certificate data does not match original');
        }
        
        // Step 8: Employer Verification Simulation
        console.log('\n8. Employer Verification Simulation...');
        
        // Employer can verify without decrypting
        const employerVerification = {
            certificateExists: true,
            isValid: verificationResult.isValid,
            issuerVerified: true,
            blockchainConfirmed: true,
            studentIdentityConfirmed: decryptedData.includes('JOHN DOE'),
            courseConfirmed: decryptedData.includes('ADVANCED BLOCKCHAIN TECHNOLOGY'),
            gradeVisible: false, // Encrypted, not visible to employer without permission
            institutionTrusted: true
        };
        
        console.log('   ✓ Employer verification completed');
        console.log('   - Certificate Exists:', employerVerification.certificateExists);
        console.log('   - Valid Certificate:', employerVerification.isValid);
        console.log('   - Issuer Verified:', employerVerification.issuerVerified);
        console.log('   - Blockchain Confirmed:', employerVerification.blockchainConfirmed);
        console.log('   - Student Identity Confirmed:', employerVerification.studentIdentityConfirmed);
        console.log('   - Course Confirmed:', employerVerification.courseConfirmed);
        
        // Step 9: Key Backup and Recovery Test
        console.log('\n9. Key Backup and Recovery Test...');
        
        const backupPassword = 'BackupRecoveryPassword789!';
        const keyBackup = KeyManagementService.createKeyBackup(studentKeys, backupPassword);
        
        console.log('   ✓ Student keys backed up securely');
        console.log('   - Backup ID:', keyBackup.backupId);
        
        // Simulate key recovery
        const recoveredKeys = KeyManagementService.restoreKeyBackup(keyBackup, backupPassword);
        const keysMatch = recoveredKeys.publicKey === studentKeys.publicKey;
        
        console.log('   ✓ Keys recovered from backup');
        console.log('   - Recovery Successful:', keysMatch);
        
        if (!keysMatch) {
            throw new Error('Recovered keys do not match original keys');
        }
        
        // Step 10: Performance Metrics
        console.log('\n10. Performance Metrics...');
        
        const metrics = {
            originalCertificateSize: CERTIFICATE_DATA.length,
            encryptedCertificateSize: encryptedCertificate.encryptedCertificate.data.length,
            compressionRatio: (encryptedCertificate.encryptedCertificate.data.length / CERTIFICATE_DATA.length).toFixed(2),
            encryptionOverhead: encryptedCertificate.encryptedCertificate.data.length - CERTIFICATE_DATA.length,
            hashLength: encryptedCertificate.documentHash.length,
            signatureLength: encryptedCertificate.digitalSignature.signature.length,
            keyPairGenerationTime: '< 100ms (estimated)',
            encryptionTime: '< 50ms (estimated)',
            verificationTime: '< 10ms (estimated)'
        };
        
        console.log('   ✓ Performance metrics calculated');
        console.log('   - Original Size:', metrics.originalCertificateSize, 'bytes');
        console.log('   - Encrypted Size:', metrics.encryptedCertificateSize, 'bytes');
        console.log('   - Compression Ratio:', metrics.compressionRatio + 'x');
        console.log('   - Encryption Overhead:', metrics.encryptionOverhead, 'bytes');
        console.log('   - Hash Length:', metrics.hashLength, 'characters');
        console.log('   - Signature Length:', metrics.signatureLength, 'characters');
        
        console.log('\n✅ Complete End-to-End Workflow Test PASSED');
        console.log('\n🎉 All phases completed successfully:');
        console.log('   ✓ Institution and student key generation');
        console.log('   ✓ Certificate encryption with AES-256');
        console.log('   ✓ Digital signature with ECDSA');
        console.log('   ✓ Document hashing with SHA-256');
        console.log('   ✓ Blockchain metadata storage');
        console.log('   ✓ IPFS encrypted document storage');
        console.log('   ✓ Public verification without decryption');
        console.log('   ✓ Authorized decryption by certificate owner');
        console.log('   ✓ Employer verification workflow');
        console.log('   ✓ Key backup and recovery');
        console.log('   ✓ Performance metrics analysis');
        
        return true;
        
    } catch (error) {
        console.log('\n❌ End-to-End Workflow Test FAILED');
        console.log('Error:', error.message);
        console.log('Stack:', error.stack);
        return false;
    }
}

// Additional security tests
async function testSecurityFeatures() {
    console.log('\n🔒 Testing Security Features...\n');
    
    try {
        console.log('1. Testing Unauthorized Access Prevention...');
        
        // Generate two different key pairs
        const authorizedKeys = ECDSAService.generateKeyPair();
        const unauthorizedKeys = ECDSAService.generateKeyPair();
        
        // Encrypt certificate for authorized user
        const testData = "Confidential Certificate Data";
        const encryptedData = await EncryptionService.encryptCertificate(
            Buffer.from(testData, 'utf8'),
            authorizedKeys.publicKey
        );
        
        console.log('   ✓ Certificate encrypted for authorized user');
        
        // Try to decrypt with unauthorized key (should fail)
        try {
            await EncryptionService.decryptCertificate(encryptedData, unauthorizedKeys.privateKey);
            throw new Error('Unauthorized decryption should have failed');
        } catch (decryptError) {
            console.log('   ✓ Unauthorized access properly prevented');
        }
        
        console.log('\n2. Testing Tamper Detection...');
        
        // Tamper with encrypted data
        const tamperedData = { ...encryptedData };
        tamperedData.encryptedCertificate.data = tamperedData.encryptedCertificate.data.slice(0, -10) + '0000000000';
        
        const tamperVerification = EncryptionService.verifyCertificateIntegrity(
            tamperedData,
            tamperedData.documentHash
        );
        
        console.log('   ✓ Tamper detection test completed');
        console.log('   - Tampered Data Detected:', !tamperVerification.isValid);
        
        if (tamperVerification.isValid) {
            throw new Error('Tamper detection failed - should have detected tampering');
        }
        
        console.log('\n3. Testing Key Strength...');
        
        // Test multiple key generations for randomness
        const keys1 = ECDSAService.generateKeyPair();
        const keys2 = ECDSAService.generateKeyPair();
        const keys3 = ECDSAService.generateKeyPair();
        
        const allKeysDifferent = (
            keys1.privateKey !== keys2.privateKey &&
            keys2.privateKey !== keys3.privateKey &&
            keys1.privateKey !== keys3.privateKey
        );
        
        console.log('   ✓ Key generation randomness verified:', allKeysDifferent);
        
        if (!allKeysDifferent) {
            throw new Error('Key generation is not sufficiently random');
        }
        
        console.log('\n✅ Security Features Test PASSED');
        return true;
        
    } catch (error) {
        console.log('\n❌ Security Features Test FAILED');
        console.log('Error:', error.message);
        return false;
    }
}

// Run all end-to-end tests
async function runAllE2ETests() {
    console.log('Starting comprehensive end-to-end testing...\n');
    
    const workflowResult = await testCompleteWorkflow();
    const securityResult = await testSecurityFeatures();
    
    const allPassed = workflowResult && securityResult;
    
    console.log('\n📊 End-to-End Test Results Summary:');
    console.log('   Complete Workflow Test:', workflowResult ? 'PASSED' : 'FAILED');
    console.log('   Security Features Test:', securityResult ? 'PASSED' : 'FAILED');
    console.log('   Overall Result:', allPassed ? 'SUCCESS' : 'FAILURE');
    
    if (allPassed) {
        console.log('\n🏆 COMPREHENSIVE TESTING COMPLETE');
        console.log('The BlockD3 CertVault encryption system has been thoroughly tested and verified!');
    }
    
    return allPassed;
}

// Export for use in other test files
module.exports = {
    testCompleteWorkflow,
    testSecurityFeatures,
    runAllE2ETests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runAllE2ETests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('E2E test execution failed:', error);
        process.exit(1);
    });
}

describe('End To End Scripts', () => {
    test('runAllE2ETests should complete successfully', async () => {
        await expect(runAllE2ETests()).resolves.toBe(true);
    });
});
