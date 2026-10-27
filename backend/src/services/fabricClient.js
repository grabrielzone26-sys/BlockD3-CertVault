const fs = require('fs');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');

let cachedConnection = null;
const backendRoot = path.resolve(__dirname, '../..');

const resolvePath = (value) => {
  if (!value) {
    return null;
  }

  return path.isAbsolute(value) ? value : path.resolve(backendRoot, value);
};

const getFabricConfig = () => {
  const connectionProfilePath = resolvePath(process.env.FABRIC_CONNECTION_PROFILE);
  const walletPath = resolvePath(process.env.FABRIC_WALLET_PATH);

  return {
    connectionProfilePath,
    walletPath,
    identity: process.env.FABRIC_IDENTITY || 'appUser',
    channelName: process.env.FABRIC_CHANNEL || 'mychannel',
    chaincodeName: process.env.FABRIC_CHAINCODE || 'certificates',
    gatewayDiscoveryEnabled: process.env.FABRIC_DISCOVERY_ENABLED !== 'false',
    gatewayDiscoveryAsLocalhost: process.env.FABRIC_DISCOVERY_AS_LOCALHOST !== 'false',
    mspId: process.env.FABRIC_MSP_ID || '',
  };
};

const getConnectionProfile = (connectionProfilePath) => {
  if (!connectionProfilePath) {
    throw new Error('FABRIC_CONNECTION_PROFILE is not set');
  }

  return JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
};

const promiseTimeout = (ms, promise) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Blockchain connection timeout. Please ensure your local Hyperledger Fabric network/Docker containers are running.'));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

const connect = async () => {
  const config = getFabricConfig();

  if (cachedConnection) {
    const sameConfig = Object.entries(config).every(([key, value]) => cachedConnection.config[key] === value);
    if (sameConfig) {
      return cachedConnection;
    }

    await cachedConnection.gateway.disconnect();
    cachedConnection = null;
  }

  if (!config.walletPath) {
    throw new Error('FABRIC_WALLET_PATH is not set');
  }

  const ccp = getConnectionProfile(config.connectionProfilePath);
  const wallet = await Wallets.newFileSystemWallet(config.walletPath);
  const identity = await wallet.get(config.identity);

  if (!identity) {
    throw new Error(`Fabric identity "${config.identity}" not found in wallet`);
  }

  const gateway = new Gateway();
  await promiseTimeout(6000, gateway.connect(ccp, {
    wallet,
    identity: config.identity,
    discovery: {
      enabled: config.gatewayDiscoveryEnabled,
      asLocalhost: config.gatewayDiscoveryAsLocalhost,
    },
  }));

  const network = await gateway.getNetwork(config.channelName);
  const contract = network.getContract(config.chaincodeName);

  cachedConnection = {
    config,
    gateway,
    network,
    contract,
  };

  return cachedConnection;
};

const parseBuffer = (buffer) => {
  if (!buffer || buffer.length === 0) {
    return null;
  }

  const text = buffer.toString('utf8');
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
};

const serializePayload = (payload) => JSON.stringify(payload);

const issueCertificate = async (payload) => {
  const { contract } = await connect();
  const result = await contract.submitTransaction('IssueCertificate', serializePayload(payload));
  return {
    ok: true,
    value: parseBuffer(result),
  };
};

const revokeCertificate = async ({ certificateId, reason }) => {
  const { contract } = await connect();
  const result = await contract.submitTransaction('RevokeCertificate', certificateId, reason || '');
  return {
    ok: true,
    value: parseBuffer(result),
  };
};

const verifyCertificate = async ({ certificateId, documentHash }) => {
  const { contract } = await connect();
  const result = await contract.evaluateTransaction('VerifyCertificate', certificateId, documentHash || '');
  return parseBuffer(result);
};

const getCertificate = async ({ certificateId }) => {
  const { contract } = await connect();
  const result = await contract.evaluateTransaction('GetCertificate', certificateId);
  return parseBuffer(result);
};

let lastNetworkCheckTime = 0;
let lastNetworkCheckResult = null;

const getNetworkInfo = async () => {
  const now = Date.now();
  if (lastNetworkCheckResult && (now - lastNetworkCheckTime < 15000)) {
    return lastNetworkCheckResult;
  }

  const config = getFabricConfig();
  let connected = false;
  let status = 'connected';
  let errorMsg = null;

  try {
    await promiseTimeout(2000, connect());
    connected = true;
  } catch (error) {
    status = 'offline';
    errorMsg = error.message;
  }

  lastNetworkCheckResult = {
    connected,
    status,
    channelName: config.channelName,
    chaincodeName: config.chaincodeName,
    identity: config.identity,
    walletPath: config.walletPath,
    connectionProfilePath: config.connectionProfilePath,
    mspId: config.mspId,
    error: errorMsg,
  };
  lastNetworkCheckTime = now;

  return lastNetworkCheckResult;
};

const disconnectFabric = async () => {
  if (cachedConnection) {
    await cachedConnection.gateway.disconnect();
    cachedConnection = null;
  }
};

module.exports = {
  connect,
  parseBuffer,
  issueCertificate,
  revokeCertificate,
  verifyCertificate,
  getCertificate,
  getNetworkInfo,
  disconnectFabric,
};
