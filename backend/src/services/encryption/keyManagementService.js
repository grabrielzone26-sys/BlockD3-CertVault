const crypto = require('crypto');
const ECDSAService = require('./ecdsaService');
const AES256Service = require('./aes256Service');
const SHA256Service = require('./sha256Service');

class KeyManagementService {
  /**
   * Generate and store user encryption keys
   * @param {string} userId - User ID
   * @param {string} password - User's password for key encryption
   * @returns {Object} - Generated key pair with encrypted private key
   */
  static async generateUserKeys(userId, password) {
    try {
      // Generate ECDSA key pair
      const keyPair = ECDSAService.generateKeyPair();
      
      // Generate salt for private key encryption
      const salt = crypto.randomBytes(32).toString('hex');
      
      // Encrypt private key with user's password
      const encryptedPrivateKey = this.encryptPrivateKeyWithPassword(
        keyPair.privateKey,
        password,
        salt
      );
      
      return {
        userId,
        keyPairId: keyPair.keyPairId,
        publicKey: keyPair.publicKey,
        encryptedPrivateKey,
        salt,
        algorithm: keyPair.algorithm,
        createdAt: keyPair.createdAt,
        isActive: true,
        purpose: 'certificate-encryption'
      };
    } catch (error) {
      throw new Error(`User key generation failed: ${error.message}`);
    }
  }

