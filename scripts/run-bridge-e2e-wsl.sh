#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICP_DIR="$REPO_ROOT/blockchain/icp"
BACKEND_DIR="$REPO_ROOT/backend"
APP_USER="${LOCAL_APP_USER:-$(id -un)}"
DFX="${DFX_BIN:-/home/${APP_USER}/.local/share/dfx/bin/dfx}"

cd "$ICP_DIR"
$DFX stop || true
$DFX start --background --clean
sleep 5
ADMIN="$($DFX identity get-principal)"
$DFX deploy cert_registry --yes --mode reinstall --argument "(principal \"$ADMIN\")"
BRIDGE_PRINCIPAL="$(
  cd "$BACKEND_DIR"
  node -e '
const fs = require("fs");
const { Ed25519KeyIdentity } = require("@dfinity/identity");
const identityJson = fs.readFileSync(process.argv[1], "utf8").trim();
const parsed = JSON.parse(identityJson);
const serialized = Array.isArray(parsed) ? JSON.stringify(parsed) : JSON.stringify(parsed.identity || parsed);
process.stdout.write(Ed25519KeyIdentity.fromJSON(serialized).getPrincipal().toText());
' "$BACKEND_DIR/.icp-bridge-identity.json"
)"
$DFX canister call cert_registry setBridgePrincipal "(principal \"$BRIDGE_PRINCIPAL\")"

CANISTER_ID="$($DFX canister id cert_registry)"

cd "$BACKEND_DIR"
FABRIC_CONNECTION_PROFILE="$REPO_ROOT/blockchain/fabric/connection-profiles/connection-org1.json" \
FABRIC_WALLET_PATH="$REPO_ROOT/blockchain/fabric/wallet" \
FABRIC_IDENTITY="bridgeService" \
FABRIC_CHANNEL="mychannel" \
FABRIC_CHAINCODE="certificates" \
FABRIC_DISCOVERY_ENABLED=true \
FABRIC_DISCOVERY_AS_LOCALHOST=true \
ICP_HOST="http://127.0.0.1:4943" \
ICP_CANISTER_ID="$CANISTER_ID" \
ICP_FETCH_ROOT_KEY=true \
ICP_BRIDGE_IDENTITY_FILE="$REPO_ROOT/backend/.icp-bridge-identity.json" \
node scripts/testFabricIcpBridge.js
