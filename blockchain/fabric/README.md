# Hyperledger Fabric Notes

This folder contains the Fabric-side assets for the certificate application.

Expected local setup:
- a running Fabric network in Ubuntu
- a connection profile JSON file exposed to the backend
- a wallet directory containing the backend identity

Backend variables:
- `FABRIC_CONNECTION_PROFILE`
- `FABRIC_WALLET_PATH`
- `FABRIC_IDENTITY`
- `FABRIC_CHANNEL`
- `FABRIC_CHAINCODE`

Chaincode source:
- `chaincode/certificates/`
