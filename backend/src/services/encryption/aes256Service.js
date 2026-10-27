const crypto = require('crypto');

class AES256Service {
  /**
   * Encrypt data using AES-256-GCM (Authenticated Encryption)
   * @param {string|Buffer} data - Data to encrypt
   * @param {string|Buffer} key - 32-byte encryption key
   * @returns {Object} - Encrypted data with IV, authTag, and algorithm
   */
  static encrypt(data, key) {
    try {
      // 12-byte initialization vector standard for AES-256-GCM
      const iv = crypto.randomBytes(12);
      
      // Ensure key is a Buffer and correct length (32 bytes for AES-256)
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      if (keyBuffer.length !== 32) {
        throw new Error('Key must be 32 bytes for AES-256');
      }
      
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag,
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      throw new Error(`AES-256-GCM encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM (with automatic fallback to legacy CBC)
   * @param {string} encryptedData - Hex-encoded encrypted data
   * @param {string|Buffer} key - 32-byte decryption key
   * @param {string} iv - Hex-encoded initialization vector
   * @param {string} authTag - Hex-encoded authentication tag
   * @returns {string} - Decrypted data
   */
  static decrypt(encryptedData, key, iv, authTag) {
    try {
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      if (keyBuffer.length !== 32) {
        throw new Error('Key must be 32 bytes for AES-256');
      }
      const ivBuffer = Buffer.from(iv, 'hex');

      // Backwards compatibility fallback for legacy AES-256-CBC with HMAC-SHA256 (64 hex chars)
      if (ivBuffer.length === 16 && authTag && authTag.length === 64) {
        const hmac = crypto.createHmac('sha256', keyBuffer);
        hmac.update(encryptedData + iv);
        const calculatedTag = hmac.digest('hex');
        if (calculatedTag !== authTag) {
          throw new Error('Authentication tag verification failed');
        }
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }

      // Modern AES-256-GCM
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      }
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error(`AES-256 decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a random 32-byte AES-256 key
   * @returns {string} - Hex-encoded 32-byte key
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Derive a key from a password using PBKDF2
   * @param {string} password - Password to derive key from
   * @param {string} salt - Salt for key derivation
   * @param {number} iterations - Number of iterations (default: 100000)
   * @returns {string} - Hex-encoded derived key
   */
  static deriveKey(password, salt, iterations = 100000) {
    return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  }

  /**
   * Encrypt a file buffer using AES-256-GCM
   * @param {Buffer} fileBuffer - File buffer to encrypt
   * @param {string} key - Encryption key
   * @returns {Object} - Encrypted file data
   */
  static encryptFile(fileBuffer, key) {
    try {
      const iv = crypto.randomBytes(12);
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      if (keyBuffer.length !== 32) {
        throw new Error('Key must be 32 bytes for AES-256');
      }
      
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
      const authTag = cipher.getAuthTag().toString('hex');
      
      return {
        encrypted: encrypted.toString('hex'),
        iv: iv.toString('hex'),
        authTag,
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      throw new Error(`File encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a file buffer using AES-256-GCM (with automatic fallback to legacy CBC)
   * @param {string} encryptedData - Hex-encoded encrypted file data
   * @param {string} key - Decryption key
   * @param {string} iv - Initialization vector
   * @param {string} authTag - Authentication tag
   * @returns {Buffer} - Decrypted file buffer
   */
  static decryptFile(encryptedData, key, iv, authTag) {
    try {
      const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
      if (keyBuffer.length !== 32) {
        throw new Error('Key must be 32 bytes for AES-256');
      }
      
      const encryptedBuffer = Buffer.from(encryptedData, 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      
      // Fallback check for legacy CBC files
      if (ivBuffer.length === 16 && authTag && authTag.length === 64) {
        const hmac = crypto.createHmac('sha256', keyBuffer);
        hmac.update(encryptedBuffer);
        hmac.update(ivBuffer);
        const calculatedTag = hmac.digest('hex');
        if (calculatedTag !== authTag) {
          throw new Error('File authentication tag verification failed');
        }
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
        return Buffer.concat([
          decipher.update(encryptedBuffer),
          decipher.final()
        ]);
      }
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
      if (authTag) {
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      }
      
      return Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);
    } catch (error) {
      throw new Error(`File decryption failed: ${error.message}`);
    }
  }
}

module.exports = AES256Service;
