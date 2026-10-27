const AES256Service = require('../src/services/encryption/aes256Service');
const ECDSAService = require('../src/services/encryption/ecdsaService');
const SHA256Service = require('../src/services/encryption/sha256Service');
const EncryptionService = require('../src/services/encryption/encryptionService');
const KeyManagementService = require('../src/services/encryption/keyManagementService');

// Test data
const testCertificateData = "This is a test certificate document with sensitive information.";
const testPassword = "testPassword123!";

console.log('🔐 Testing BlockD3 CertVault Encryption Implementation\n');

async function testAES256Encryption() {
    console.log('1. Testing AES-256 Encryption...');
    
    try {
        // Generate key
        const key = AES256Service.generateKey();
        console.log('   ✓ AES-256 key generated:', key.substring(0, 16) + '...');
        
        // Encrypt data
        const encrypted = AES256Service.encrypt(testCertificateData, key);
        console.log('   ✓ Data encrypted successfully');
        console.log('   - Algorithm:', encrypted.algorithm);
        console.log('   - IV:', encrypted.iv.substring(0, 16) + '...');
        
        // Decrypt data
        const decrypted = AES256Service.decrypt(encrypted.encrypted, key, encrypted.iv, encrypted.authTag);
        console.log('   ✓ Data decrypted successfully');
        
        // Verify integrity
        const isValid = decrypted === testCertificateData;
        console.log('   ✓ Data integrity verified:', isValid);
        
        if (!isValid) {
            throw new Error('Decrypted data does not match original');
        }
        
        console.log('   ✅ AES-256 encryption test passed\n');
        return true;
    } catch (error) {
        console.log('   ❌ AES-256 encryption test failed:', error.message);
        return false;
    }
}

async function testECDSASignature() {
    console.log('2. Testing ECDSA Digital Signatures...');
    
    try {
        // Generate key pair
        const keyPair = ECDSAService.generateKeyPair();
        console.log('   ✓ ECDSA key pair generated');
        console.log('   - Algorithm:', keyPair.algorithm);
        console.log('   - Public Key:', keyPair.publicKey.substring(0, 20) + '...');
        
        // Sign data
        const signature = ECDSAService.sign(testCertificateData, keyPair.privateKey);
        console.log('   ✓ Data signed successfully');
        console.log('   - Signature:', signature.signature.substring(0, 20) + '...');
        
        // Verify signature
        const isValid = ECDSAService.verify(testCertificateData, signature.signature, keyPair.publicKey);
        console.log('   ✓ Signature verified:', isValid);
        
        if (!isValid) {
            throw new Error('Signature verification failed');
        }
        
        // Test encryption with ECDSA
        const encrypted = ECDSAService.encrypt(testCertificateData, keyPair.publicKey);
        console.log('   ✓ Data encrypted with ECDSA public key');
        
        const decrypted = ECDSAService.decrypt(encrypted, keyPair.privateKey);
        console.log('   ✓ Data decrypted with ECDSA private key');
        
        const encryptionValid = decrypted === testCertificateData;
        console.log('   ✓ ECDSA encryption integrity verified:', encryptionValid);
        
        if (!encryptionValid) {
            throw new Error('ECDSA encrypted data does not match original');
        }
        
        console.log('   ✅ ECDSA signature and encryption test passed\n');
        return true;
    } catch (error) {
        console.log('   ❌ ECDSA test failed:', error.message);
        return false;
    }
}

async function testSHA256Hashing() {
    console.log('3. Testing SHA-256 Hashing...');
    
    try {
        // Generate hash
        const hash = SHA256Service.hash(testCertificateData);
        console.log('   ✓ SHA-256 hash generated:', hash.substring(0, 20) + '...');
        
        // Verify hash
        const isValid = SHA256Service.verify(testCertificateData, hash);
        console.log('   ✓ Hash verified:', isValid);
        
        if (!isValid) {
            throw new Error('Hash verification failed');
        }
        
        // Test file hashing
        const fileBuffer = Buffer.from(testCertificateData, 'utf8');
        const fileHash = SHA256Service.hashFile(fileBuffer);
        console.log('   ✓ File hash generated:', fileHash.substring(0, 20) + '...');
        
        // Test HMAC
        const hmac = SHA256Service.hmac(testCertificateData, 'secret-key');
        console.log('   ✓ HMAC generated:', hmac.substring(0, 20) + '...');
        
        const hmacValid = SHA256Service.verifyHmac(testCertificateData, 'secret-key', hmac);
        console.log('   ✓ HMAC verified:', hmacValid);
        
        if (!hmacValid) {
            throw new Error('HMAC verification failed');
        }
        
        console.log('   ✅ SHA-256 hashing test passed\n');
        return true;
    } catch (error) {
        console.log('   ❌ SHA-256 test failed:', error.message);
        return false;
    }
}

