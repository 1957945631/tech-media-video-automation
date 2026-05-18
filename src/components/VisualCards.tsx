import React from 'react';
import {Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Video} from 'remotion';
import type {Segment, VisualBeat} from '../types/video';
import {isVideoAsset, pickAsset, visualLabel} from '../rendering/assets';
import {localProgress} from '../rendering/timeline';
import {HighlightEngine} from './HighlightEngine';

type CardProps = {
  segment: Segment;
  beat: VisualBeat | null;
  second: number;
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
  if (!keywords.length) {
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
      {keywords.slice(0, 4).map((keyword) => (
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

const MediaFill: React.FC<{asset: string | null; progress: number; fit?: 'cover' | 'contain'}> = ({asset, progress, fit = 'cover'}) => {
  const zoom = interpolate(progress, [0, 1], [1.02, 1.13], {easing: Easing.inOut(Easing.ease)});

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
    objectPosition: 'top center',
    transform: `scale(${zoom}) translateY(${interpolate(progress, [0, 1], [0, -34])}px)`,
    filter: 'contrast(1.12) saturate(0.9) brightness(0.82)'
  };

  return isVideoAsset(asset) ? <Video src={staticFile(asset)} muted loop style={commonStyle} /> : <Img src={staticFile(asset)} style={commonStyle} />;
};

const CardShell: React.FC<CardProps & {children?: React.ReactNode; fit?: 'cover' | 'contain'; highlight?: boolean}> = ({
  segment,
  beat,
  second,
  children,
  fit,
  highlight
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * fps));
  const entrance = spring({frame: localFrame, fps, config: {damping: 18, stiffness: 120}});
  const progress = localProgress(beat ?? segment, second);
  const asset = pickAsset(segment, beat, second);

  return (
    <div
      style={{
        ...panelStyle,
        transform: `translateY(${interpolate(entrance, [0, 1], [34, 0])}px) rotate(${Math.sin(frame / 9) / 10}deg)`,
        opacity: interpolate(entrance, [0, 1], [0.35, 1])
      }}
    >
      <MediaFill asset={asset} progress={progress} fit={fit} />
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.52))'}} />
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
      <SourceTag segment={segment} beat={beat} />
      {highlight && !beat?.hasHighlight ? <HighlightEngine enabled variant="box" /> : null}
      {children}
      <KeywordChips keywords={beat?.keywords ?? []} />
    </div>
  );
};

export const EvidenceCard: React.FC<CardProps> = (props) => <CardShell {...props} fit="contain" highlight />;

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

export const DiagramCard: React.FC<CardProps> = ({beat, ...props}) => (
  <CardShell beat={beat} {...props} fit="contain">
    <div
      style={{
        position: 'absolute',
        left: 96,
        right: 96,
        top: 324,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 18
      }}
    >
      {(beat?.keywords ?? []).slice(0, 6).map((keyword) => (
        <div
          key={keyword}
          style={{
            minHeight: 118,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 16,
            border: '3px solid #f5b400',
            background: 'rgba(0,0,0,0.64)',
            color: '#fff',
            fontSize: 28,
            fontWeight: 950
          }}
        >
          {keyword}
        </div>
      ))}
    </div>
  </CardShell>
);

export const KeywordPunch: React.FC<CardProps> = ({beat, segment, second}) => (
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
    <div style={{position: 'absolute', left: 64, right: 64, top: 110, color: '#080808', fontSize: 38, fontWeight: 950}}>
      {beat?.overlayTitle ?? segment.kicker}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        top: 260,
        color: '#080808',
        fontSize: 92,
        lineHeight: 1.04,
        fontWeight: 950
      }}
    >
      {(beat?.keywords ?? [segment.title]).slice(0, 2).join(' / ')}
    </div>
    <div style={{position: 'absolute', left: 64, right: 64, bottom: 120, color: 'rgba(0,0,0,0.74)', fontSize: 34, lineHeight: 1.28, fontWeight: 850}}>
      {beat?.intent ?? segment.body}
    </div>
    <div style={{position: 'absolute', right: 42, bottom: 38, color: 'rgba(0,0,0,0.52)', fontSize: 24, fontWeight: 900}}>
      {Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * 10) / 10)}s
    </div>
  </div>
);

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
    case 'remotion_diagram':
      return <DiagramCard {...props} />;
    case 'yellow_opinion_card':
      return <KeywordPunch {...props} />;
    default:
      return <BrollCard {...props} />;
  }
};
