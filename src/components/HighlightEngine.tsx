import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';

type Props = {
  enabled?: boolean;
  variant?: 'box' | 'magnifier';
};

export const HighlightEngine: React.FC<Props> = ({enabled = true, variant = 'box'}) => {
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
          left: '8%',
          right: '8%',
          top: '14%',
          height: '28%',
          border: '7px solid #ff2d2d',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.55), 0 0 26px rgba(255,45,45,0.45)',
          opacity: draw,
          transform: `scale(${interpolate(draw, [0, 1], [0.97, 1])})`
        }}
      />
      {variant === 'box' && (
        <div
          style={{
            position: 'absolute',
            left: '12%',
            top: '45%',
            padding: '8px 16px',
            background: '#ff2d2d',
            color: '#fff',
            fontSize: 22,
            fontWeight: 950,
            boxShadow: '0 5px 0 rgba(0,0,0,0.72)',
            opacity: draw
          }}
        >
          看标题 / 来源 / 关键段落
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
            border: '8px solid #ff2d2d',
            boxShadow: '0 0 0 6px rgba(0,0,0,0.48)',
            opacity: draw
          }}
        />
      )}
    </>
  );
};
