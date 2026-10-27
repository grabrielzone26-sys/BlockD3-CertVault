#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi
APP_USER="${LOCAL_APP_USER:-$(id -un)}"
DFX_BIN="${DFX_BIN:-/home/${APP_USER}/.local/share/dfx/bin/dfx}"
FABRIC_TEST_NETWORK_DIR="${FABRIC_TEST_NETWORK_DIR:-/home/phiri/fabric-samples/test-network}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICP_DIR="${REPO_ROOT}/blockchain/icp"
PROJECT_SCRIPTS_DIR="${REPO_ROOT}/scripts"
BACKEND_DIR="${REPO_ROOT}/backend"
BACKEND_ENV_FILE="${BACKEND_DIR}/.env"
BACKEND_BRIDGE_IDENTITY_FILE="${BACKEND_DIR}/.icp-bridge-identity.json"
RUNTIME_DIR="${REPO_ROOT}/.runtime"
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"
IPFS_LOG="${APP_HOME}/.ipfs/daemon.log"
DFX_START_LOG="${RUNTIME_DIR}/dfx-start.log"
REQUIRED_FABRIC_CONTAINERS=(
  "ca_org1"
  "ca_org2"
  "ca_orderer"
  "peer0.org1.example.com"
  "peer0.org2.example.com"
  "orderer.example.com"
)

log() {
  printf '[start-local] %s\n' "$*"
}

run_as_app_user() {
  local command="$1"
  if [ "$(id -un)" = "$APP_USER" ]; then
    bash -lc "$command"
  else
    su - "$APP_USER" -s /bin/bash -c "$command"
  fi
}

repair_dfx_runtime() {
  log "Refreshing local dfx/PocketIC runtime state"
  mkdir -p "${RUNTIME_DIR}"
  run_as_app_user "'${DFX_BIN}' cache install" >/dev/null 2>&1 || true
  run_as_app_user "pkill -f '${DFX_BIN}'" >/dev/null 2>&1 || true
  run_as_app_user "pkill -f '/home/${APP_USER}/.cache/dfinity/versions/.*/pocket-ic'" >/dev/null 2>&1 || true
  run_as_app_user "rm -rf '${APP_HOME}/.cache/dfinity/pocket-ic'" >/dev/null 2>&1 || true
  run_as_app_user "rm -rf '${APP_HOME}/.local/share/dfx/network/local'" >/dev/null 2>&1 || true
  run_as_app_user "rm -rf '${ICP_DIR}/.dfx/network/local'" >/dev/null 2>&1 || true
}

has_stale_icp_runtime() {
  [ -f "${ICP_DIR}/.dfx/network/local/pocket-ic-pid" ] || [ -f "${ICP_DIR}/.dfx/network/local/pocket-ic-port" ]
}

run_dfx_start() {
  local start_args="$1"
  mkdir -p "${RUNTIME_DIR}"
  : > "${DFX_START_LOG}"

  if run_as_app_user "cd '${ICP_DIR}' && timeout 90s '${DFX_BIN}' start ${start_args}" >"${DFX_START_LOG}" 2>&1; then
    cat "${DFX_START_LOG}"
    return 0
  fi

  cat "${DFX_START_LOG}" >&2
  return 1
}

