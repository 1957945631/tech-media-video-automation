import React from 'react';
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Video} from 'remotion';
import type {Segment, VisualBeat} from '../types/video';
import {isVideoAsset, pickAsset, visualLabel} from '../rendering/assets';
import {cleanAudienceKeywords, pickAudienceBody, pickAudienceTitle} from '../rendering/audienceCopy';
import {localProgress} from '../rendering/timeline';
import {HighlightEngine} from './HighlightEngine';

type CardProps = {
  segment: Segment;
  beat: VisualBeat | null;
  second: number;
};

const truncateText = (value: string | undefined, maxLength: number) => {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}...`;
};

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 34,
  right: 34,
  top: 112,
  height: 1048,
  overflow: 'hidden',
  border: '3px solid rgba(255,255,255,0.58)',
  borderRadius: 16,
  background: '#080808',
  boxShadow: '0 24px 96px rgba(0,0,0,0.72)'
};

const SourceTag: React.FC<{segment: Segment; beat: VisualBeat | null}> = ({segment, beat}) => (
  <div
    style={{
      position: 'absolute',
      left: 28,
      top: 24,
      padding: '8px 14px',
      background: 'rgba(0,0,0,0.72)',
      color: 'rgba(255,255,255,0.82)',
      fontSize: 24,
      fontWeight: 850,
      borderLeft: '8px solid #f5b400'
    }}
  >
    {visualLabel(beat)} · {segment.sourceName ?? '素材库'}
  </div>
);

const KeywordChips: React.FC<{keywords: string[]}> = ({keywords}) => {
  const visibleKeywords = cleanAudienceKeywords(keywords, 4);
  if (!visibleKeywords.length) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        bottom: 92,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        justifyContent: 'center'
      }}
    >
      {visibleKeywords.map((keyword) => (
        <div
          key={keyword}
          style={{
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.72)',
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
  );
};

const MediaFill: React.FC<{asset: string | null; progress: number; fit?: 'cover' | 'contain'; beat: VisualBeat | null}> = ({
  asset,
  progress,
  fit = 'cover',
  beat
}) => {
  const videoAsset = isVideoAsset(asset);
  const isEvidence = beat?.assetFunction === 'evidence_screenshot';
  const isProduct = beat?.assetFunction === 'product_ui';
  const zoom = interpolate(progress, [0, 1], videoAsset ? [1.05, 1.18] : isEvidence ? [1, 1.04] : [1.02, 1.13], {
    easing: Easing.inOut(Easing.ease)
  });
  const yDrift = interpolate(progress, [0, 1], videoAsset ? [18, -48] : isEvidence ? [0, -18] : [0, -34]);

  if (!asset) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(rgba(255,255,255,0.18) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.18) 2px, transparent 2px), #080808',
          backgroundSize: '92px 92px'
        }}
      />
    );
  }

  const commonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    objectPosition: isProduct ? 'center center' : 'top center',
    transform: `scale(${zoom}) translateY(${yDrift}px)`,
    filter: videoAsset
      ? 'contrast(1.16) saturate(1.04) brightness(0.76)'
      : isEvidence
        ? 'contrast(1.05) saturate(0.92) brightness(0.9)'
        : 'contrast(1.12) saturate(0.92) brightness(0.82)'
  };

  return videoAsset ? <Video src={staticFile(asset)} muted loop style={commonStyle} /> : <Img src={staticFile(asset)} style={commonStyle} />;
};

const CardShell: React.FC<
  CardProps & {
    children?: React.ReactNode;
    fit?: 'cover' | 'contain';
    allowHighlight?: boolean;
    showSourceTag?: boolean;
    showKeywordChips?: boolean;
  }
> = ({
  segment,
  beat,
  second,
  children,
  fit,
  allowHighlight,
  showSourceTag = true,
  showKeywordChips = true
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * fps));
  const entrance = spring({frame: localFrame, fps, config: {damping: 18, stiffness: 120}});
  const progress = localProgress(beat ?? segment, second);
  const asset = pickAsset(segment, beat, second);
  const showHighlight = Boolean(beat?.highlight && beat?.hasHighlight);

  return (
    <div
      style={{
        ...panelStyle,
        transform: `translateY(${interpolate(entrance, [0, 1], [34, 0])}px) rotate(${Math.sin(frame / 9) / 10}deg)`,
        opacity: interpolate(entrance, [0, 1], [0.35, 1])
      }}
    >
      <MediaFill asset={asset} progress={progress} fit={fit} beat={beat} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            beat?.assetFunction === 'evidence_screenshot'
              ? 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.28))'
              : 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.52))'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 1px, transparent 2px, transparent 7px)',
          opacity: 0.2,
          mixBlendMode: 'overlay'
        }}
      />
      {showSourceTag && <SourceTag segment={segment} beat={beat} />}
      {allowHighlight ? <HighlightEngine enabled={showHighlight} variant="box" /> : null}
      {children}
      {showKeywordChips && <KeywordChips keywords={beat?.keywords ?? []} />}
    </div>
  );
};

export const EvidenceCard: React.FC<CardProps> = (props) => <CardShell {...props} fit="contain" allowHighlight />;

export const BrollCard: React.FC<CardProps> = (props) => <CardShell {...props} />;

export const ConceptCard: React.FC<CardProps> = (props) => (
  <CardShell {...props}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 42%, rgba(245,180,0,0.18), transparent 42%)',
        mixBlendMode: 'screen'
      }}
    />
  </CardShell>
);

export const DiagramCard: React.FC<CardProps> = (props) => (
  <CardShell {...props} fit="contain" showSourceTag={false} showKeywordChips={false} />
);

export const MotionClip: React.FC<CardProps> = ({beat, segment, second}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = localProgress(beat ?? segment, second);
  const title = truncateText(pickAudienceTitle({beat, segment}), 38);
  const body = truncateText(pickAudienceBody({beat, segment}), 72);
  const keywords = cleanAudienceKeywords(beat?.keywords ?? [segment.title], 4).map((keyword) => truncateText(keyword, 12));
  const entrance = spring({
    frame: Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * fps)),
    fps,
    config: {damping: 20, stiffness: 110}
  });
  const sweep = interpolate(progress, [0, 1], [-220, 1080], {easing: Easing.inOut(Easing.ease)});
  const pulse = 0.5 + Math.sin(frame / 8) * 0.5;
  const nodeScale = interpolate(entrance, [0, 1], [0.88, 1]);

  return (
    <div style={{...panelStyle, background: '#060809', borderColor: 'rgba(245,180,0,0.52)'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(rgba(255,255,255,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.11) 1px, transparent 1px), radial-gradient(circle at 50% 44%, rgba(245,180,0,0.18), transparent 48%)',
          backgroundSize: '72px 72px, 72px 72px, 100% 100%'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: sweep,
          width: 160,
          background: 'linear-gradient(90deg, transparent, rgba(245,180,0,0.26), transparent)',
          transform: 'skewX(-12deg)'
        }}
      />
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1048"
        style={{position: 'absolute', inset: 0, overflow: 'visible'}}
      >
        <defs>
          <linearGradient id="motionPath" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(245,180,0,0.08)" />
            <stop offset="55%" stopColor="rgba(245,180,0,0.78)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.55)" />
          </linearGradient>
        </defs>
        <path
          d="M180 690 C300 520 410 520 520 650 S770 780 900 540"
          fill="none"
          stroke="url(#motionPath)"
          strokeWidth="10"
          strokeDasharray="34 22"
          strokeDashoffset={-frame * 2.4}
          strokeLinecap="round"
        />
        <path
          d="M220 360 C370 250 550 290 650 420 S780 590 900 420"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="4"
          strokeDasharray="18 24"
          strokeDashoffset={frame * 1.5}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 66,
          right: 66,
          top: 70,
          color: '#f5b400',
          fontSize: 30,
          lineHeight: 1.15,
          fontWeight: 950,
          letterSpacing: 0
        }}
      >
        机制拆解
      </div>
      <div
        style={{
          position: 'absolute',
          left: 66,
          right: 66,
          top: 128,
          maxHeight: 170,
          overflow: 'hidden',
          color: '#ffffff',
          fontSize: 60,
          lineHeight: 1.12,
          fontWeight: 950,
          textShadow: '0 8px 0 rgba(0,0,0,0.55)',
          wordBreak: 'break-word'
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 66,
          right: 66,
          top: 324,
          maxHeight: 120,
          overflow: 'hidden',
          color: 'rgba(255,255,255,0.78)',
          fontSize: 30,
          lineHeight: 1.34,
          fontWeight: 800,
          wordBreak: 'break-word'
        }}
      >
        {body}
      </div>
      {(keywords.length ? keywords : ['signal', 'path', 'impact']).map((keyword, index) => {
        const x = [150, 452, 738, 588][index] ?? 210;
        const y = [620, 504, 636, 764][index] ?? 700;
        const delay = index * 0.14;
        const opacity = interpolate(progress, [delay, Math.min(1, delay + 0.22)], [0.35, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp'
        });

        return (
          <div
            key={`${keyword}-${index}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 220,
              minHeight: 86,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#fff',
              fontSize: 25,
              lineHeight: 1.18,
              fontWeight: 900,
              wordBreak: 'break-word',
              border: '3px solid rgba(245,180,0,0.78)',
              background: 'rgba(0,0,0,0.68)',
              boxShadow: `0 0 ${22 + pulse * 18}px rgba(245,180,0,0.28)`,
              opacity,
              transform: `translate(-50%, -50%) scale(${nodeScale})`
            }}
          >
            {keyword}
          </div>
        );
      })}
    </div>
  );
};

