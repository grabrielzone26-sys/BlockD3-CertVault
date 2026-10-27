#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_TEST_NETWORK_DIR="${FABRIC_TEST_NETWORK_DIR:-/home/phiri/fabric-samples/test-network}"

cd "$FABRIC_TEST_NETWORK_DIR"

CHAINCODE_SRC="${CC_BUILD_DIR:-${CC_WORK_BASE:-$HOME/.blockd3}/blockchain-certificates-chaincode}"
rm -rf "$CHAINCODE_SRC"
mkdir -p "$CHAINCODE_SRC"
cp -R "$REPO_ROOT/blockchain/fabric/chaincode/certificates/." "$CHAINCODE_SRC"
rm -f "$CHAINCODE_SRC/package-lock.json"
cat > "$CHAINCODE_SRC/.npmrc" <<'EOF'
workspaces=false
registry=https://registry.npmjs.org/
fetch-retries=5
fetch-retry-mintimeout=20000
fetch-retry-maxtimeout=120000
fetch-timeout=300000
EOF
cat > "$CHAINCODE_SRC/build.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cp -R /chaincode/input/src/. /chaincode/output
EOF
chmod +x "$CHAINCODE_SRC/build.sh"

./network.sh deployCC \
  -ccn certificates \
  -ccp "$CHAINCODE_SRC" \
  -ccl javascript \
  -c mychannel
