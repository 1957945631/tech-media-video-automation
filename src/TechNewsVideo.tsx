import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from 'remotion';
import type {Segment, VideoData} from './videoData';

type Props = {
  data: VideoData;
};

const BRAND = '硅基打底';
const COLUMN_TITLE = '一周 AI 大事件';
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const byTime = <T extends {start: number; end: number}>(items: T[], second: number): T => {
  return items.find((item) => second >= item.start && second < item.end) ?? items[items.length - 1];
};

const activeByTime = <T extends {start: number; end: number}>(items: T[], second: number): T | null => {
  return items.find((item) => second >= item.start && second < item.end) ?? null;
};

const segmentProgress = (segment: Segment, second: number) => {
  const duration = segment.end - segment.start;
  return Math.max(0, Math.min(1, (second - segment.start) / duration));
};

const fitText = (text: string, short: number, long: number, threshold: number) => {
  return text.length > threshold ? long : short;
};

const clampText = (text: string, max = 34) => {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
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
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 18% 16%, rgba(255,255,255,0.18) 0 1px, transparent 2px), radial-gradient(circle at 74% 72%, rgba(255,255,255,0.14) 0 1px, transparent 2px)',
          backgroundSize: '34px 34px, 57px 57px',
          opacity: 0.38
        }}
      />
    </AbsoluteFill>
  );
};

const TopBrand: React.FC = () => {
  return (
    <div style={{position: 'absolute', top: 44, left: 42, display: 'flex', alignItems: 'center', gap: 14}}>
      <div style={{width: 10, height: 48, background: '#f5b400'}} />
      <div style={{color: 'white', fontSize: 34, fontWeight: 950, letterSpacing: 0}}>{BRAND}</div>
    </div>
  );
};

type ActiveBeat = VideoData['visualBeats'][number] | null;

const pickAsset = (segment: Segment, beat: ActiveBeat, second: number) => {
  const assets = beat?.assets?.length ? beat.assets : segment.assets ?? (segment.asset ? [segment.asset] : []);
  if (!assets.length) {
    return null;
  }

  const localSecond = Math.max(0, second - (beat?.start ?? segment.start));
  return assets[Math.floor(localSecond / 3.2) % assets.length];
};

const MaterialPanel: React.FC<{segment: Segment; beat: ActiveBeat; second: number; progress: number}> = ({segment, beat, second, progress}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * fps));
  const entrance = spring({frame: localFrame, fps, config: {damping: 18, stiffness: 120}});
  const asset = pickAsset(segment, beat, second);
  const zoom = interpolate(progress, [0, 1], [1.02, 1.12], {easing: Easing.inOut(Easing.ease)});
  const wobble = Math.sin(frame / 9) * 1.2;
  const keywords = beat?.keywords ?? [];

  return (
    <div
      style={{
        position: 'absolute',
        left: 34,
        right: 34,
        top: 112,
        height: 1048,
        overflow: 'hidden',
        border: '3px solid rgba(255,255,255,0.58)',
        borderRadius: 16,
        background: '#080808',
        boxShadow: '0 24px 96px rgba(0,0,0,0.72)',
        transform: `translateY(${interpolate(entrance, [0, 1], [34, 0])}px) rotate(${wobble / 12}deg)`,
        opacity: interpolate(entrance, [0, 1], [0.35, 1])
      }}
    >
      {asset ? (
        <Img
          src={staticFile(asset)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            transform: `scale(${zoom}) translateY(${interpolate(progress, [0, 1], [0, -34])}px)`,
            filter: 'contrast(1.18) saturate(0.88) brightness(0.76)'
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(rgba(255,255,255,0.18) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.18) 2px, transparent 2px), #080808',
            backgroundSize: '92px 92px'
          }}
        >
          <div style={{fontSize: 260, color: 'rgba(245,180,0,0.24)', fontWeight: 950}}>AI</div>
        </div>
      )}

      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.06), rgba(0,0,0,0.5))'}} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 2px, transparent 7px)',
          opacity: 0.28,
          mixBlendMode: 'overlay'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 28,
          top: 24,
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.72)',
          color: 'rgba(255,255,255,0.78)',
          fontSize: 24,
          fontWeight: 850,
          borderLeft: '8px solid #f5b400'
        }}
      >
        素材来源：{segment.sourceName ?? '自制信息卡'}
      </div>
      {keywords.length ? (
        <div
          style={{
            position: 'absolute',
            left: 72,
            right: 72,
            bottom: 92,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            justifyContent: 'center',
            opacity: interpolate(entrance, [0, 1], [0, 1])
          }}
        >
          {keywords.slice(0, 4).map((keyword) => (
            <div
              key={keyword}
              style={{
                padding: '8px 14px',
                background: 'rgba(0,0,0,0.7)',
                border: '2px solid rgba(245,180,0,0.72)',
                color: '#f5b400',
                fontSize: 26,
                fontWeight: 900,
                textShadow: '0 3px 0 #000'
              }}
            >
              {keyword}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const BottomTitle: React.FC = () => {
  return (
    <div style={{position: 'absolute', left: 66, right: 66, top: 1302}}>
      <div style={{position: 'absolute', left: -24, top: 8, width: 11, height: 202, background: '#f5b400'}} />
      <div style={{fontSize: 82, lineHeight: 1.05, color: 'white', fontWeight: 950, fontStyle: 'italic', textShadow: '0 8px 18px #000'}}>
        3分钟看完
      </div>
      <div style={{marginTop: 14, fontSize: 72, lineHeight: 1.04, color: 'white', fontWeight: 950, fontStyle: 'italic', textShadow: '0 8px 18px #000'}}>
        一周
        <span style={{color: '#f5b400'}}>AI</span>
        大事件
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
};

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

const CutFlash: React.FC<{progress: number}> = ({progress}) => {
  const opacity = interpolate(progress, [0, 0.025, 0.07, 0.12], [0.8, 0.38, 0.12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: ease
  });
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
      <MaterialPanel segment={segment} beat={beat} second={second} progress={progress} />
      <BottomTitle />
      {segment.risk ? (
        <div
          style={{
            position: 'absolute',
            left: 72,
            right: 72,
            top: 1262,
            color: 'rgba(255,255,255,0.58)',
            fontSize: 23,
            textAlign: 'center',
            fontWeight: 800
          }}
        >
          审核提醒：{segment.risk}
        </div>
      ) : null}
      <CaptionBar text={caption?.text ?? null} />
      <CutFlash progress={progress} />
    </AbsoluteFill>
  );
};
