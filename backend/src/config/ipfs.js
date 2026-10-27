const { create } = require('ipfs-http-client');

// IPFS Gateway configurations
const IPFS_GATEWAYS = [
    process.env.IPFS_GATEWAY_URL || 'http://127.0.0.1:8080/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.infura.io/ipfs/'
];

// IPFS Node configurations
const IPFS_NODES = [
    process.env.IPFS_API_URL || 'http://127.0.0.1:5001/api/v0',
];
if (process.env.INFURA_PROJECT_ID) {
    IPFS_NODES.push('https://ipfs.infura.io:5001/api/v0');
}

// Retry configuration
const RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000
};

// Timeout configuration
const TIMEOUT_OPTIONS = {
    timeout: 30000 // 30 seconds
};

class IPFSService {
    constructor() {
        this.ipfs = null;
        this.currentNodeIndex = 0;
        this.enabled = process.env.IPFS_ENABLED === 'true';
        if (this.enabled) {
            this.initialize();
        } else {
            console.log('IPFS client disabled for local development');
        }
    }

    async initialize() {
        if (!this.enabled) {
            return;
        }

        while (this.currentNodeIndex < IPFS_NODES.length && !this.ipfs) {
            try {
                this.ipfs = create({
                    url: IPFS_NODES[this.currentNodeIndex],
                    ...TIMEOUT_OPTIONS
                });
                console.log('IPFS client initialized with node:', IPFS_NODES[this.currentNodeIndex]);
                break;
            } catch (error) {
                console.warn(`Failed to initialize IPFS with node ${this.currentNodeIndex}:`, error.message);
                this.currentNodeIndex++;
            }
        }

        if (!this.ipfs) {
            console.error('Failed to initialize IPFS with all available nodes');
        }
    }

    async uploadWithRetry(fileBuffer) {
        if (!this.enabled) {
            throw new Error('IPFS is disabled');
        }

        let lastError;
        for (let attempt = 0; attempt < RETRY_OPTIONS.maxRetries; attempt++) {
            try {
                if (!this.ipfs) {
                    await this.initialize();
                    if (!this.ipfs) throw new Error('No IPFS client available');
                }

                const result = await this.ipfs.add(fileBuffer);
                return result.path;
            } catch (error) {
                lastError = error;
                console.warn(`IPFS upload attempt ${attempt + 1} failed:`, error.message);
                
                // Wait before retrying
                const delay = Math.min(
                    RETRY_OPTIONS.initialDelayMs * Math.pow(2, attempt),
                    RETRY_OPTIONS.maxDelayMs
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Try to reinitialize with next node
                this.currentNodeIndex = (this.currentNodeIndex + 1) % IPFS_NODES.length;
                await this.initialize();
            }
        }
        throw new Error(`Failed to upload to IPFS after ${RETRY_OPTIONS.maxRetries} attempts: ${lastError.message}`);
    }

    async downloadWithRetry(ipfsHash) {
        if (!this.enabled) {
            throw new Error('IPFS is disabled');
        }

        let lastError;
        for (let attempt = 0; attempt < RETRY_OPTIONS.maxRetries; attempt++) {
            try {
                if (!this.ipfs) {
                    await this.initialize();
                    if (!this.ipfs) throw new Error('No IPFS client available');
                }

                const chunks = [];
                for await (const chunk of this.ipfs.cat(ipfsHash)) {
                    chunks.push(chunk);
                }
                return Buffer.concat(chunks);
            } catch (error) {
                lastError = error;
                console.warn(`IPFS download attempt ${attempt + 1} failed:`, error.message);
                
                // Wait before retrying
                const delay = Math.min(
                    RETRY_OPTIONS.initialDelayMs * Math.pow(2, attempt),
                    RETRY_OPTIONS.maxDelayMs
                );
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Try to reinitialize with next node
                this.currentNodeIndex = (this.currentNodeIndex + 1) % IPFS_NODES.length;
                await this.initialize();
            }
        }
        throw new Error(`Failed to download from IPFS after ${RETRY_OPTIONS.maxRetries} attempts: ${lastError.message}`);
    }

    getGateways() {
        return IPFS_GATEWAYS;
    }
}

module.exports = new IPFSService();
