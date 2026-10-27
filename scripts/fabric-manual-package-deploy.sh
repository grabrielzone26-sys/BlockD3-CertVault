#!/usr/bin/env bash
set -euo pipefail

# Scratch build directories. These used to be hardcoded under /root, which only
# worked when Fabric ran as the root WSL user. They now default to the current
# user's home so the deploy works for any app user (e.g. phiri), and can still be
# overridden via CC_BUILD_DIR / CC_PKG_DIR.
CC_WORK_BASE="${CC_WORK_BASE:-$HOME/.blockd3}"
ROOT_CC="${CC_BUILD_DIR:-$CC_WORK_BASE/blockchain-certificates-manual}"
PKG_DIR="${CC_PKG_DIR:-$CC_WORK_BASE/blockchain-certificates-package}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_TEST_NETWORK_DIR="${FABRIC_TEST_NETWORK_DIR:-/home/phiri/fabric-samples/test-network}"
LABEL=""
CHANNEL="mychannel"
CC_NAME="certificates"
CC_VERSION=""
CC_SEQUENCE=""

cd "$FABRIC_TEST_NETWORK_DIR"
export PATH="$PWD/../bin:$PATH"
export FABRIC_CFG_PATH="$PWD/../config"
export OVERRIDE_ORG=""
export VERBOSE=false
export BFT=false
export FABRIC_LOGGING_SPEC=INFO

. ./scripts/envVar.sh

setGlobals 1
CURRENT_SEQUENCE=$(peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" 2>/dev/null | sed -n 's/^Version: .* Sequence: \([0-9][0-9]*\),.*/\1/p' | head -n 1 || true)
if [ -n "$CURRENT_SEQUENCE" ]; then
  CC_SEQUENCE=$((CURRENT_SEQUENCE + 1))
else
  CC_SEQUENCE="1"
fi
CC_VERSION="1.0.${CC_SEQUENCE}"
LABEL="certificates_${CC_VERSION}"

rm -rf "$ROOT_CC" "$PKG_DIR" "$LABEL.tar.gz"
mkdir -p "$ROOT_CC/src" "$PKG_DIR"

cp -R "$REPO_ROOT/blockchain/fabric/chaincode/certificates/." "$ROOT_CC/src"
rm -f "$ROOT_CC/src/package-lock.json"

cat > "$ROOT_CC/build.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
cp -R /chaincode/input/src/. /chaincode/output
EOF
chmod +x "$ROOT_CC/build.sh"

cat > "$PKG_DIR/metadata.json" <<EOF
{"path":"","type":"node","label":"$LABEL"}
EOF

tar -C "$ROOT_CC" -czf "$PKG_DIR/code.tar.gz" .
tar -C "$PKG_DIR" -czf "$LABEL.tar.gz" metadata.json code.tar.gz

peer lifecycle chaincode install "$LABEL.tar.gz"
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | sed -n "s/^Package ID: \\([^,]*\\), Label: $LABEL$/\\1/p")

if [ -z "$PACKAGE_ID" ]; then
  echo "Failed to resolve package id for $LABEL" >&2
  exit 1
fi

approve_for_org() {
  local ORG="$1"
  setGlobals "$ORG"
  peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL" \
    --name "$CC_NAME" \
    --version "$CC_VERSION" \
    --package-id "$PACKAGE_ID" \
    --sequence "$CC_SEQUENCE"
}

approve_for_org 1

setGlobals 2
peer lifecycle chaincode install "$LABEL.tar.gz"
approve_for_org 2

setGlobals 1
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "$ORDERER_CA" \
  --channelID "$CHANNEL" \
  --name "$CC_NAME" \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "$PEER0_ORG1_CA" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "$PEER0_ORG2_CA" \
  --version "$CC_VERSION" \
  --sequence "$CC_SEQUENCE"

peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME"
