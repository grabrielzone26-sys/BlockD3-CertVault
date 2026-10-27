#!/usr/bin/env bash
source ~/.nvm/nvm.sh
cd "/mnt/d/SOFTWARE/Projects/NEW/BlockD3/blockchain technology/backend"

export FABRIC_ENV=local
export FABRIC_CONNECTION_PROFILE="../blockchain/fabric/connection-profiles/connection-org1.json"
export FABRIC_WALLET_PATH="../blockchain/fabric/wallet"
export FABRIC_IDENTITY=bridgeService
export FABRIC_CHANNEL=mychannel
export FABRIC_CHAINCODE=certificates
export FABRIC_MSP_ID=Org1MSP
export FABRIC_DISCOVERY_ENABLED=true
export FABRIC_DISCOVERY_AS_LOCALHOST=true

node -e "
const fc = require('./src/services/fabricClient');
async function test() {
  console.log('Connecting to Fabric from WSL...');
  const net = await fc.getNetworkInfo();
  console.log('Network info:', JSON.stringify(net, null, 2));
}
test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
"
