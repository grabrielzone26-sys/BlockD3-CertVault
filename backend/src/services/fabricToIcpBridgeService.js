const { connect, parseBuffer, disconnectFabric } = require('./fabricClient');
const IcpCertificateAnchorService = require('./icpCertificateAnchorService');

class FabricToIcpBridgeService {
  constructor() {
    this.icpService = new IcpCertificateAnchorService();
    this.listener = null;
    this.started = false;
    this.starting = false;
    this.eventName = process.env.FABRIC_CERTIFICATE_ISSUED_EVENT || 'CertificateIssued';
    this.enabled = process.env.BRIDGE_ENABLED !== 'false';
    this.maxRetries = Number(process.env.BRIDGE_MAX_RETRIES || 3);
    this.retryDelayMs = Number(process.env.BRIDGE_RETRY_DELAY_MS || 5000);
    this.startupMaxRetries = Number(process.env.BRIDGE_STARTUP_MAX_RETRIES || 5);
    this.startupRetryDelayMs = Number(process.env.BRIDGE_STARTUP_RETRY_DELAY_MS || 4000);
    this.bridgePrincipal = null;
    this.lastSuccessAt = null;
    this.lastFailureAt = null;
    this.lastError = null;
    this.retryQueue = new Map();
    this.startRetryTimer = null;
    this.startAttempt = 0;
  }

  getStatus() {
    return {
      enabled: this.enabled,
      started: this.started,
      eventName: this.eventName,
      bridgePrincipal: this.bridgePrincipal,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      lastError: this.lastError,
      queuedRetries: this.retryQueue.size,
      maxRetries: this.maxRetries,
      retryDelayMs: this.retryDelayMs,
      starting: this.starting,
      startupAttempt: this.startAttempt,
      startupMaxRetries: this.startupMaxRetries,
      startupRetryDelayMs: this.startupRetryDelayMs,
    };
  }

  getRetryKey(certificateId, documentHash) {
    return `${certificateId}:${documentHash}`;
  }

  clearRetry(key) {
    const queued = this.retryQueue.get(key);
    if (queued?.timer) {
      clearTimeout(queued.timer);
    }
    this.retryQueue.delete(key);
  }

  clearStartupRetry() {
    if (this.startRetryTimer) {
      clearTimeout(this.startRetryTimer);
      this.startRetryTimer = null;
    }
  }

  async processAnchor(certificateId, documentHash, attempt = 0) {
    const key = this.getRetryKey(certificateId, documentHash);

    // Check if certificate is already anchored on ICP to prevent duplicate transactions on startup replay
    try {
      const isAlreadyAnchored = await this.icpService.verifyCertificate(certificateId, documentHash).catch(() => false);
      if (isAlreadyAnchored) {
        const Certificate = require('../models/Certificate');
        await Certificate.updateOne(
          { certificateId },
          { $set: { bridge_status: 'anchored' } }
        ).catch(() => {});
        this.clearRetry(key);
        return;
      }
    } catch (checkErr) {
      // If verification query fails, continue to normal anchor attempt
    }

    try {
      await this.icpService.anchorCertificate(certificateId, documentHash);
      this.lastSuccessAt = new Date().toISOString();
      this.lastError = null;
      this.clearRetry(key);
      console.log(
        `Anchored certificate ${certificateId} to ICP canister ${this.icpService.config.canisterId}`,
      );

      // Update MongoDB state to anchored
      const Certificate = require('../models/Certificate');
      await Certificate.updateOne(
        { certificateId },
        { $set: { bridge_status: 'anchored' } }
      ).catch(dbErr => console.error(`Failed to update bridge_status in MongoDB for ${certificateId}:`, dbErr.message));
    } catch (error) {
      this.lastFailureAt = new Date().toISOString();
      this.lastError = error.message;

      if (attempt >= this.maxRetries) {
        console.error(
          `Failed to anchor certificate ${certificateId} after ${attempt + 1} attempt(s): ${error.message}`,
        );

        // Update MongoDB state to failed
        const Certificate = require('../models/Certificate');
        await Certificate.updateOne(
          { certificateId },
          { $set: { bridge_status: 'failed' } }
        ).catch(dbErr => console.error(`Failed to set bridge_status to failed in MongoDB for ${certificateId}:`, dbErr.message));

        this.clearRetry(key);
        throw error;
      }

      const timer = setTimeout(() => {
        this.processAnchor(certificateId, documentHash, attempt + 1).catch((retryError) => {
          console.error(`Retry anchor failed for ${certificateId}: ${retryError.message}`);
        });
      }, this.retryDelayMs);

      this.retryQueue.set(key, {
        certificateId,
        documentHash,
        attempt: attempt + 1,
        timer,
        scheduledAt: new Date().toISOString(),
      });

      console.warn(
        `Anchor failed for ${certificateId}. Retrying attempt ${attempt + 2}/${this.maxRetries + 1} in ${this.retryDelayMs}ms: ${error.message}`,
      );
    }
  }

  async start() {
    if (this.started || this.starting || !this.enabled) {
      return;
    }

    this.starting = true;

    try {
      const { contract } = await connect();
      await this.icpService.initialize();

      this.listener = async (event) => {
        if (event.eventName !== this.eventName) {
          return;
        }

        const payload = parseBuffer(event.payload) || {};
        const certificateId = payload.certificateId || payload.id;
        const documentHash = payload.documentHash || payload.hash;

        if (!certificateId || !documentHash) {
          console.warn('Skipping Fabric event with incomplete payload:', payload);
          return;
        }

        await this.processAnchor(certificateId, documentHash);
      };

      await contract.addContractListener(this.listener);
      this.started = true;
      this.startAttempt = 0;
      this.lastError = null;
      this.clearStartupRetry();

      const bridgePrincipal = await this.icpService.getConfiguredBridgePrincipal();
      this.bridgePrincipal = bridgePrincipal;
      console.log(
        `Fabric to ICP bridge listening for ${this.eventName}. Bridge principal: ${bridgePrincipal}`,
      );
    } catch (error) {
      this.lastFailureAt = new Date().toISOString();
      this.lastError = error.message;
      this.listener = null;
      await disconnectFabric().catch(() => {});

      if (this.startAttempt >= this.startupMaxRetries) {
        throw error;
      }

      this.startAttempt += 1;
      const nextAttempt = this.startAttempt + 1;
      console.warn(
        `Fabric to ICP bridge start failed. Retrying attempt ${nextAttempt}/${this.startupMaxRetries + 1} in ${this.startupRetryDelayMs}ms: ${error.message}`,
      );

      this.clearStartupRetry();
      this.startRetryTimer = setTimeout(() => {
        this.start().catch((retryError) => {
          console.error('Fabric to ICP bridge failed to start:', retryError.message);
        });
      }, this.startupRetryDelayMs);
    } finally {
      this.starting = false;
    }
  }

  async stop() {
    this.clearStartupRetry();
    this.starting = false;
    this.startAttempt = 0;

    if (!this.started) {
      return;
    }

    const { contract } = await connect();
    if (this.listener) {
      contract.removeContractListener(this.listener);
    }

    Array.from(this.retryQueue.keys()).forEach((key) => this.clearRetry(key));
    await disconnectFabric();
    this.listener = null;
    this.started = false;
  }
}

module.exports = new FabricToIcpBridgeService();
