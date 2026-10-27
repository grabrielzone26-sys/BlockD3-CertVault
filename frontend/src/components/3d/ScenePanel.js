import React from 'react';
import SplineScene from './SplineScene';

const ScenePanel = ({
  sceneUrl,
  eyebrow,
  title,
  description,
  chips = [],
  align = 'left',
  className = '',
}) => {
  return (
    <section className={`scene-panel ${className}`}>
      <div className="scene-panel-copy" data-align={align}>
        {eyebrow ? <span className="status-chip">{eyebrow}</span> : null}
        <div className="space-y-3">
          <h1 className="scene-panel-title">{title}</h1>
          {description ? <p className="scene-panel-description">{description}</p> : null}
        </div>
        {chips.length > 0 ? (
          <div className="scene-panel-chips">
            {chips.map((chip) => (
              <span key={chip} className="scene-panel-chip">{chip}</span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="scene-panel-canvas">
        <div className="scene-panel-orb scene-panel-orb-a" />
        <div className="scene-panel-orb scene-panel-orb-b" />
        <SplineScene
          url={sceneUrl}
          className="scene-panel-viewer"
          background="transparent"
          fallback={<div className="scene-panel-fallback" />}
        />
      </div>
    </section>
  );
};

export default ScenePanel;
