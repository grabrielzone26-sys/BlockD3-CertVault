import React, { useState, useEffect } from 'react';
import logo from '../assets/images/logo.png';
import './LoadingAnimation.css';

const NODES = [
  { id: 'fabric', label: 'Fabric Peer', sub: 'Hyperledger' },
  { id: 'icp', label: 'ICP Anchor', sub: 'Canister' },
  { id: 'ipfs', label: 'IPFS Swarm', sub: 'Storage' },
];

const LoadingAnimation = ({
  variant = 'screen',
  kicker = 'BlockD3 CertVault',
  message = 'Synchronizing cryptographic ledger',
  subtext = null,
  progress = null,
  timeoutMs = 9000,
  onRetry = null,
}) => {
  const [showTimeoutNotice, setShowTimeoutNotice] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [liveHash, setLiveHash] = useState('0x7f4b2a9d...e184');

  // Active node step sequence
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % NODES.length);
    }, 700);
    return () => clearInterval(stepInterval);
  }, []);

  // Live cryptographic hash ticker
  useEffect(() => {
    const hexChars = '0123456789abcdef';
    const hashInterval = setInterval(() => {
      let h1 = '';
      let h2 = '';
      for (let i = 0; i < 8; i++) {
        h1 += hexChars[Math.floor(Math.random() * hexChars.length)];
        h2 += hexChars[Math.floor(Math.random() * hexChars.length)];
      }
      setLiveHash(`0x${h1}...${h2}`);
    }, 180);
    return () => clearInterval(hashInterval);
  }, []);

  // Timeout escape hatch
  useEffect(() => {
    if (variant !== 'screen' && variant !== 'route') return;
    const timer = setTimeout(() => {
      setShowTimeoutNotice(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [variant, timeoutMs]);

  const isInline = variant === 'inline';
  const isCard = variant === 'card';
  const isRouteLoader = variant === 'route';

  if (isInline) {
    return (
      <div className="loading-inline-wrap" role="status" aria-live="polite">
        <div className="loading-ledger-compact" aria-hidden="true">
          <span className="compact-node active" />
          <span className="compact-line" />
          <span className="compact-node" />
          <span className="compact-line" />
          <span className="compact-node" />
        </div>
        <span className="loading-inline-text">{message}</span>
      </div>
    );
  }

  return (
    <div
      className={`loading-overlay ${isRouteLoader ? 'loading-overlay-route' : ''} ${
        isCard ? 'loading-overlay-card' : ''
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Background radial aurora glow */}
      <div className="loading-aura" aria-hidden="true" />

      <div className="loading-panel">
        {/* Cyber HUD Corner Brackets */}
        <span className="hud-bracket hud-bracket-tl" aria-hidden="true" />
        <span className="hud-bracket hud-bracket-tr" aria-hidden="true" />
        <span className="hud-bracket hud-bracket-bl" aria-hidden="true" />
        <span className="hud-bracket hud-bracket-br" aria-hidden="true" />

        {/* Brand Header with Orbital Rings */}
        <div className="loading-brand">
          <div className="loading-orbit-wrap">
            <div className="loading-orbit-outer" aria-hidden="true" />
            <div className="loading-orbit-inner" aria-hidden="true" />
            <span className="loading-logo-frame">
              <img src={logo} alt="BlockD3 Vault" />
            </span>
          </div>

          <div className="loading-copy">
            <div className="loading-kicker-row">
              <span className="loading-kicker">{kicker}</span>
              <span className="loading-live-badge">
                <span className="loading-pulse-dot" /> LIVE
              </span>
            </div>
            <span className="loading-text" title={message}>{message}</span>
            {subtext ? (
              <span className="loading-subtext">{subtext}</span>
            ) : (
              <span className="loading-subtext">Validating dual Hyperledger &amp; ICP consensus</span>
            )}
          </div>
        </div>

        {/* Named Multi-Chain Nodes Handshake */}
        <div className="loading-nodes-stage" aria-hidden="true">
          {NODES.map((node, idx) => {
            const isConfirmed = idx < activeStep;
            const isCurrent = idx === activeStep;
            return (
              <React.Fragment key={node.id}>
                <div
                  className={`loading-chain-node ${
                    isCurrent ? 'node-current' : isConfirmed ? 'node-confirmed' : 'node-standby'
                  }`}
                >
                  <div className="chain-node-icon">
                    {isConfirmed ? '✓' : isCurrent ? '●' : '○'}
                  </div>
                  <div className="chain-node-meta">
                    <span className="chain-node-name">{node.label}</span>
                    <span className="chain-node-sub">{node.sub}</span>
                  </div>
                </div>

                {idx < NODES.length - 1 && (
                  <div className={`loading-chain-connector ${idx < activeStep ? 'connector-active' : ''}`}>
                    <span className="connector-packet" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress Bar (Deterministic or Continuous Pulse) */}
        <div
          className="loading-progress"
          role="progressbar"
          aria-valuenow={progress !== null ? Math.round(progress) : undefined}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {progress !== null ? (
            <span
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                animation: 'none',
                transition: 'width 0.3s ease-out',
              }}
            />
          ) : (
            <span />
          )}
        </div>

        {/* Live Cryptographic Hash Stream Ticker */}
        <div className="loading-crypto-ticker" aria-hidden="true">
          <span className="ticker-label">PROOF HASH:</span>
          <span className="ticker-hash">{liveHash}</span>
          <span className="ticker-status">CHAIN OK</span>
        </div>

        {/* Timeout Fallback */}
        {showTimeoutNotice && (
          <div className="loading-timeout-notice">
            <p>Taking longer than usual to connect to blockchain peers.</p>
            <div className="loading-timeout-actions">
              <button
                type="button"
                className="loading-timeout-btn"
                onClick={onRetry || (() => window.location.reload())}
              >
                Reload Page
              </button>
              <button
                type="button"
                className="loading-timeout-btn-secondary"
                onClick={() => {
                  window.location.href = '/login';
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingAnimation;