get_bridge_principal() {
  if [ ! -f "${BACKEND_BRIDGE_IDENTITY_FILE}" ]; then
    return 1
  fi

  (
    cd "${BACKEND_DIR}"
    node -e '
const fs = require("fs");
const { Ed25519KeyIdentity } = require("@dfinity/identity");
const identityJson = fs.readFileSync(process.argv[1], "utf8").trim();
const parsed = JSON.parse(identityJson);
const serialized = Array.isArray(parsed)
  ? JSON.stringify(parsed)
  : JSON.stringify(parsed.identity || parsed);
const identity = Ed25519KeyIdentity.fromJSON(serialized);
process.stdout.write(identity.getPrincipal().toText());
' "${BACKEND_BRIDGE_IDENTITY_FILE}"
  )
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local escaped_value

  mkdir -p "$(dirname "$file")"
  touch "$file"
  escaped_value="${value//\\/\\\\}"
  escaped_value="${escaped_value//&/\\&}"
  escaped_value="${escaped_value//|/\\|}"

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${escaped_value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

wait_for_http_post() {
  local url="$1"
  local attempts="${2:-20}"
  local delay="${3:-2}"
  local i
  for ((i = 1; i <= attempts; i += 1)); do
    if curl -fsS -X POST "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

wait_for_http_get() {
  local url="$1"
  local attempts="${2:-20}"
  local delay="${3:-2}"
  local i
  for ((i = 1; i <= attempts; i += 1)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

container_exists() {
  local name="$1"
  docker ps -aq --filter "name=^/${name}$" | grep -q .
}

container_running() {
  local name="$1"
  docker ps -q --filter "name=^/${name}$" | grep -q .
}

start_mongodb() {
  log "Ensuring MongoDB is running"
  if pgrep -x mongod >/dev/null 2>&1; then
    return 0
  fi

  mkdir -p "/home/${APP_USER}/mongodb_data"
  run_as_app_user "mongod --dbpath '/home/${APP_USER}/mongodb_data' --logpath '/home/${APP_USER}/mongod.log' --fork >/dev/null 2>&1" || true

  sleep 2

  if ! pgrep -x mongod >/dev/null 2>&1; then
    log "MongoDB did not start automatically"
    return 1
  fi
}

start_ipfs() {
  log "Ensuring Kubo/IPFS daemon is running"
  if curl -fsS -X POST http://127.0.0.1:5001/api/v0/version >/dev/null 2>&1; then
    return 0
  fi

  run_as_app_user "pkill -f 'ipfs daemon'" >/dev/null 2>&1 || true
  sleep 2
  run_as_app_user "nohup ipfs daemon > '${IPFS_LOG}' 2>&1 < /dev/null &"

  wait_for_http_post "http://127.0.0.1:5001/api/v0/version" 30 2
}

start_icp() {
  local attempt
  local start_args
  log "Ensuring local ICP replica is running"
  if curl -fsS http://127.0.0.1:4943/api/v2/status >/dev/null 2>&1; then
    return 0
  fi

  if has_stale_icp_runtime; then
    log "Detected stale local ICP runtime state; forcing a PocketIC cleanup"
    repair_dfx_runtime
  fi

  for attempt in 1 2 3; do
    run_as_app_user "cd '${ICP_DIR}' && timeout 20s '${DFX_BIN}' stop" >/dev/null 2>&1 || true
    start_args="--background --clean"
    if [ "$attempt" -gt 1 ]; then
      repair_dfx_runtime
    fi

    if run_dfx_start "${start_args}"; then
      if wait_for_http_get "http://127.0.0.1:4943/api/v2/status" 30 2; then
        return 0
      fi
    fi

    log "ICP replica start attempt ${attempt} did not become healthy"
  done

  log "Final dfx start output captured in ${DFX_START_LOG}"
  return 1
}

ensure_icp_canister() {
  local admin_principal
  local bridge_principal
  local canister_id
  local windows_bridge_identity_file

  log "Ensuring local ICP canister is deployed and configured"

  if ! run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' canister call cert_registry getAdmin" >/dev/null 2>&1; then
    admin_principal="$(run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' identity get-principal")"
    log "Deploying cert_registry canister"
    if ! run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' deploy cert_registry --yes --argument '(principal \"${admin_principal}\")'"; then
      log "ICP canister mapping is stale; restarting local replica clean and redeploying"
      repair_dfx_runtime
      run_dfx_start "--background --clean"
      wait_for_http_get "http://127.0.0.1:4943/api/v2/status" 30 2
      run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' deploy cert_registry --yes --mode reinstall --argument '(principal \"${admin_principal}\")'"
    fi
  fi

  if [ ! -f "${BACKEND_BRIDGE_IDENTITY_FILE}" ]; then
    log "Generating ICP bridge identity"
    (cd "${BACKEND_DIR}" && node scripts/generateIcpBridgeIdentity.js "${BACKEND_BRIDGE_IDENTITY_FILE}")
  fi

  bridge_principal="$(get_bridge_principal)"
  if [ -z "${bridge_principal}" ]; then
    log "Unable to resolve bridge principal from ${BACKEND_BRIDGE_IDENTITY_FILE}"
    return 1
  fi

  if ! run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' canister call cert_registry setBridgePrincipal '(principal \"${bridge_principal}\")'" >/dev/null 2>&1; then
    admin_principal="$(run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' identity get-principal")"
    log "Resetting local ICP canister state to recover admin/controller ownership"
    repair_dfx_runtime
    run_dfx_start "--background --clean"
    wait_for_http_get "http://127.0.0.1:4943/api/v2/status" 30 2
    rm -f "${ICP_DIR}/canister_ids.json" "${ICP_DIR}/.dfx/local/canister_ids.json"
    run_as_app_user "rm -f '${APP_HOME}/.config/dfx/identity/default/wallets.json'"
    run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' deploy cert_registry --yes --mode reinstall --argument '(principal \"${admin_principal}\")'"
    run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' canister call cert_registry setBridgePrincipal '(principal \"${bridge_principal}\")'" >/dev/null
  fi

  canister_id="$(run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' canister id cert_registry")"
  windows_bridge_identity_file="$(wslpath -w "${BACKEND_BRIDGE_IDENTITY_FILE}" | tr -d '\r')"

  set_env_value "${BACKEND_ENV_FILE}" "ICP_HOST" "http://127.0.0.1:4943"
  set_env_value "${BACKEND_ENV_FILE}" "ICP_CANISTER_ID" "${canister_id}"
  set_env_value "${BACKEND_ENV_FILE}" "ICP_FETCH_ROOT_KEY" "true"
  set_env_value "${BACKEND_ENV_FILE}" "ICP_BRIDGE_IDENTITY_FILE" "${windows_bridge_identity_file}"
}

apply_restart_policy() {
  local ids=()
  local name
  for name in "${REQUIRED_FABRIC_CONTAINERS[@]}"; do
    if container_exists "$name"; then
      ids+=("$(docker ps -aq --filter "name=^/${name}$")")
    fi
  done

  while IFS= read -r line; do
    [ -n "$line" ] && ids+=("$line")
  done < <(docker ps -aq --filter "name=dev-peer0.org1.example.com-certificates" --filter "name=dev-peer0.org2.example.com-certificates")

  if [ "${#ids[@]}" -gt 0 ]; then
    docker update --restart unless-stopped "${ids[@]}" >/dev/null
  fi
}

start_fabric() {
  log "Ensuring Fabric network is running"
  local missing=0
  local name
  for name in "${REQUIRED_FABRIC_CONTAINERS[@]}"; do
    if ! container_exists "$name"; then
      missing=1
      break
    fi
  done

  if [ "$missing" -eq 1 ]; then
    log "Fabric containers do not exist yet, bootstrapping the network"
    # A fresh bootstrap wipes the channel, so any previous chaincode-as-a-service
    # container is stale; drop it so ensure_fabric_chaincode redeploys cleanly.
    docker rm -f certificates_ccaas >/dev/null 2>&1 || true
    bash "${PROJECT_SCRIPTS_DIR}/fabric-bootstrap.sh"
  else
    local stopped=()
    for name in "${REQUIRED_FABRIC_CONTAINERS[@]}"; do
      if ! container_running "$name"; then
        stopped+=("$name")
      fi
    done

    if [ "${#stopped[@]}" -gt 0 ]; then
      docker start "${stopped[@]}" >/dev/null
    fi
  fi

  apply_restart_policy
}

ensure_fabric_chaincode() {
  log "Ensuring certificates chaincode (CCaaS) is deployed"
  # The chaincode runs as a service container (CCaaS) instead of being built by
  # the peer, because the host Docker engine is too new for the Fabric 2.5 peer's
  # built-in image builder. See scripts/fabric-ccaas-deploy.sh for details.
  if docker ps -a --format '{{.Names}}' | grep -q '^certificates_ccaas$'; then
    if ! docker ps --format '{{.Names}}' | grep -q '^certificates_ccaas$'; then
      log "Starting existing chaincode service container"
      docker start certificates_ccaas >/dev/null 2>&1 || true
    fi
  else
    log "Chaincode service not deployed yet; running CCaaS deploy"
    bash "${PROJECT_SCRIPTS_DIR}/fabric-ccaas-deploy.sh"
  fi
}

print_summary() {
  log "Local infrastructure ready"
  log "Fabric containers:"
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'ca_|peer0|orderer|dev-peer0|certificates_ccaas' || true
  log "MongoDB: $(pgrep -x mongod >/dev/null 2>&1 && echo running || echo stopped)"
  log "ICP replica: $(curl -fsS http://127.0.0.1:4943/api/v2/status >/dev/null 2>&1 && echo running || echo stopped)"
  log "IPFS API: $(curl -fsS -X POST http://127.0.0.1:5001/api/v0/version >/dev/null 2>&1 && echo running || echo stopped)"
}

start_fabric
ensure_fabric_chaincode
start_mongodb
start_ipfs
start_icp
ensure_icp_canister
print_summary
