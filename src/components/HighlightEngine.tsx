import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type Props = {
  enabled?: boolean;
  variant?: 'box' | 'magnifier';
};

export const HighlightEngine: React.FC<Props> = ({enabled = false, variant = 'box'}) => {
  const frame = useCurrentFrame();
  if (!enabled) {
    return null;
  }

  const draw = interpolate(frame % 45, [0, 14, 45], [0.25, 1, 0.82], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          top: '10%',
          bottom: '54%',
          border: '4px solid rgba(245,180,0,0.72)',
          boxShadow: '0 0 0 999px rgba(0,0,0,0.16), 0 0 28px rgba(245,180,0,0.28)',
          opacity: draw * 0.7,
          transform: `scale(${interpolate(draw, [0, 1], [0.97, 1])})`
        }}
      />
      {variant === 'box' && (
        <div
          style={{
            position: 'absolute',
            left: '8%',
            top: '48%',
            padding: '7px 14px',
            background: 'rgba(8,8,8,0.72)',
            color: 'rgba(245,180,0,0.88)',
            fontSize: 20,
            fontWeight: 950,
            boxShadow: '0 4px 16px rgba(0,0,0,0.36)',
            opacity: draw * 0.72
          }}
        >
          语义重点
        </div>
      )}
      {variant === 'magnifier' && (
        <div
          style={{
            position: 'absolute',
            right: '12%',
            bottom: '20%',
            width: 172,
            height: 172,
            borderRadius: '50%',
            border: '6px solid rgba(245,180,0,0.72)',
            boxShadow: '0 0 0 6px rgba(0,0,0,0.32)',
            opacity: draw * 0.72
          }}
        />
      )}
    </>
  );
};