export const KeywordPunch: React.FC<CardProps> = ({beat, segment, second}) => {
  const keywords = cleanAudienceKeywords(beat?.keywords ?? [segment.title], 2);
  const headline = (keywords.length ? keywords : [pickAudienceTitle({beat, segment})]).map((keyword) => truncateText(keyword, 14)).join(' / ');
  const body = truncateText(pickAudienceBody({beat, segment}), 74);
  const title = truncateText(pickAudienceTitle({beat, segment}), 42);

  return (
    <div style={{...panelStyle, borderColor: '#070707', background: '#f5b400'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(rgba(0,0,0,0.16) 2px, transparent 2px), linear-gradient(90deg, rgba(0,0,0,0.16) 2px, transparent 2px)',
          backgroundSize: '92px 92px'
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 96,
          maxHeight: 108,
          overflow: 'hidden',
          color: '#080808',
          fontSize: 34,
          lineHeight: 1.18,
          fontWeight: 950,
          wordBreak: 'break-word'
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 250,
          maxHeight: 330,
          overflow: 'hidden',
          color: '#080808',
          fontSize: 78,
          lineHeight: 1.08,
          fontWeight: 950,
          wordBreak: 'break-word'
        }}
      >
        {headline}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 112,
          maxHeight: 190,
          overflow: 'hidden',
          color: 'rgba(0,0,0,0.74)',
          fontSize: 31,
          lineHeight: 1.32,
          fontWeight: 850,
          wordBreak: 'break-word'
        }}
      >
        {body}
      </div>
      <div style={{position: 'absolute', right: 42, bottom: 38, color: 'rgba(0,0,0,0.52)', fontSize: 24, fontWeight: 900}}>
        {Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * 10) / 10)}s
      </div>
    </div>
  );
};

export const VisualStage: React.FC<CardProps> = (props) => {
  switch (props.beat?.assetFunction) {
    case 'evidence_screenshot':
      return <EvidenceCard {...props} />;
    case 'product_ui':
    case 'company_person':
      return <BrollCard {...props} />;
    case 'industry_broll':
    case 'commercial_broll':
    case 'real_broll':
      return <BrollCard {...props} />;
    case 'abstract_tech':
      return <ConceptCard {...props} />;
    case 'remotion_motion_clip':
      return <MotionClip {...props} />;
    case 'remotion_diagram':
      return <DiagramCard {...props} />;
    case 'yellow_opinion_card':
      return <KeywordPunch {...props} />;
    default:
      return <BrollCard {...props} />;
  }
};
