const AES256Service = require('./aes256Service');
const ECDSAService = require('./ecdsaService');
const SHA256Service = require('./sha256Service');

class EncryptionService {
  /**
   * Encrypt certificate with full encryption pipeline
   * @param {Buffer} certificateBuffer - Certificate file buffer
   * @param {string} recipientPublicKey - ECDSA public key of recipient
   * @returns {Object} - Complete encryption result
   */
  static async encryptCertificate(certificateBuffer, recipientPublicKey) {
    try {
      // Step 1: Generate AES-256 key
      const aesKey = AES256Service.generateKey();
      
      // Step 2: Encrypt certificate with AES-256
      const encryptedCertificate = AES256Service.encryptFile(certificateBuffer, aesKey);
      
      // Step 3: Calculate SHA-256 hash of encrypted certificate
      const encryptedBuffer = Buffer.from(encryptedCertificate.encrypted, 'hex');
      const documentHash = SHA256Service.hashFile(encryptedBuffer);
      
      // Step 4: Encrypt AES key with ECDSA public key
      const encryptedAESKey = ECDSAService.encrypt(aesKey, recipientPublicKey);
      
      // Step 5: Create digital signature of the document hash
      const issuerKeyPair = ECDSAService.generateKeyPair();
      const digitalSignature = ECDSAService.sign(documentHash, issuerKeyPair.privateKey);
      
      return {
        // Encrypted certificate data
        encryptedCertificate: {
          data: encryptedCertificate.encrypted,
          iv: encryptedCertificate.iv,
          authTag: encryptedCertificate.authTag,
          algorithm: encryptedCertificate.algorithm
        },
        
        // Document integrity
        documentHash,
        
        // Encrypted AES key
        encryptedAESKey: {
          ephemeralPublicKey: encryptedAESKey.ephemeralPublicKey,
          encrypted: encryptedAESKey.encrypted,
          iv: encryptedAESKey.iv,
          authTag: encryptedAESKey.authTag,
          algorithm: encryptedAESKey.algorithm
        },
        
        // Digital signature
        digitalSignature: {
          signature: digitalSignature.signature,
          recovery: digitalSignature.recovery,
          hash: digitalSignature.hash,
          algorithm: digitalSignature.algorithm
        },
        
        // Issuer keys
        issuerKeys: {
          publicKey: issuerKeyPair.publicKey,
          privateKey: issuerKeyPair.privateKey, // Store securely!
          keyPairId: issuerKeyPair.keyPairId
        },
        
        // Metadata
        encryptionMetadata: {
          timestamp: new Date(),
          recipientPublicKey,
          encryptionVersion: '1.0.0'
        }
      };
    } catch (error) {
      throw new Error(`Certificate encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt certificate with full decryption pipeline
   * @param {Object} encryptedData - Complete encrypted certificate data
   * @param {string} recipientPrivateKey - ECDSA private key of recipient
   * @returns {Buffer} - Decrypted certificate buffer
   */
  static async decryptCertificate(encryptedData, recipientPrivateKey) {
    try {
      const { encryptedCertificate, encryptedAESKey, digitalSignature, issuerKeys } = encryptedData;
      
      // Step 1: Verify digital signature
      const signatureValid = ECDSAService.verify(
        encryptedData.documentHash,
        digitalSignature.signature,
        issuerKeys.publicKey
      );
      
      if (!signatureValid) {
        throw new Error('Digital signature verification failed');
      }
      
      // Step 2: Decrypt AES key with recipient's private key
      const aesKey = ECDSAService.decrypt(encryptedAESKey, recipientPrivateKey);
      
      // Step 3: Decrypt certificate with AES key
      const decryptedBuffer = AES256Service.decryptFile(
        encryptedCertificate.data,
        aesKey,
        encryptedCertificate.iv,
        encryptedCertificate.authTag
      );
      
      // Step 4: Verify document integrity
      const encryptedBuffer = Buffer.from(encryptedCertificate.data, 'hex');
      const computedHash = SHA256Service.hashFile(encryptedBuffer);
      
      if (computedHash !== encryptedData.documentHash) {
        throw new Error('Document integrity verification failed');
      }
      
      return decryptedBuffer;
    } catch (error) {
      throw new Error(`Certificate decryption failed: ${error.message}`);
    }
  }

  /**
   * Verify certificate integrity without decryption
   * @param {Object} encryptedData - Encrypted certificate data
   * @param {string} expectedHash - Expected document hash
   * @returns {Object} - Verification result
   */
  static verifyCertificateIntegrity(encryptedData, expectedHash) {
    try {
      const { encryptedCertificate, documentHash, digitalSignature, issuerKeys } = encryptedData;
      
      // Verify document hash matches expected
      const hashMatches = documentHash === expectedHash;
      
      // Verify digital signature
      const signatureValid = ECDSAService.verify(
        documentHash,
        digitalSignature.signature,
        issuerKeys.publicKey
      );
      
      // Verify encrypted data integrity
      const encryptedBuffer = Buffer.from(encryptedCertificate.data, 'hex');
      const computedHash = SHA256Service.hashFile(encryptedBuffer);
      const integrityValid = computedHash === documentHash;
      
      return {
        isValid: hashMatches && signatureValid && integrityValid,
        checks: {
          hashMatches,
          signatureValid,
          integrityValid
        },
        documentHash,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Certificate verification failed: ${error.message}`);
    }
  }

