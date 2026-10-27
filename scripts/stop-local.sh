#!/usr/bin/env bash
set -euo pipefail

STOP_FABRIC=0
STOP_MONGO=0
APP_USER="${LOCAL_APP_USER:-$(id -un)}"
DFX_BIN="${DFX_BIN:-/home/${APP_USER}/.local/share/dfx/bin/dfx}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICP_DIR="${REPO_ROOT}/blockchain/icp"

for arg in "$@"; do
  case "$arg" in
    --with-fabric)
      STOP_FABRIC=1
      ;;
    --with-mongo)
      STOP_MONGO=1
      ;;
    *)
      printf '[stop-local] Unknown option: %s\n' "$arg" >&2
      exit 1
      ;;
  esac
done

log() {
  printf '[stop-local] %s\n' "$*"
}

run_as_app_user() {
  local command="$1"
  if [ "$(id -un)" = "$APP_USER" ]; then
    bash -lc "$command"
  else
    su - "$APP_USER" -s /bin/bash -c "$command"
  fi
}

log "Stopping local ICP replica"
run_as_app_user "cd '${ICP_DIR}' && '${DFX_BIN}' stop" >/dev/null 2>&1 || true

log "Stopping Kubo/IPFS daemon"
run_as_app_user "pkill -f 'ipfs daemon'" >/dev/null 2>&1 || true

if [ "$STOP_FABRIC" -eq 1 ]; then
  log "Stopping Fabric containers"
  docker stop ca_org1 ca_org2 ca_orderer peer0.org1.example.com peer0.org2.example.com orderer.example.com >/dev/null 2>&1 || true
  docker ps -q --filter "name=dev-peer0.org1.example.com-certificates" --filter "name=dev-peer0.org2.example.com-certificates" | xargs -r docker stop >/dev/null 2>&1 || true
fi

if [ "$STOP_MONGO" -eq 1 ]; then
  log "Stopping MongoDB"
  if command -v systemctl >/dev/null 2>&1; then
    systemctl stop mongod >/dev/null 2>&1 || true
  fi
  if pgrep -x mongod >/dev/null 2>&1 && command -v service >/dev/null 2>&1; then
    service mongod stop >/dev/null 2>&1 || true
  fi
fi

log "Done"
