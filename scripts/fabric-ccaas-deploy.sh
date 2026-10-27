#!/usr/bin/env bash
#
# Deploy the `certificates` chaincode as a Chaincode-as-a-Service (CCaaS).
#
# Why this exists:
#   The host Docker engine (29.x) is too new for the Fabric 2.5 peer's built-in
#   image builder, so `peer lifecycle chaincode install` of a plain `node`
#   package fails with "docker build failed: ... docker.sock: write: broken pipe".
#   CCaaS avoids the peer-side build entirely: we build and run the chaincode as
#   a gRPC server container ourselves, and the peer just connects to it via the
#   ccaas external builder that already ships with the test-network peer image.
#
# Result: identical channel/chaincode name/version semantics as the classic
#   deploy, so the backend and connection profile need no changes.
set -euo pipefail

FABRIC_TEST_NETWORK_DIR="${FABRIC_TEST_NETWORK_DIR:-/home/phiri/fabric-samples/test-network}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CHANNEL="mychannel"
CC_NAME="certificates"
CC_LABEL_BASE="certificates"
CC_IMAGE="blockd3-certificates-ccaas:latest"
CC_CONTAINER="certificates_ccaas"
CC_NET="fabric_test"
CC_PORT="9999"
CC_ADDRESS="${CC_CONTAINER}:${CC_PORT}"

CC_SRC="${REPO_ROOT}/blockchain/fabric/chaincode/certificates"
WORK_BASE="${CC_WORK_BASE:-$HOME/.blockd3}"
BUILD_DIR="${WORK_BASE}/ccaas-build"
PKG_DIR="${WORK_BASE}/ccaas-package"

log() { printf '[ccaas-deploy] %s\n' "$*"; }

cd "$FABRIC_TEST_NETWORK_DIR"
export PATH="$PWD/../bin:$PATH"
export FABRIC_CFG_PATH="$PWD/../config"
export FABRIC_LOGGING_SPEC=INFO
# Variables referenced by the test-network helper scripts; must exist under `set -u`.
export OVERRIDE_ORG=""
export VERBOSE=false
export BFT=false
# shellcheck disable=SC1091
. ./scripts/envVar.sh

# ---------------------------------------------------------------------------
# 1) Determine the next lifecycle sequence + version (matches manual script)
# ---------------------------------------------------------------------------
setGlobals 1
CURRENT_SEQUENCE=$(peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME" 2>/dev/null \
  | sed -n 's/^Version: .* Sequence: \([0-9][0-9]*\),.*/\1/p' | head -n 1 || true)
if [ -n "$CURRENT_SEQUENCE" ]; then
  CC_SEQUENCE=$((CURRENT_SEQUENCE + 1))
else
  CC_SEQUENCE=1
fi
CC_VERSION="1.0.${CC_SEQUENCE}"
CC_LABEL="${CC_LABEL_BASE}_${CC_VERSION}"
log "Deploying ${CC_NAME} version ${CC_VERSION} sequence ${CC_SEQUENCE} as CCaaS"

# ---------------------------------------------------------------------------
# 2) Build the chaincode server image (this build path works on Docker 29)
# ---------------------------------------------------------------------------
log "Building chaincode server image ${CC_IMAGE}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp -R "$CC_SRC/." "$BUILD_DIR/"
rm -f "$BUILD_DIR/package-lock.json"
rm -rf "$BUILD_DIR/node_modules"

cat > "$BUILD_DIR/Dockerfile" <<'DOCKER'
FROM hyperledger/fabric-nodeenv:2.5
WORKDIR /usr/src/app
COPY . /usr/src/app
RUN npm install --production
# CHAINCODE_ID is injected at run time (must equal the installed package id).
CMD ./node_modules/.bin/fabric-chaincode-node server \
      --chaincode-address="0.0.0.0:9999" \
      --chaincode-id="$CHAINCODE_ID"
DOCKER

DOCKER_BUILDKIT=0 docker build -t "$CC_IMAGE" "$BUILD_DIR"

# ---------------------------------------------------------------------------
# 3) Build the CCaaS package (metadata.json + code.tar.gz{connection.json})
# ---------------------------------------------------------------------------
log "Building CCaaS package"
rm -rf "$PKG_DIR" "${CC_LABEL}.tar.gz"
mkdir -p "$PKG_DIR/src"

cat > "$PKG_DIR/src/connection.json" <<EOF
{
  "address": "${CC_ADDRESS}",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

cat > "$PKG_DIR/metadata.json" <<EOF
{"type":"ccaas","label":"${CC_LABEL}"}
EOF

tar -C "$PKG_DIR/src" -czf "$PKG_DIR/code.tar.gz" connection.json
tar -C "$PKG_DIR" -czf "${CC_LABEL}.tar.gz" metadata.json code.tar.gz

# ---------------------------------------------------------------------------
# 4) Install on both peers and resolve the package id
# ---------------------------------------------------------------------------
setGlobals 1
log "Installing package on org1"
peer lifecycle chaincode install "${CC_LABEL}.tar.gz"

setGlobals 2
log "Installing package on org2"
peer lifecycle chaincode install "${CC_LABEL}.tar.gz"

setGlobals 1
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled \
  | sed -n "s/^Package ID: \\([^,]*\\), Label: ${CC_LABEL}\$/\\1/p" | head -n 1)
if [ -z "$PACKAGE_ID" ]; then
  echo "Failed to resolve package id for ${CC_LABEL}" >&2
  exit 1
fi
log "Package ID: ${PACKAGE_ID}"

# ---------------------------------------------------------------------------
# 5) (Re)start the chaincode server container with that package id
# ---------------------------------------------------------------------------
log "Starting chaincode container ${CC_CONTAINER}"
docker rm -f "$CC_CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$CC_CONTAINER" \
  --network "$CC_NET" \
  --restart unless-stopped \
  -e CHAINCODE_ID="$PACKAGE_ID" \
  -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:${CC_PORT}" \
  "$CC_IMAGE" >/dev/null

# Give the server a moment to come up before peers try to connect at commit.
sleep 4
if ! docker ps --filter "name=^/${CC_CONTAINER}$" --filter "status=running" | grep -q "$CC_CONTAINER"; then
  echo "Chaincode container ${CC_CONTAINER} is not running:" >&2
  docker logs --tail 30 "$CC_CONTAINER" >&2 || true
  exit 1
fi

# ---------------------------------------------------------------------------
# 6) Approve for both orgs and commit
# ---------------------------------------------------------------------------
approve_for_org() {
  local ORG="$1"
  setGlobals "$ORG"
  peer lifecycle chaincode approveformyorg \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls --cafile "$ORDERER_CA" \
    --channelID "$CHANNEL" --name "$CC_NAME" \
    --version "$CC_VERSION" --package-id "$PACKAGE_ID" \
    --sequence "$CC_SEQUENCE"
}

log "Approving for org1"
approve_for_org 1
log "Approving for org2"
approve_for_org 2

log "Committing chaincode definition"
setGlobals 1
peer lifecycle chaincode commit \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "$ORDERER_CA" \
  --channelID "$CHANNEL" --name "$CC_NAME" \
  --peerAddresses localhost:7051 --tlsRootCertFiles "$PEER0_ORG1_CA" \
  --peerAddresses localhost:9051 --tlsRootCertFiles "$PEER0_ORG2_CA" \
  --version "$CC_VERSION" --sequence "$CC_SEQUENCE"

log "Committed. Querying committed definition:"
peer lifecycle chaincode querycommitted --channelID "$CHANNEL" --name "$CC_NAME"
log "CCaaS deploy complete."
