import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import type {AssetFunction, TransitionName, VisualRole} from '../types/video';

type Props = {
  name?: TransitionName;
  progress: number;
  visualRole?: VisualRole;
  assetFunction?: AssetFunction;
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const resolveTransition = ({name, visualRole, assetFunction}: Omit<Props, 'progress'>) => {
  if (name && name !== 'cut') {
    return name;
  }
  if (assetFunction === 'evidence_screenshot') {
    return 'scan';
  }
  if (assetFunction === 'product_ui') {
    return 'zoom';
  }
  if (visualRole === 'motion' || assetFunction === 'remotion_motion_clip') {
    return 'glitch';
  }
  if (visualRole === 'diagram' || assetFunction === 'remotion_diagram') {
    return 'scan';
  }
  if (visualRole === 'keyword' || assetFunction === 'yellow_opinion_card') {
    return 'flash';
  }
  return 'cut';
};

export const TransitionPreset: React.FC<Props> = ({name = 'cut', progress, visualRole, assetFunction}) => {
  const resolvedName = resolveTransition({name, visualRole, assetFunction});
  if (resolvedName === 'cut') {
    return null;
  }

  const opacity = interpolate(progress, [0, 0.025, 0.08, 0.14], [0.82, 0.38, 0.16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease
  });

  if (resolvedName === 'glitch') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
        <div style={{position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.16)', mixBlendMode: 'screen'}} />
        <div style={{position: 'absolute', inset: '12% 0 70%', background: '#f5b400', transform: 'translateX(-34px)'}} />
        <div style={{position: 'absolute', inset: '54% 0 35%', background: '#22d3ee', transform: 'translateX(28px)'}} />
      </AbsoluteFill>
    );
  }

  if (resolvedName === 'zoom') {
    return (
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: '#000',
          opacity: opacity * 0.42,
          transform: `scale(${interpolate(progress, [0, 0.14], [1.12, 1])})`
        }}
      />
    );
  }

  if (resolvedName === 'scan') {
    const y = interpolate(progress, [0, 0.14], [-120, 1920], {extrapolateRight: 'clamp', easing: ease});
    return (
      <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: y, height: 90, background: 'rgba(245,180,0,0.32)'}} />
      </AbsoluteFill>
    );
  }

  const slide = interpolate(progress, [0, 0.12], [-160, 760], {extrapolateRight: 'clamp', easing: ease});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', inset: 0, background: '#f5b400', opacity: opacity * 0.28}} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: slide,
          width: 220,
          background: 'rgba(255,255,255,0.18)',
          transform: 'skewX(-16deg)',
          opacity
        }}
      />
    </AbsoluteFill>
  );
};
