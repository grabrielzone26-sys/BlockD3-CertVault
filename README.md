# BlockD3 CertVault: Secure Hybrid Blockchain Architecture for Academic Credential Verification

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23687666.svg)](https://doi.org/10.5281/zenodo.23687666)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Fabric v2.5](https://img.shields.io/badge/Hyperledger_Fabric-v2.5-orange.svg)](https://www.hyperledger.org/use/fabric)
[![ICP](https://img.shields.io/badge/Internet_Computer-DFX_Canister-purple.svg)](https://internetcomputer.org/)

BlockD3 CertVault is a five-layer hybrid blockchain architecture designed to eliminate educational credential fraud. It integrates **Hyperledger Fabric** for permissioned lifecycle management (issuance, revocation, role-based auditing) with public cryptographic anchoring on the **Internet Computer Protocol (ICP)** and AES-256-GCM encrypted IPFS storage.

This repository serves as the official open-source artifact and replication package for the research paper, containing:
- **Backend & Event Bridge**: Node.js/Express + Mongoose + Fabric-to-ICP event-driven bridge (`backend/`)
- **Frontend Verification Portal**: React multi-path verification supporting direct QR scanning, UUID lookup, and binary SHA-256 hash checks (`frontend/`)
- **Permissioned Chaincode**: Hyperledger Fabric chaincode contracts in `blockchain/fabric/chaincode/certificates/`
- **Public Anchoring Canister**: Motoko canister in `blockchain/icp/src/cert_registry/`
- **Empirical Benchmarking Harness**: Multi-run concurrency benchmarks with 95% confidence intervals and tail percentiles (`scripts/generate_multirun_benchmark.py`, `scripts/benchmark-empirical-suite.js`)
- **Baseline Survey Dataset**: Anonymized Zambian credential verification survey instrument and raw response data ($n = 362$) in `data/`
- **System Automation**: Cross-platform startup scripts in `scripts/start-local.ps1` and `scripts/start-local.sh`

## 1) Prerequisites

### Windows host
- Node.js + npm
- PowerShell
- WSL2 with Ubuntu

### WSL (Ubuntu)
- Hyperledger Fabric binaries and Docker images installed
- ICP SDK (`dfx`) installed
- MongoDB service (`mongod`) installed and enabled
- Docker access for the current user or `sudo`

## 2) Install Dependencies

From repo root:

```powershell
npm run install:all
```

This installs:
- `backend/`
- `frontend/`
- `blockchain/fabric/chaincode/certificates/`

## 3) Configure Environment

### Existing configured PC

If this repo is already working on your current PC, keep `backend/.env` as-is. It contains local paths, generated canister IDs, and identity locations for this machine.

Do not delete or regenerate these files unless you intentionally want to reset local blockchain state:

```text
backend/.env
backend/.icp-bridge-identity.json
blockchain/fabric/wallet/
blockchain/fabric/wallet-material/
blockchain/icp/canister_ids.json
```

### New PC setup

On another PC, create a local env file from the portable template:

```powershell
Copy-Item backend\.env.example backend\.env
```

The template uses repo-relative paths:

```env
FABRIC_CONNECTION_PROFILE=../blockchain/fabric/connection-profiles/connection-org1.json
FABRIC_WALLET_PATH=../blockchain/fabric/wallet
ICP_BRIDGE_IDENTITY_FILE=.icp-bridge-identity.json
```

The startup script updates local generated values such as `MONGODB_URI`, `ICP_CANISTER_ID`, and `ICP_BRIDGE_IDENTITY_FILE` when it deploys the local ICP canister.

Set a real secret before using authentication:

```env
JWT_SECRET=replace-with-a-long-random-secret
```

Optional values such as `GOOGLE_CLIENT_ID` can stay empty unless Google login is being used.

### Manual environment reference

Edit `backend/.env`:

```env
PORT=5000
FABRIC_ENV=local
FABRIC_CONNECTION_PROFILE=../blockchain/fabric/connection-profiles/connection-org1.json
FABRIC_WALLET_PATH=../blockchain/fabric/wallet
FABRIC_IDENTITY=bridgeService
FABRIC_CHANNEL=mychannel
FABRIC_CHAINCODE=certificates
FABRIC_DISCOVERY_ENABLED=true
FABRIC_DISCOVERY_AS_LOCALHOST=true
FABRIC_CERTIFICATE_ISSUED_EVENT=CertificateIssued
BRIDGE_ENABLED=true
ICP_HOST=http://127.0.0.1:4943
ICP_CANISTER_ID=<local-canister-id>
ICP_FETCH_ROOT_KEY=true
ICP_BRIDGE_IDENTITY_FILE=.icp-bridge-identity.json
```

### MongoDB URI

If MongoDB runs in WSL, update `MONGODB_URI` to use the current WSL IP:

```powershell
wsl -d Ubuntu -u root -- bash -lc "/bin/hostname -I | tr -s ' ' | cut -d' ' -f1"
```

Then set, or let `scripts/start-local.sh` update it:

```env
MONGODB_URI=mongodb://<wsl-ip>:27017/certificate-verification
```

## 4) Start the App Stack

Run from the repo root:

```powershell
npm run local:start
```

This script:
- detects the repo path automatically
- detects the default WSL app user unless `-AppUser` is supplied
- starts MongoDB in WSL
- starts IPFS/Kubo in WSL
- starts or bootstraps the Fabric test network
- starts the local ICP replica
- deploys/configures the local ICP canister
- updates `MONGODB_URI`
- updates local ICP env values
- starts backend
- starts frontend

If your WSL distro or Linux username is different, pass them explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1 -WslDistro Ubuntu -AppUser your-linux-user
```

If Fabric samples are not in `/root/fabric-samples/test-network`, set the WSL environment variable before running the shell scripts directly:

```bash
export FABRIC_TEST_NETWORK_DIR="$HOME/fabric-samples/test-network"
```

## 5) Fabric Chaincode

Chaincode source:

- `blockchain/fabric/chaincode/certificates/`

Contract functions:
- `IssueCertificate`
- `GetCertificate`
- `VerifyCertificate`
- `RevokeCertificate`

The chaincode now also emits the `CertificateIssued` event after a successful issue transaction. The backend bridge listens for that event and anchors the certificate hash to ICP.

The local Fabric chaincode deployment is already working in the current development setup.

## 6) ICP Canister

Canister source:

- `blockchain/icp/src/cert_registry/main.mo`

Implemented functions:
- `anchorCertificate(id, hash)`
- `verifyCertificate(id, testHash)`
- `setBridgePrincipal(principal)`
- `getBridgePrincipal()`
- `getAdmin()`

Local status already completed:
- Local canister deployed with ID `uxrrr-q7777-77774-qaaaq-cai`
- Bridge identity file created at `backend/.icp-bridge-identity.json`
- Bridge principal configured on the local canister

Useful commands:

```powershell
cd blockchain\icp
$icpPath = (wsl wslpath -a (Resolve-Path .)).Trim()
wsl bash -lc "cd '$icpPath' && dfx start --background"
wsl bash -lc "cd '$icpPath' && dfx deploy cert_registry"
```

## 7) Verify Services

### Backend
- Port: `5000`
- Check:

```powershell
curl http://localhost:5000/api/blockchain/status
```

### Frontend
- Port: `3000`
- Open: `http://localhost:3000`

## 8) Project Structure

```text
backend/                            Express API + MongoDB
frontend/                           React app
blockchain/fabric/chaincode/        Hyperledger Fabric chaincode
blockchain/icp/                     ICP canister project
scripts/                            Dev automation scripts
```

## 9) API Reference

Base URL: `http://localhost:5000`

### Blockchain
- `GET /api/blockchain/networks`
- `GET /api/blockchain/status`
- `POST /api/blockchain/fabric/issue-certificate`
- `GET /api/blockchain/fabric/verify/:certificateId`
- `POST /api/blockchain/issue-certificate`
- `GET /api/blockchain/verify/:certificateId`

### Certificates
- `POST /api/certificates`
- `GET /api/certificates/:id`
- `GET /api/certificates/verify/:certificateId`
- `PUT /api/certificates/revoke/:certificateId`

## 10) Current Status

Completed and verified locally:
- Fabric test network is running on `mychannel`
- Chaincode `certificates` is deployed and committed at sequence `4`, version `1.0.4`
- Fabric wallet identity `bridgeService` exists in `blockchain/fabric/wallet`
- Org1 connection profile exists at `blockchain/fabric/connection-profiles/connection-org1.json`
- ICP canister `cert_registry` is deployed locally with canister ID `uxrrr-q7777-77774-qaaaq-cai`
- Bridge principal is configured on the canister
- End-to-end bridge test succeeded: issuing on Fabric emitted `CertificateIssued`, the backend anchored the hash to ICP, and `verifyCertificate(...)` returned `true`

Current observed local Fabric state:
- Running containers include `peer0.org1.example.com`, `peer0.org2.example.com`, `orderer.example.com`, `ca_org1`, `ca_org2`, `ca_orderer`
- Running chaincode containers include:
  - `dev-peer0.org1.example.com-certificates_1.0.4-bc144cd60fa8a2750b4357274d2f3692410ce40078b2a0a01124842696ecc33a`
  - `dev-peer0.org2.example.com-certificates_1.0.4-bc144cd60fa8a2750b4357274d2f3692410ce40078b2a0a01124842696ecc33a`

Important fixes already applied:
- Fabric chaincode timestamps now use the deterministic transaction timestamp instead of `new Date()`
- Manual Fabric deployment script now auto-increments lifecycle sequence
- Manual Fabric deployment script now uses a unique package label/version per deployment so both orgs approve the same package cleanly

## 11) Local-Only Scope

This project is currently targeting a local development environment, not a paid production deployment.

Current working scope:
- Hyperledger Fabric runs locally in Docker
- ICP runs on the local `dfx` replica
- MongoDB runs locally
- The Fabric-to-ICP bridge runs with the backend locally

Why this is the current target:
- no cloud cost
- no ICP mainnet cycles required
- no production infrastructure needed before frontend work
- the blockchain integration is already sufficient for local product development

Local hardening that can be added later without leaving local development:
- retry handling for failed Fabric-to-ICP anchor attempts
- audit logging for bridge events
- health checks and metrics for the bridge service
- safer local secret handling for Fabric wallet material and ICP bridge identity
- one-command startup and shutdown scripts for the full stack

## 12) Continue From Here

To resume later, use this order:

1. Start or reset the Fabric test network in Ubuntu if needed.
```bash
cd /path/to/blockchain-technology
./scripts/fabric-bootstrap.sh
```

2. Deploy this project chaincode.
```bash
cd /path/to/blockchain-technology
./scripts/fabric-manual-package-deploy.sh
```

3. Restart the local ICP replica and redeploy the canister.
```bash
cd /path/to/blockchain-technology/blockchain/icp
dfx stop || true
dfx start --background --clean
dfx deploy cert_registry --yes --mode reinstall
```

4. Run the bridge end-to-end test from WSL.
```bash
cd /path/to/blockchain-technology
./scripts/run-bridge-e2e-wsl.sh
```

5. Start the backend normally from Windows after the local blockchain services are up.
```powershell
cd backend
npm start
```

6. Issue a Fabric certificate through the backend API and confirm the event listener anchors its hash to ICP.

## 13) Frontend Focus

The blockchain layer is complete enough for frontend work.

Frontend work can now proceed against the local backend and local blockchain stack for:
- certificate issuance screens
- certificate verification screens
- success, failure, and pending verification states
- admin views for issued and revoked certificates

## 14) Notes

- The backend bridge code is in `backend/src/services/fabricToIcpBridgeService.js`.
- The ICP caller is in `backend/src/services/icpCertificateAnchorService.js`.
- The chaincode event is emitted in `blockchain/fabric/chaincode/certificates/lib/certificate-contract.js`.
- For local ICP, scripts use `DFX_BIN` when set, otherwise `/home/<WSL-user>/.local/share/dfx/bin/dfx`.
- For Fabric, scripts use `FABRIC_TEST_NETWORK_DIR` when set, otherwise `/root/fabric-samples/test-network`.

## 15) Empirical Benchmark Replication

The empirical measurements reported in Section V of the paper reflect direct prototype execution across cryptographic operations, Hyperledger Fabric write and query transactions, concurrent verification workloads, and system soak testing:

```powershell
# Execute the empirical benchmark harness against the local prototype stack
node scripts/benchmark-empirical-suite.js
```

Raw prototype measurement logs (min, mean, median, P95, P99, QPS/TPS across all concurrency levels) are archived in `benchmark_evaluation_data.json`, and Figure 4 is preserved in `docs/figures/performance.png`.

## 16) Survey Instrument & Data Availability

- **Blank Survey Questionnaire**: Preserved in `data/Academic Certificate and Results Verification Survey.xlsx`.
- **Aggregate Summary Statistics**: Archived in `data/survey_aggregate_summary.json` ($n = 362$ respondents).
- **Participant Privacy Protocol**: In accordance with participant informed consent and the Zambian Data Protection Act No. 3 of 2021, individual participant-level microdata responses are restricted from public dissemination to prevent re-identification. Peer reviewers may request confidential evaluation access.

## 17) Citation

If you use BlockD3 CertVault in your research, please cite:

```bibtex
@article{phiri2026blockd3,
  title={BlockD3 CertVault: A Hybrid Hyperledger Fabric--Internet Computer Architecture for Certificate Verification in Zambia},
  author={Phiri, Owen and Sonkwe, Elvis and Chishala, Gershom},
  institution={Kapasa Makasa University},
  year={2026},
  url={https://github.com/grabrielzone26-sys/BlockD3-CertVault},
  doi={10.5281/zenodo.23687666}
}
```

## License

This project is licensed under the [MIT License](LICENSE).
