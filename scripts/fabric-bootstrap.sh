#!/usr/bin/env bash
set -euo pipefail

FABRIC_TEST_NETWORK_DIR="${FABRIC_TEST_NETWORK_DIR:-/home/phiri/fabric-samples/test-network}"

cd "$FABRIC_TEST_NETWORK_DIR"

./network.sh down || true

for name in ca_org1 ca_org2 ca_orderer peer0.org1.example.com peer0.org2.example.com orderer.example.com; do
  docker rm -f "$name" >/dev/null 2>&1 || true
done

for vol in $(docker volume ls -q | grep -E '^(compose_|docker_)' || true); do
  docker volume rm -f "$vol" >/dev/null 2>&1 || true
done

rm -rf organizations/peerOrganizations organizations/ordererOrganizations channel-artifacts .cdb
mkdir -p channel-artifacts

./network.sh up createChannel -ca -c mychannel
