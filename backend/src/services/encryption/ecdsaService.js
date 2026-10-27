const crypto = require('crypto');
const EC = require('elliptic').ec;
const secp256k1 = require('secp256k1');

// Initialize elliptic curve (secp256k1)
const ec = new EC('secp256k1');

class ECDSAService {
  /**
   * Generate ECDSA key pair
   * @returns {Object} - Key pair with public and private keys
   */
  static generateKeyPair() {
    try {
      const keyPair = ec.genKeyPair();
      
      return {
        privateKey: keyPair.getPrivate('hex'),
        publicKey: keyPair.getPublic('hex'),
        keyPairId: crypto.randomUUID(),
        algorithm: 'ECDSA-secp256k1',
        createdAt: new Date()
      };
    } catch (error) {
      throw new Error(`ECDSA key pair generation failed: ${error.message}`);
    }
  }

  /**
   * Sign data with private key
   * @param {string} data - Data to sign
   * @param {string} privateKey - Private key in hex format
   * @returns {Object} - Signature object
   */
  static sign(data, privateKey) {
    try {
      // Hash the data first
      const hash = crypto.createHash('sha256').update(data).digest();
      
      // Create signature
      const signature = secp256k1.ecdsaSign(hash, Buffer.from(privateKey, 'hex'));
      
      return {
        signature: Buffer.from(signature.signature).toString('hex'),
        recovery: signature.recovery,
        hash: hash.toString('hex'),
        algorithm: 'ECDSA-secp256k1'
      };
    } catch (error) {
      throw new Error(`ECDSA signing failed: ${error.message}`);
    }
  }

  /**
   * Verify signature with public key
   * @param {string} data - Original data
   * @param {string} signature - Signature in hex format
   * @param {string} publicKey - Public key in hex format
   * @returns {boolean} - Verification result
   */
  static verify(data, signature, publicKey) {
    try {
      // Hash the data
      const hash = crypto.createHash('sha256').update(data).digest();
      
      // Verify signature
      const pubKeyBuffer = Buffer.from(publicKey, 'hex');
      const sigBuffer = Buffer.from(signature, 'hex');
      
      return secp256k1.ecdsaVerify(sigBuffer, hash, pubKeyBuffer);
    } catch (error) {
      throw new Error(`ECDSA verification failed: ${error.message}`);
    }
  }

  /**
   * Encrypt data with public key (ECIES)
   * @param {string} data - Data to encrypt
   * @param {string} publicKey - Public key in hex format
   * @returns {Object} - Encrypted data
   */
  static encrypt(data, publicKey) {
    try {
      // Generate ephemeral key pair
      const ephemeralKeyPair = ec.genKeyPair();
      
      // Get public key point
      const pubKeyPoint = ec.keyFromPublic(publicKey, 'hex').getPublic();
      
      // Compute shared secret
      const sharedSecret = ephemeralKeyPair.derive(pubKeyPoint);
      const sharedSecretHex = sharedSecret.toString(16).padStart(64, '0');
      
      // Derive encryption key from shared secret
      const encryptionKey = crypto.createHash('sha256')
        .update(Buffer.from(sharedSecretHex, 'hex'))
        .digest('hex');
      
      // Encrypt data with AES-256
      const AES256Service = require('./aes256Service');
      const encrypted = AES256Service.encrypt(data, encryptionKey);
      
      return {
        ephemeralPublicKey: ephemeralKeyPair.getPublic('hex'),
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        algorithm: 'ECIES-secp256k1-AES256'
      };
    } catch (error) {
      throw new Error(`ECDSA encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data with private key (ECIES)
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} privateKey - Private key in hex format
   * @returns {string} - Decrypted data
   */
  static decrypt(encryptedData, privateKey) {
    try {
      const { ephemeralPublicKey, encrypted, iv, authTag } = encryptedData;
      
      // Get private key
      const privKey = ec.keyFromPrivate(privateKey, 'hex');
      
      // Get ephemeral public key point
      const ephemeralPubKeyPoint = ec.keyFromPublic(ephemeralPublicKey, 'hex').getPublic();
      
      // Compute shared secret
      const sharedSecret = privKey.derive(ephemeralPubKeyPoint);
      const sharedSecretHex = sharedSecret.toString(16).padStart(64, '0');
      
      // Derive decryption key from shared secret
      const decryptionKey = crypto.createHash('sha256')
        .update(Buffer.from(sharedSecretHex, 'hex'))
        .digest('hex');
      
      // Decrypt data with AES-256
      const AES256Service = require('./aes256Service');
      return AES256Service.decrypt(encrypted, decryptionKey, iv, authTag);
    } catch (error) {
      throw new Error(`ECDSA decryption failed: ${error.message}`);
    }
  }

  /**
   * Derive public key from private key
   * @param {string} privateKey - Private key in hex format
   * @returns {string} - Public key in hex format
   */
  static getPublicKey(privateKey) {
    try {
      const keyPair = ec.keyFromPrivate(privateKey, 'hex');
      return keyPair.getPublic('hex');
    } catch (error) {
      throw new Error(`Public key derivation failed: ${error.message}`);
    }
  }

  /**
   * Validate private key format
   * @param {string} privateKey - Private key to validate
   * @returns {boolean} - Validation result
   */
  static isValidPrivateKey(privateKey) {
    try {
      const keyBuffer = Buffer.from(privateKey, 'hex');
      return secp256k1.privateKeyVerify(keyBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate public key format
   * @param {string} publicKey - Public key to validate
   * @returns {boolean} - Validation result
   */
  static isValidPublicKey(publicKey) {
    try {
      const keyBuffer = Buffer.from(publicKey, 'hex');
      return secp256k1.publicKeyVerify(keyBuffer);
    } catch (error) {
      return false;
    }
  }

  /**
   * Compress public key
   * @param {string} publicKey - Uncompressed public key
   * @returns {string} - Compressed public key
   */
  static compressPublicKey(publicKey) {
    try {
      const keyPoint = ec.keyFromPublic(publicKey, 'hex').getPublic();
      return keyPoint.encode('hex', true);
    } catch (error) {
      throw new Error(`Public key compression failed: ${error.message}`);
    }
  }

  /**
   * Decompress public key
   * @param {string} compressedPublicKey - Compressed public key
   * @returns {string} - Uncompressed public key
   */
  static decompressPublicKey(compressedPublicKey) {
    try {
      const keyPoint = ec.keyFromPublic(compressedPublicKey, 'hex').getPublic();
      return keyPoint.encode('hex', false);
    } catch (error) {
      throw new Error(`Public key decompression failed: ${error.message}`);
    }
  }
}

module.exports = ECDSAService;
