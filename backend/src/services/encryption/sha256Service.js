const crypto = require('crypto');

class SHA256Service {
  /**
   * Generate SHA-256 hash of data
   * @param {string|Buffer} data - Data to hash
   * @returns {string} - Hex-encoded SHA-256 hash
   */
  static hash(data) {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      throw new Error(`SHA-256 hashing failed: ${error.message}`);
    }
  }

  /**
   * Generate SHA-256 hash of a file buffer
   * @param {Buffer} fileBuffer - File buffer to hash
   * @returns {string} - Hex-encoded SHA-256 hash
   */
  static hashFile(fileBuffer) {
    try {
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      throw new Error(`File hashing failed: ${error.message}`);
    }
  }

  /**
   * Generate SHA-256 hash with salt
   * @param {string} data - Data to hash
   * @param {string} salt - Salt to add
   * @returns {string} - Hex-encoded SHA-256 hash
   */
  static hashWithSalt(data, salt) {
    try {
      return crypto.createHash('sha256').update(data + salt).digest('hex');
    } catch (error) {
      throw new Error(`Salted hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify data against hash
   * @param {string|Buffer} data - Original data
   * @param {string} hash - Hash to verify against
   * @returns {boolean} - Verification result
   */
  static verify(data, hash) {
    try {
      const computedHash = this.hash(data);
      return computedHash === hash;
    } catch (error) {
      throw new Error(`Hash verification failed: ${error.message}`);
    }
  }

  /**
   * Generate HMAC-SHA256
   * @param {string} data - Data to authenticate
   * @param {string} key - Secret key
   * @returns {string} - Hex-encoded HMAC
   */
  static hmac(data, key) {
    try {
      return crypto.createHmac('sha256', key).update(data).digest('hex');
    } catch (error) {
      throw new Error(`HMAC generation failed: ${error.message}`);
    }
  }

  /**
   * Verify HMAC-SHA256
   * @param {string} data - Original data
   * @param {string} key - Secret key
   * @param {string} hmac - HMAC to verify
   * @returns {boolean} - Verification result
   */
  static verifyHmac(data, key, hmac) {
    try {
      const computedHmac = this.hmac(data, key);
      return crypto.timingSafeEqual(
        Buffer.from(computedHmac, 'hex'),
        Buffer.from(hmac, 'hex')
      );
    } catch (error) {
      throw new Error(`HMAC verification failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple rounds of SHA-256 (for key stretching)
   * @param {string} data - Data to hash
   * @param {number} rounds - Number of rounds (default: 1000)
   * @returns {string} - Hex-encoded hash after multiple rounds
   */
  static multiRoundHash(data, rounds = 1000) {
    try {
      let hash = data;
      for (let i = 0; i < rounds; i++) {
        hash = this.hash(hash);
      }
      return hash;
    } catch (error) {
      throw new Error(`Multi-round hashing failed: ${error.message}`);
    }
  }

  /**
   * Generate Merkle tree root hash
   * @param {Array<string>} hashes - Array of hashes
   * @returns {string} - Merkle root hash
   */
  static merkleRoot(hashes) {
    try {
      if (hashes.length === 0) {
        throw new Error('Cannot compute Merkle root of empty array');
      }

      if (hashes.length === 1) {
        return hashes[0];
      }

      const nextLevel = [];
      
      // Process pairs of hashes
      for (let i = 0; i < hashes.length; i += 2) {
        const left = hashes[i];
        const right = i + 1 < hashes.length ? hashes[i + 1] : left; // Duplicate if odd number
        const combined = this.hash(left + right);
        nextLevel.push(combined);
      }

      // Recursively compute the next level
      return this.merkleRoot(nextLevel);
    } catch (error) {
      throw new Error(`Merkle root computation failed: ${error.message}`);
    }
  }

  /**
   * Generate hash chain (blockchain-style)
   * @param {Array<string>} data - Array of data to chain
   * @param {string} previousHash - Previous hash in chain (optional)
   * @returns {Array<Object>} - Array of hash chain objects
   */
  static hashChain(data, previousHash = '0') {
    try {
      const chain = [];
      let prevHash = previousHash;

      for (let i = 0; i < data.length; i++) {
        const currentData = data[i];
        const timestamp = Date.now();
        const blockData = `${prevHash}${currentData}${timestamp}`;
        const currentHash = this.hash(blockData);

        chain.push({
          index: i,
          data: currentData,
          timestamp,
          previousHash: prevHash,
          hash: currentHash
        });

        prevHash = currentHash;
      }

      return chain;
    } catch (error) {
      throw new Error(`Hash chain generation failed: ${error.message}`);
    }
  }

  /**
   * Verify hash chain integrity
   * @param {Array<Object>} chain - Hash chain to verify
   * @returns {boolean} - Chain validity
   */
  static verifyHashChain(chain) {
    try {
      for (let i = 0; i < chain.length; i++) {
        const block = chain[i];
        const { data, timestamp, previousHash, hash } = block;
        
        // Recompute hash
        const blockData = `${previousHash}${data}${timestamp}`;
        const computedHash = this.hash(blockData);
        
        // Verify hash matches
        if (computedHash !== hash) {
          return false;
        }
        
        // Verify previous hash linkage (except for first block)
        if (i > 0 && previousHash !== chain[i - 1].hash) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      throw new Error(`Hash chain verification failed: ${error.message}`);
    }
  }

  /**
   * Generate proof of work hash (with nonce)
   * @param {string} data - Data to hash
   * @param {number} difficulty - Number of leading zeros required
   * @returns {Object} - Hash with nonce and proof
   */
  static proofOfWork(data, difficulty = 4) {
    try {
      const target = '0'.repeat(difficulty);
      let nonce = 0;
      let hash;

      do {
        const input = `${data}${nonce}`;
        hash = this.hash(input);
        nonce++;
      } while (!hash.startsWith(target));

      return {
        hash,
        nonce: nonce - 1,
        difficulty,
        target
      };
    } catch (error) {
      throw new Error(`Proof of work failed: ${error.message}`);
    }
  }

  /**
   * Verify proof of work
   * @param {string} data - Original data
   * @param {number} nonce - Nonce used
   * @param {string} hash - Hash to verify
   * @param {number} difficulty - Required difficulty
   * @returns {boolean} - Verification result
   */
  static verifyProofOfWork(data, nonce, hash, difficulty) {
    try {
      const input = `${data}${nonce}`;
      const computedHash = this.hash(input);
      const target = '0'.repeat(difficulty);
      
      return computedHash === hash && hash.startsWith(target);
    } catch (error) {
      throw new Error(`Proof of work verification failed: ${error.message}`);
    }
  }
}

module.exports = SHA256Service;