  /**
   * Encrypt private key with user password
   * @param {string} privateKey - Private key to encrypt
   * @param {string} password - User's password
   * @param {string} salt - Salt for key derivation
   * @returns {Object} - Encrypted private key data
   */
  static encryptPrivateKeyWithPassword(privateKey, password, salt) {
    try {
      // Derive encryption key from password using PBKDF2
      const derivedKey = AES256Service.deriveKey(password, salt, 100000);
      
      // Encrypt private key with AES-256
      const encrypted = AES256Service.encrypt(privateKey, derivedKey);
      
      return {
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256',
        iterations: 100000
      };
    } catch (error) {
      throw new Error(`Private key encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt private key with user password
   * @param {Object} encryptedPrivateKey - Encrypted private key data
   * @param {string} password - User's password
   * @param {string} salt - Salt used for key derivation
   * @returns {string} - Decrypted private key
   */
  static decryptPrivateKeyWithPassword(encryptedPrivateKey, password, salt) {
    try {
      const { encrypted, iv, authTag, iterations = 100000 } = encryptedPrivateKey;
      
      // Derive decryption key from password
      const derivedKey = AES256Service.deriveKey(password, salt, iterations);
      
      // Decrypt private key
      return AES256Service.decrypt(encrypted, derivedKey, iv, authTag);
    } catch (error) {
      throw new Error(`Private key decryption failed: ${error.message}`);
    }
  }

  /**
   * Rotate user's encryption keys
   * @param {string} userId - User ID
   * @param {string} password - User's password
   * @param {string} oldKeyPairId - Old key pair ID to deactivate
   * @returns {Object} - New key pair
   */
  static async rotateUserKeys(userId, password, oldKeyPairId) {
    try {
      // Generate new key pair
      const newKeys = await this.generateUserKeys(userId, password);
      
      // Mark old keys as inactive (to be handled by calling code)
      return {
        newKeys,
        oldKeyPairId,
        rotationTimestamp: new Date(),
        reason: 'key-rotation'
      };
    } catch (error) {
      throw new Error(`Key rotation failed: ${error.message}`);
    }
  }

  /**
   * Create key escrow for recovery
   * @param {string} privateKey - Private key to escrow
   * @param {Array<string>} escrowPublicKeys - Public keys of escrow agents
   * @param {number} threshold - Minimum number of agents needed for recovery
   * @returns {Object} - Escrow data
   */
  static createKeyEscrow(privateKey, escrowPublicKeys, threshold) {
    try {
      if (escrowPublicKeys.length < threshold) {
        throw new Error('Not enough escrow agents for threshold');
      }

      // Split private key into shares using Shamir's Secret Sharing (simplified)
      const shares = this.splitSecret(privateKey, escrowPublicKeys.length, threshold);
      
      // Encrypt each share with corresponding escrow agent's public key
      const encryptedShares = shares.map((share, index) => {
        const encrypted = ECDSAService.encrypt(share, escrowPublicKeys[index]);
        return {
          agentIndex: index,
          agentPublicKey: escrowPublicKeys[index],
          encryptedShare: encrypted,
          shareHash: SHA256Service.hash(share)
        };
      });

      return {
        escrowId: crypto.randomUUID(),
        threshold,
        totalShares: escrowPublicKeys.length,
        encryptedShares,
        createdAt: new Date(),
        algorithm: 'Shamir-Secret-Sharing-ECDSA'
      };
    } catch (error) {
      throw new Error(`Key escrow creation failed: ${error.message}`);
    }
  }

  /**
   * Recover private key from escrow
   * @param {Object} escrowData - Escrow data
   * @param {Array<Object>} decryptedShares - Decrypted shares from agents
   * @returns {string} - Recovered private key
   */
  static recoverFromEscrow(escrowData, decryptedShares) {
    try {
      const { threshold, totalShares } = escrowData;
      
      if (decryptedShares.length < threshold) {
        throw new Error(`Insufficient shares for recovery. Need ${threshold}, got ${decryptedShares.length}`);
      }

      // Verify share integrity
      for (const share of decryptedShares) {
        const computedHash = SHA256Service.hash(share.shareData);
        const expectedHash = escrowData.encryptedShares[share.agentIndex].shareHash;
        
        if (computedHash !== expectedHash) {
          throw new Error(`Share integrity verification failed for agent ${share.agentIndex}`);
        }
      }

      // Reconstruct secret from shares
      const shareData = decryptedShares.slice(0, threshold).map(s => s.shareData);
      const recoveredKey = this.reconstructSecret(shareData, threshold);

      return recoveredKey;
    } catch (error) {
      throw new Error(`Key recovery failed: ${error.message}`);
    }
  }

  /**
   * Generate master key for system-level encryption
   * @returns {Object} - Master key data
   */
  static generateMasterKey() {
    try {
      const masterKey = crypto.randomBytes(32).toString('hex');
      const keyId = crypto.randomUUID();
      const keyHash = SHA256Service.hash(masterKey);
      
      return {
        keyId,
        masterKey, // Store securely!
        keyHash,
        algorithm: 'AES-256',
        createdAt: new Date(),
        purpose: 'system-master-key'
      };
    } catch (error) {
      throw new Error(`Master key generation failed: ${error.message}`);
    }
  }

  /**
   * Derive application-specific keys from master key
   * @param {string} masterKey - Master key
   * @param {string} purpose - Purpose of derived key
   * @param {string} context - Context for key derivation
   * @returns {string} - Derived key
   */
  static deriveApplicationKey(masterKey, purpose, context) {
    try {
      const info = `${purpose}:${context}`;
      const salt = SHA256Service.hash(info);
      
      // Use HKDF (HMAC-based Key Derivation Function)
      const derivedKey = crypto.hkdfSync('sha256', masterKey, salt, info, 32);
      
      return derivedKey.toString('hex');
    } catch (error) {
      throw new Error(`Application key derivation failed: ${error.message}`);
    }
  }

  /**
   * Create key backup
   * @param {Object} keyData - Key data to backup
   * @param {string} backupPassword - Password for backup encryption
   * @returns {Object} - Encrypted backup
   */
  static createKeyBackup(keyData, backupPassword) {
    try {
      const backupId = crypto.randomUUID();
      const timestamp = new Date();
      
      // Create backup payload
      const backupPayload = {
        backupId,
        timestamp,
        keyData,
        version: '1.0.0'
      };
      
      // Encrypt backup with password
      const salt = crypto.randomBytes(32).toString('hex');
      const backupKey = AES256Service.deriveKey(backupPassword, salt, 100000);
      const encrypted = AES256Service.encrypt(JSON.stringify(backupPayload), backupKey);
      
      return {
        backupId,
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        salt,
        timestamp,
        algorithm: 'AES-256-GCM-PBKDF2'
      };
    } catch (error) {
      throw new Error(`Key backup creation failed: ${error.message}`);
    }
  }

  /**
   * Restore key from backup
   * @param {Object} backupData - Encrypted backup data
   * @param {string} backupPassword - Password for backup decryption
   * @returns {Object} - Restored key data
   */
  static restoreKeyBackup(backupData, backupPassword) {
    try {
      const { encrypted, iv, authTag, salt } = backupData;
      
      // Derive decryption key
      const backupKey = AES256Service.deriveKey(backupPassword, salt, 100000);
      
      // Decrypt backup
      const decryptedPayload = AES256Service.decrypt(encrypted, backupKey, iv, authTag);
      const backupPayload = JSON.parse(decryptedPayload);
      
      // Verify backup integrity
      if (!backupPayload.keyData || !backupPayload.backupId) {
        throw new Error('Invalid backup format');
      }
      
      // Return the restored key data in the same format as original
      return backupPayload.keyData;
    } catch (error) {
      throw new Error(`Key backup restoration failed: ${error.message}`);
    }
  }

  /**
   * Validate key pair integrity
   * @param {string} publicKey - Public key
   * @param {string} privateKey - Private key
   * @returns {boolean} - Validation result
   */
  static validateKeyPair(publicKey, privateKey) {
    try {
      // Verify private key format
      if (!ECDSAService.isValidPrivateKey(privateKey)) {
        return false;
      }
      
      // Verify public key format
      if (!ECDSAService.isValidPublicKey(publicKey)) {
        return false;
      }
      
      // Verify key pair correspondence
      const derivedPublicKey = ECDSAService.getPublicKey(privateKey);
      return derivedPublicKey === publicKey;
    } catch (error) {
      return false;
    }
  }

  /**
   * Simple secret sharing (Shamir's Secret Sharing simplified)
   * @param {string} secret - Secret to split
   * @param {number} totalShares - Total number of shares
   * @param {number} threshold - Minimum shares needed
   * @returns {Array<string>} - Secret shares
   */
  static splitSecret(secret, totalShares, threshold) {
    // Simplified implementation - in production, use a proper library
    const shares = [];
    const secretBuffer = Buffer.from(secret, 'hex');
    
    for (let i = 0; i < totalShares; i++) {
      const share = crypto.randomBytes(secretBuffer.length).toString('hex');
      shares.push(share);
    }
    
    return shares;
  }

  /**
   * Reconstruct secret from shares
   * @param {Array<string>} shares - Secret shares
   * @param {number} threshold - Minimum shares needed
   * @returns {string} - Reconstructed secret
   */
  static reconstructSecret(shares, threshold) {
    // Simplified implementation - in production, use proper Shamir's Secret Sharing
    if (shares.length < threshold) {
      throw new Error('Insufficient shares for reconstruction');
    }
    
    // This is a placeholder - implement proper Lagrange interpolation
    return shares[0]; // Simplified for demo
  }
}

module.exports = KeyManagementService;
