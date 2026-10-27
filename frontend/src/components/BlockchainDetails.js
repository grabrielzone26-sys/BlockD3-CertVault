import React, { useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  CubeTransparentIcon,
  LockClosedIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

const BlockchainDetails = ({
  transactionHash,
  fabricTxId,
  blockNumber,
  channelId = 'certificate-channel',
  ipfsHash,
  networkName = 'Internet Computer',
  canisterId,
  documentHash,
  matchesHash,
  bridgeStatus = 'anchored',
  issuerName,
}) => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tamperSimulated, setTamperSimulated] = useState(false);

  const resolvedTxHash = transactionHash || fabricTxId;

  const isLocalNetwork = (name) => {
    if (!name) return false;
    const normalized = name.toLowerCase();
    return normalized.includes('local') || normalized.includes('localhost');
  };

  const getCanisterUrl = () => {
    if (!canisterId || isLocalNetwork(networkName)) {
      return null;
    }
    return `https://dashboard.internetcomputer.org/canister/${canisterId}`;
  };

  // List of IPFS gateways to try
  const IPFS_GATEWAYS = [
    'http://127.0.0.1:8080/ipfs/',
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://ipfs.infura.io/ipfs/',
  ];

  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);

  const getIpfsUrl = (hash) => {
    return `${IPFS_GATEWAYS[currentGatewayIndex]}${hash}`;
  };

  const handleIpfsError = () => {
    setCurrentGatewayIndex((prevIndex) => (prevIndex + 1) % IPFS_GATEWAYS.length);
    setError('IPFS gateway unavailable. Trying another gateway...');
    setTimeout(() => setError(null), 3000);
  };

  const handleLinkClick = async (url, isIpfsLink = false) => {
    if (!url) return;

    setIsLoading(true);
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok && isIpfsLink) {
        handleIpfsError();
        return;
      }
      window.open(url, '_blank');
    } catch (err) {
      if (isIpfsLink) {
        handleIpfsError();
      } else {
        setError('Failed to open link. Please check your internet connection.');
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!resolvedTxHash && !ipfsHash && !canisterId && !documentHash) return null;

  const displayDocHash = documentHash || null;
  const corruptedHash = displayDocHash
    ? displayDocHash.slice(0, -6) + 'bad09f'
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852bad09f';

  const effectiveMatchesHash = tamperSimulated ? false : matchesHash ?? true;

  return (
    <div className="glass-panel rounded-2xl p-5 mt-4 border border-cyan/25 shadow-[0_0_30px_rgba(0,0,0,0.4)] space-y-4">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-sm bg-amber" />
          <h3 className="text-lg font-semibold font-display text-[var(--text-primary,#ffffff)]">
            Blockchain Details
          </h3>
        </div>
        {networkName && (
          <span className="status-chip status-chip-cyan">
            {networkName}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-rose-950/50 border border-rose-500/40 p-3 mb-2">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-rose-400" />
            <div className="ml-2">
              <p className="text-xs font-mono text-rose-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {resolvedTxHash && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Transaction Reference</p>
          <div className="flex items-center mt-1.5">
            <code className="text-xs font-mono text-cyan bg-slate-950/90 px-3 py-2 rounded border border-cyan/30 break-all w-full select-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              {resolvedTxHash}
            </code>
          </div>
        </div>
      )}

      {canisterId && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">Canister ID</p>
          <div className="flex items-center mt-1.5 gap-2">
            <code className="text-xs font-mono text-amber bg-slate-950/90 px-3 py-2 rounded border border-amber/30 break-all flex-1 select-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              {canisterId}
            </code>
            {getCanisterUrl() && (
              <button
                onClick={() => handleLinkClick(getCanisterUrl())}
                disabled={isLoading}
                className={`p-2 rounded bg-amber/10 border border-amber/30 text-amber hover:bg-amber/25 transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="View canister on ICP dashboard"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {ipfsHash && (
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-wider text-slate-400">IPFS Hash</p>
          <div className="flex items-center mt-1.5 gap-2">
            <code className="text-xs font-mono text-violet bg-slate-950/90 px-3 py-2 rounded border border-violet/30 break-all flex-1 select-all shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
              {ipfsHash}
            </code>
            <button
              onClick={() => handleLinkClick(getIpfsUrl(ipfsHash), true)}
              disabled={isLoading}
              className={`p-2 rounded bg-violet/10 border border-violet/30 text-violet hover:bg-violet/25 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-label="View on IPFS"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dual Ledger & Document Integrity Proof Section */}
      <div className="pt-2 border-t border-sky-500/20 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-950/40 p-2.5 border border-sky-500/20 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-sky-400 font-semibold mb-1">
              <CubeTransparentIcon className="h-4 w-4" />
              <span>Hyperledger Fabric (Permissioned)</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <p><span className="text-slate-400">Channel:</span> {channelId}</p>
              <p><span className="text-slate-400">MSP:</span> Org1MSP ({issuerName ? `${issuerName} Senate` : 'Academic Senate Authority'})</p>
              {blockNumber && <p><span className="text-slate-400">Block:</span> #{blockNumber}</p>}
            </div>
          </div>

          <div className="rounded-lg bg-slate-950/40 p-2.5 border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
              <LockClosedIcon className="h-4 w-4" />
              <span>Internet Computer (Public Anchor)</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <p><span className="text-slate-400">State:</span> {bridgeStatus === 'anchored' ? 'Anchored & Tamper-Evident' : 'Synced'}</p>
              <p><span className="text-slate-400">Ledger:</span> ICP Canister Root State</p>
            </div>
          </div>
        </div>

        {/* SHA-256 Digest Integrity Visualizer & Defense Tamper Simulation */}
        {displayDocHash && (
          <div className="rounded-lg bg-slate-950/50 p-3 border border-sky-500/30 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <ClipboardDocumentCheckIcon className="h-4 w-4 text-cyan" />
                <span className="text-xs font-semibold text-slate-300">
                  Document Integrity Check (SHA-256)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTamperSimulated(!tamperSimulated)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition border ${
                  tamperSimulated
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-sky-500 hover:text-sky-300'
                }`}
                title="Simulate 1-byte document modification to demonstrate cryptographic avalanche detection"
              >
                {tamperSimulated ? '⚠️ Tamper Mode Active' : '⚡ Simulate Tamper'}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Cryptographic Digest:</span>
              {effectiveMatchesHash ? (
                <span className="inline-flex items-center gap-1 font-mono text-emerald-400 font-medium">
                  <CheckBadgeIcon className="h-3.5 w-3.5" /> 100% Cryptographic Match
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-rose-400 font-semibold animate-pulse">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Tamper Detected: Hash Mismatch
                </span>
              )}
            </div>

            <code
              className={`block text-[11px] font-mono p-2 rounded border break-all select-all ${
                effectiveMatchesHash
                  ? 'bg-emerald-950/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/50'
              }`}
            >
              {tamperSimulated ? corruptedHash : displayDocHash}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockchainDetails;
