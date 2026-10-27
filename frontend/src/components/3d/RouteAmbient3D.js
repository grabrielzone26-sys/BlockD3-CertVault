import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import SplineScene from './SplineScene';
import scenes from '../../config/splineScenes';
import BlockchainCanvasBackdrop from '../visuals/BlockchainCanvasBackdrop';

const RouteAmbient3D = () => {
  const location = useLocation();
  const { theme } = useTheme();

  

  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';
  const isPublicVerify = location.pathname === '/verify' || location.pathname.startsWith('/verify/');
  const isVerificationRoute = location.pathname === '/verify-certificate';

  const ambientUrl = isAuthRoute ? scenes.ambientAuth : scenes.ambientApp;
  const toneClass = isAuthRoute
    ? 'ambient-auth'
    : isPublicVerify
      ? 'ambient-public'
      : isVerificationRoute
        ? 'ambient-verify'
        : 'ambient-app';

  return (
    <div className={`route-ambient route-ambient-shell ${toneClass}`} aria-hidden="true">
      {/* Procedural 6-color canvas engine with metallic chain links, cubes, and amber glow */}
      <BlockchainCanvasBackdrop />

      {/* Atmospheric ambient glows */}
      <div className="route-ambient-glow route-ambient-glow-cyan" />
      <div className="route-ambient-glow route-ambient-glow-amber" />
      <div className="route-ambient-glow route-ambient-glow-violet" />

      {ambientUrl && (
        <SplineScene
          url={ambientUrl}
          className="route-ambient-viewer"
          background="transparent"
          fallback={null}
        />
      )}
    </div>
  );
};

export default RouteAmbient3D;