  /**
   * Generate key pair for user
   * @param {string} userId - User ID
   * @returns {Object} - User key pair
   */
  static generateUserKeyPair(userId) {
    try {
      const keyPair = ECDSAService.generateKeyPair();
      
      return {
        userId,
        keyPairId: keyPair.keyPairId,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey, // Encrypt before storing!
        algorithm: keyPair.algorithm,
        createdAt: keyPair.createdAt,
        purpose: 'certificate-encryption'
      };
    } catch (error) {
      throw new Error(`User key pair generation failed: ${error.message}`);
    }
  }

  /**
   * Encrypt user's private key for storage
   * @param {string} privateKey - Private key to encrypt
   * @param {string} password - User's password
   * @param {string} salt - Salt for key derivation
   * @returns {Object} - Encrypted private key
   */
  static encryptPrivateKey(privateKey, password, salt) {
    try {
      // Derive encryption key from password
      const derivedKey = AES256Service.deriveKey(password, salt);
      
      // Encrypt private key
      const encrypted = AES256Service.encrypt(privateKey, derivedKey);
      
      return {
        encryptedPrivateKey: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        salt,
        algorithm: 'AES-256-GCM-PBKDF2'
      };
    } catch (error) {
      throw new Error(`Private key encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt user's private key
   * @param {Object} encryptedPrivateKey - Encrypted private key data
   * @param {string} password - User's password
   * @returns {string} - Decrypted private key
   */
  static decryptPrivateKey(encryptedPrivateKey, password) {
    try {
      const { encryptedPrivateKey: encrypted, iv, authTag, salt } = encryptedPrivateKey;
      
      // Derive decryption key from password
      const derivedKey = AES256Service.deriveKey(password, salt);
      
      // Decrypt private key
      return AES256Service.decrypt(encrypted, derivedKey, iv, authTag);
    } catch (error) {
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }

  /**
   * Create certificate verification proof
   * @param {Object} encryptedData - Encrypted certificate data
   * @returns {Object} - Verification proof for blockchain
   */
  static createVerificationProof(encryptedData) {
    try {
      const { documentHash, digitalSignature, issuerKeys, encryptionMetadata } = encryptedData;
      
      // Create proof object
      const proof = {
        documentHash,
        issuerPublicKey: issuerKeys.publicKey,
        signature: digitalSignature.signature,
        timestamp: encryptionMetadata.timestamp,
        version: encryptionMetadata.encryptionVersion
      };
      
      // Create proof hash
      const proofString = JSON.stringify(proof);
      const proofHash = SHA256Service.hash(proofString);
      
      return {
        proof,
        proofHash,
        algorithm: 'SHA-256'
      };
    } catch (error) {
      throw new Error(`Verification proof creation failed: ${error.message}`);
    }
  }

  /**
   * Batch encrypt multiple certificates
   * @param {Array<Buffer>} certificateBuffers - Array of certificate buffers
   * @param {string} recipientPublicKey - Recipient's public key
   * @returns {Array<Object>} - Array of encrypted certificates
   */
  static async batchEncryptCertificates(certificateBuffers, recipientPublicKey) {
    try {
      const results = [];
      
      for (let i = 0; i < certificateBuffers.length; i++) {
        const encrypted = await this.encryptCertificate(certificateBuffers[i], recipientPublicKey);
        results.push({
          index: i,
          ...encrypted
        });
      }
      
      // Create batch hash
      const batchHashes = results.map(r => r.documentHash);
      const batchMerkleRoot = SHA256Service.merkleRoot(batchHashes);
      
      return {
        certificates: results,
        batchInfo: {
          count: results.length,
          merkleRoot: batchMerkleRoot,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Batch encryption failed: ${error.message}`);
    }
  }
}

module.exports = EncryptionService;
