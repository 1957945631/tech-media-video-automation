import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {TransitionPreset} from './components/TransitionPreset';
import {VisualStage} from './components/VisualCards';
import {activeByTime, byTime, segmentProgress} from './rendering/timeline';
import type {VideoData} from './types/video';

type Props = {
  data: VideoData;
};

const BRAND = '硅基打底';
const COLUMN_TITLE = '一周科技大事';

const fitText = (text: string, short: number, long: number, threshold: number) => {
  return text.length > threshold ? long : short;
};

const clampText = (text: string, max = 34) => {
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
};

const durationLabel = (data: VideoData) => {
  const seconds = data.durationInFrames / data.fps;
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes}分钟看完`;
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame % 240, [0, 240], [0, -82], {
    easing: Easing.inOut(Easing.ease)
  });
  const pulse = interpolate(Math.sin(frame / 16), [-1, 1], [0.18, 0.34]);

  return (
    <AbsoluteFill style={{background: '#050505', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 14,
          border: '2px solid rgba(255,255,255,0.18)',
          borderRadius: 18
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: -360,
          right: -360,
          top: 130,
          height: 1180,
          background:
            'linear-gradient(rgba(255,255,255,0.14) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.14) 2px, transparent 2px)',
          backgroundSize: '88px 88px',
          transform: `perspective(620px) rotateX(56deg) translateY(${drift}px)`,
          transformOrigin: 'center top',
          opacity: 0.52
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 1px, transparent 2px, transparent 6px)',
          opacity: pulse,
          mixBlendMode: 'screen'
        }}
      />
    </AbsoluteFill>
  );
};

const TopBrand: React.FC = () => (
  <div style={{position: 'absolute', top: 44, left: 42, display: 'flex', alignItems: 'center', gap: 14}}>
    <div style={{width: 10, height: 48, background: '#f5b400'}} />
    <div style={{color: 'white', fontSize: 34, fontWeight: 950, letterSpacing: 0}}>{BRAND}</div>
  </div>
);

const BottomTitle: React.FC<{durationText: string}> = ({durationText}) => (
  <div style={{position: 'absolute', left: 66, right: 66, top: 1302}}>
    <div style={{position: 'absolute', left: -24, top: 8, width: 11, height: 202, background: '#f5b400'}} />
    <div style={{fontSize: 82, lineHeight: 1.05, color: 'white', fontWeight: 950, fontStyle: 'italic', textShadow: '0 8px 18px #000'}}>
      {durationText}
    </div>
    <div style={{marginTop: 14, fontSize: 72, lineHeight: 1.04, color: 'white', fontWeight: 950, fontStyle: 'italic', textShadow: '0 8px 18px #000'}}>
      {COLUMN_TITLE}
    </div>
    <div
      style={{
        position: 'absolute',
        right: -26,
        top: 166,
        color: 'rgba(245,180,0,0.35)',
        fontSize: 92,
        fontWeight: 950,
        transform: 'rotate(-14deg)'
      }}
    >
      {BRAND}
    </div>
  </div>
);

const CaptionBar: React.FC<{text: string | null}> = ({text}) => {
  if (!text) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        bottom: 206,
        minHeight: 92,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px',
        color: 'white',
        fontSize: fitText(text, 66, 52, 18),
        lineHeight: 1.16,
        textAlign: 'center',
        fontWeight: 950,
        WebkitTextStroke: '8px rgba(0,0,0,0.92)',
        paintOrder: 'stroke fill',
        textShadow: '0 6px 14px rgba(0,0,0,0.95), 0 2px 0 #000'
      }}
    >
      {clampText(text, 30)}
    </div>
  );
};

export const TechNewsVideo: React.FC<Props> = ({data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const second = frame / fps;
  const segment = byTime(data.segments, second);
  const caption = activeByTime(data.captions, second);
  const beat = activeByTime(data.visualBeats, second);
  const progress = segmentProgress(segment, second);

  return (
    <AbsoluteFill style={{fontFamily: 'Microsoft YaHei, Arial, sans-serif'}}>
      {data.voiceover ? <Audio src={staticFile(data.voiceover)} /> : null}
      <Background />
      <TopBrand />
      <VisualStage segment={segment} beat={beat} second={second} />
      <BottomTitle durationText={durationLabel(data)} />
      <CaptionBar text={caption?.text ?? null} />
      <TransitionPreset name={beat?.transitionOut ?? 'cut'} progress={progress} />
    </AbsoluteFill>
  );
};