async function testFullEncryptionPipeline() {
    console.log('4. Testing Full Certificate Encryption Pipeline...');
    
    try {
        // Generate recipient key pair
        const recipientKeyPair = ECDSAService.generateKeyPair();
        console.log('   ✓ Recipient key pair generated');
        
        // Create certificate buffer
        const certificateBuffer = Buffer.from(testCertificateData, 'utf8');
        
        // Encrypt certificate
        const encryptedData = await EncryptionService.encryptCertificate(
            certificateBuffer, 
            recipientKeyPair.publicKey
        );
        console.log('   ✓ Certificate encrypted with full pipeline');
        console.log('   - Document Hash:', encryptedData.documentHash.substring(0, 20) + '...');
        console.log('   - Encryption Version:', encryptedData.encryptionMetadata.encryptionVersion);
        
        // Decrypt certificate
        const decryptedBuffer = await EncryptionService.decryptCertificate(
            encryptedData,
            recipientKeyPair.privateKey
        );
        console.log('   ✓ Certificate decrypted successfully');
        
        // Verify integrity
        const decryptedData = decryptedBuffer.toString('utf8');
        const isValid = decryptedData === testCertificateData;
        console.log('   ✓ Full pipeline integrity verified:', isValid);
        
        if (!isValid) {
            throw new Error('Full pipeline decrypted data does not match original');
        }
        
        // Test verification without decryption
        const verificationResult = EncryptionService.verifyCertificateIntegrity(
            encryptedData,
            encryptedData.documentHash
        );
        console.log('   ✓ Certificate integrity verified without decryption:', verificationResult.isValid);
        
        if (!verificationResult.isValid) {
            throw new Error('Certificate integrity verification failed');
        }
        
        console.log('   ✅ Full encryption pipeline test passed\n');
        return true;
    } catch (error) {
        console.log('   ❌ Full encryption pipeline test failed:', error.message);
        console.log('   Error details:', error);
        return false;
    }
}

async function testKeyManagement() {
    console.log('5. Testing Key Management...');
    
    try {
        // Generate user keys
        const userKeys = await KeyManagementService.generateUserKeys('test-user-id', testPassword);
        console.log('   ✓ User keys generated');
        console.log('   - Key Pair ID:', userKeys.keyPairId);
        console.log('   - Algorithm:', userKeys.algorithm);
        
        // Test private key encryption/decryption
        const decryptedPrivateKey = KeyManagementService.decryptPrivateKeyWithPassword(
            userKeys.encryptedPrivateKey,
            testPassword,
            userKeys.salt
        );
        console.log('   ✓ Private key decrypted with password');
        
        // Verify key pair integrity
        const isValidKeyPair = KeyManagementService.validateKeyPair(
            userKeys.publicKey,
            decryptedPrivateKey
        );
        console.log('   ✓ Key pair integrity verified:', isValidKeyPair);
        
        if (!isValidKeyPair) {
            throw new Error('Key pair validation failed');
        }
        
        // Test key backup
        const backup = KeyManagementService.createKeyBackup(userKeys, 'backup-password');
        console.log('   ✓ Key backup created');
        console.log('   - Backup ID:', backup.backupId);
        
        const restoredKeys = KeyManagementService.restoreKeyBackup(backup, 'backup-password');
        console.log('   ✓ Keys restored from backup');
        
        console.log('   ✅ Key management test passed\n');
        return true;
    } catch (error) {
        console.log('   ❌ Key management test failed:', error.message);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('Starting comprehensive encryption tests...\n');
    
    const results = [];
    
    results.push(await testAES256Encryption());
    results.push(await testECDSASignature());
    results.push(await testSHA256Hashing());
    results.push(await testFullEncryptionPipeline());
    results.push(await testKeyManagement());
    
    const passedTests = results.filter(result => result).length;
    const totalTests = results.length;
    
    console.log('📊 Test Results Summary:');
    console.log(`   Passed: ${passedTests}/${totalTests}`);
    console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All encryption tests passed! The BlockD3 CertVault encryption system is working correctly.');
        console.log('\n✨ Features successfully implemented:');
        console.log('   • AES-256-GCM encryption for certificate documents');
        console.log('   • ECDSA digital signatures for authenticity');
        console.log('   • SHA-256 hashing for integrity verification');
        console.log('   • Public-key cryptography for key management');
        console.log('   • Full encryption/decryption pipeline');
        console.log('   • Key management and backup systems');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the implementation.');
    }
    
    return passedTests === totalTests;
}

// Export for use in other test files
module.exports = {
    testAES256Encryption,
    testECDSASignature,
    testSHA256Hashing,
    testFullEncryptionPipeline,
    testKeyManagement,
    runAllTests
};

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

if (typeof describe === 'function') {
  describe('Encryption Integration Scripts', () => {
    test('runAllTests should complete successfully', async () => {
        await expect(runAllTests()).resolves.toBe(true);
    });
});
}