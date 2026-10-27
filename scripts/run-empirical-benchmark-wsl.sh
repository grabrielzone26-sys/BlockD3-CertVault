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
export NODE_PATH="/mnt/d/SOFTWARE/Projects/NEW/BlockD3/blockchain technology/backend/node_modules:/mnt/d/SOFTWARE/Projects/NEW/BlockD3/blockchain technology/frontend/node_modules"

node ../scripts/benchmark-empirical-suite.js
