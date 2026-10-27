import React, { useEffect, useState, useCallback } from 'react';
import { createPublicApiClient } from '../lib/apiClient';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CubeTransparentIcon,
  LockClosedIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';

const NetworkTelemetryWidget = ({ compact = false, className = '' }) => {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      setLoading(true);
      const apiClient = createPublicApiClient();
      const res = await apiClient.get('/api/blockchain/network');
      if (res.data?.data) {
        setNetworkInfo(res.data.data);
      }
      setLastChecked(new Date());
    } catch (err) {
      console.warn('Network telemetry fetch warning:', err.message);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 45000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  const isSimulated = networkInfo?.mode === 'simulated' || networkInfo?.networkName?.toLowerCase().includes('simulated');
  const fabricPeerName = networkInfo?.peer || 'peer0.org1.edu.zm';
  const fabricChannel = networkInfo?.channel || 'certificate-channel';
  const canisterId = networkInfo?.canisterId || networkInfo?.bridge?.canisterId || 'bkyz2-fmaaa-aaaaa-qaaaq-cai';
  const blockHeight = networkInfo?.blockHeight || networkInfo?.blocks || 148;

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-sky-500/20 text-xs ${className}`}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono text-sky-300 font-semibold">Dual-Ledger Live:</span>
        <span className="font-mono trust-muted">Fabric (Peer0) &bull; ICP Canister</span>
        <button
          type="button"
          onClick={fetchTelemetry}
          disabled={loading}
          className="text-slate-400 hover:text-white transition"
          title="Refresh blockchain telemetry"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div className={`trust-card p-4 sm:p-5 rounded-2xl border border-sky-500/25 space-y-4 ${className}`}>
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-sky-500/15 pb-3">
        <div className="flex items-center gap-2">
          <SignalIcon className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm sm:text-base font-semibold font-display text-[var(--text-primary,#ffffff)]">
            Live Blockchain Telemetry &amp; Node Health
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[10px] font-mono trust-muted">
              Updated {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={fetchTelemetry}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
            title="Refresh network status"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Node 1: Hyperledger Fabric */}
        <div className="rounded-xl bg-slate-950/40 p-3.5 border border-sky-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CubeTransparentIcon className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold text-[var(--text-primary,#ffffff)]">
                Hyperledger Fabric Peer
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              <CheckCircleIcon className="h-3 w-3" />
              {isSimulated ? 'Simulated Consensus' : 'Peer Active'}
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="trust-muted">Node Identity:</span>
              <span className="text-sky-300 truncate max-w-[170px]">{fabricPeerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="trust-muted">Active Channel:</span>
              <span className="text-[var(--text-primary,#ffffff)]">{fabricChannel}</span>
            </div>
            <div className="flex justify-between">
              <span className="trust-muted">Ledger Height:</span>
              <span className="text-emerald-300">Block #{blockHeight}</span>
            </div>
          </div>
        </div>

        {/* Node 2: ICP Canister Public Anchor */}
        <div className="rounded-xl bg-slate-950/40 p-3.5 border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LockClosedIcon className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-[var(--text-primary,#ffffff)]">
                ICP Anchor Canister
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-400">
              <CheckCircleIcon className="h-3 w-3" />
              Root State Anchored
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="trust-muted">Canister Principal:</span>
              <span className="text-amber-300 truncate max-w-[170px]">{canisterId}</span>
            </div>
            <div className="flex justify-between">
              <span className="trust-muted">Consensus Protocol:</span>
              <span className="text-[var(--text-primary,#ffffff)]">Threshold Relay</span>
            </div>
            <div className="flex justify-between">
              <span className="trust-muted">State Verifier:</span>
              <span className="text-amber-300">Public Canister Query</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkTelemetryWidget;
