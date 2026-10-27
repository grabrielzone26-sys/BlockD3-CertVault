const fs = require('fs');
const path = require('path');
const { HttpAgent, Actor } = require('@dfinity/agent');
const { Ed25519KeyIdentity } = require('@dfinity/identity');

const backendRoot = path.resolve(__dirname, '../..');

const resolvePath = (value) => {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value) ? value : path.resolve(backendRoot, value);
};

const idlFactory = ({ IDL: localIDL }) =>
  localIDL.Service({
    anchorCertificate: localIDL.Func([localIDL.Text, localIDL.Text], [localIDL.Bool], []),
    verifyCertificate: localIDL.Func([localIDL.Text, localIDL.Text], [localIDL.Bool], ['query']),
    getBridgePrincipal: localIDL.Func([], [localIDL.Opt(localIDL.Principal)], ['query']),
  });

class IcpCertificateAnchorService {
  constructor() {
    this.actor = null;
    this.agent = null;
    this.identity = null;
    this.config = {
      host: process.env.ICP_HOST || 'http://127.0.0.1:4943',
      canisterId: process.env.ICP_CANISTER_ID || '',
      identityFile: resolvePath(process.env.ICP_BRIDGE_IDENTITY_FILE || ''),
      fetchRootKey: process.env.ICP_FETCH_ROOT_KEY !== 'false',
    };
  }

  loadIdentity() {
    if (this.identity) {
      return this.identity;
    }

    if (!this.config.identityFile) {
      throw new Error('ICP_BRIDGE_IDENTITY_FILE is not set');
    }

    const identityContents = fs.readFileSync(this.config.identityFile, 'utf8').trim();
    const parsedIdentity = JSON.parse(identityContents);
    const serializedIdentity = Array.isArray(parsedIdentity)
      ? JSON.stringify(parsedIdentity)
      : JSON.stringify(parsedIdentity.identity || parsedIdentity);

    this.identity = Ed25519KeyIdentity.fromJSON(serializedIdentity);
    return this.identity;
  }

  async initialize() {
    if (this.actor) {
      return this.actor;
    }

    if (!this.config.canisterId) {
      throw new Error('ICP_CANISTER_ID is not set');
    }

    const identity = this.loadIdentity();

    this.agent = new HttpAgent({
      host: this.config.host,
      identity,
    });

    if (this.config.fetchRootKey) {
      await this.agent.fetchRootKey();
    }

    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: this.config.canisterId,
    });

    return this.actor;
  }

  async anchorCertificate(certificateId, documentHash) {
    const actor = await this.initialize();
    return actor.anchorCertificate(certificateId, documentHash);
  }

  async verifyCertificate(certificateId, documentHash) {
    const actor = await this.initialize();
    return actor.verifyCertificate(certificateId, documentHash);
  }

  async getConfiguredBridgePrincipal() {
    const identity = this.loadIdentity();
    return identity.getPrincipal().toText();
  }
}

module.exports = IcpCertificateAnchorService;
