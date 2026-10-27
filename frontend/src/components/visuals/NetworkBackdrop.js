import React from 'react';

const classNames = (...classes) => classes.filter(Boolean).join(' ');

const NetworkBackdrop = ({ variant = 'chain', className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={classNames('network-backdrop', `network-backdrop-${variant}`, className)}
    >
      {variant === 'chain' && (
        <>
          <span className="nb-ambient nb-ambient-a" />
          <span className="nb-ambient nb-ambient-b" />
          <span className="nb-grid" />
          <span className="nb-chain-link nb-chain-link-a" />
          <span className="nb-chain-link nb-chain-link-b" />
          <span className="nb-chain-link nb-chain-link-c" />
          <span className="nb-node nb-node-a" />
          <span className="nb-node nb-node-b" />
          <span className="nb-node nb-node-c" />
          <span className="nb-pulse nb-pulse-a" />
          <span className="nb-pulse nb-pulse-b" />
        </>
      )}

      {variant === 'orbit' && (
        <>
          <span className="nb-ambient nb-ambient-c" />
          <span className="nb-orbit-ring nb-orbit-ring-a" />
          <span className="nb-orbit-ring nb-orbit-ring-b" />
          <span className="nb-orbit-core" />
          <span className="nb-satellite nb-satellite-a" />
          <span className="nb-satellite nb-satellite-b" />
          <span className="nb-satellite nb-satellite-c" />
        </>
      )}

      {variant === 'fluid' && (
        <>
          <span className="nb-fluid nb-fluid-a" />
          <span className="nb-fluid nb-fluid-b" />
          <span className="nb-fluid nb-fluid-c" />
          <span className="nb-fluid-ring nb-fluid-ring-a" />
          <span className="nb-fluid-ring nb-fluid-ring-b" />
        </>
      )}

      {variant === 'zoom' && (
        <>
          <span className="nb-ambient nb-ambient-d" />
          <span className="nb-zoom-core" />
          <span className="nb-zoom-ray nb-zoom-ray-a" />
          <span className="nb-zoom-ray nb-zoom-ray-b" />
          <span className="nb-zoom-ray nb-zoom-ray-c" />
          <span className="nb-zoom-ray nb-zoom-ray-d" />
          <span className="nb-zoom-ring nb-zoom-ring-a" />
          <span className="nb-zoom-ring nb-zoom-ring-b" />
        </>
      )}
    </div>
  );
};

export default NetworkBackdrop;
