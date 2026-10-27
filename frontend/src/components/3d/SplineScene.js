import React, { useEffect, useMemo } from 'react';

let viewerScriptPromise;

const ensureViewerScript = () => {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.customElements && window.customElements.get('spline-viewer')) {
    return Promise.resolve();
  }

  if (!viewerScriptPromise) {
    viewerScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-spline-viewer="true"]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';
      script.dataset.splineViewer = 'true';
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  return viewerScriptPromise;
};

const SplineScene = ({
  url,
  className = '',
  loading = 'lazy',
  eventsTarget,
  background = 'transparent',
  fallback = null,
}) => {
  const isIframeScene = url && !url.includes('.splinecode') && url.includes('spline.design');

  useEffect(() => {
    if (url && !isIframeScene) {
      ensureViewerScript().catch(() => {});
    }
  }, [isIframeScene, url]);

  const element = useMemo(() => {
    if (!url) {
      return fallback;
    }

    if (isIframeScene) {
      return (
        <iframe
          src={url}
          className={className}
          title="Spline scene"
          loading={loading}
          allow="autoplay; fullscreen"
        />
      );
    }

    return React.createElement('spline-viewer', {
      url,
      loading,
      background,
      'events-target': eventsTarget,
      class: className,
    });
  }, [background, className, eventsTarget, fallback, isIframeScene, loading, url]);

  return element;
};

export default SplineScene;
