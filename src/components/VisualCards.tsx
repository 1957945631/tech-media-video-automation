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
            'radial-gradient(circle at 36% 28%, rgba(245,180,0,0.22), rgba(245,180,0,0.05) 42%, rgba(0,0,0,0) 70%), radial-gradient(circle at 72% 72%, rgba(94,234,212,0.12), rgba(0,0,0,0) 58%), #080808'
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
  const isGeneratedFallback = Boolean(beat?.isGeneratedFallback || beat?.assetStatus === 'generated-fallback');

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
      {showSourceTag && !isGeneratedFallback && <SourceTag segment={segment} beat={beat} />}
      {allowHighlight ? <HighlightEngine enabled={showHighlight} variant="box" /> : null}
      {children}
      {showKeywordChips && !isGeneratedFallback && <KeywordChips keywords={beat?.keywords ?? []} />}
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

const variantKeywords = (beat: VisualBeat | null, segment: Segment, limit = 4) =>
  cleanAudienceKeywords(beat?.keywords ?? [segment.title], limit).map((keyword) => truncateText(keyword, 12));

const VariantHeader: React.FC<{label: string; title: string; body: string; color: string}> = ({label, title, body, color}) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 66,
        right: 66,
        top: 70,
        color,
        fontSize: 30,
        lineHeight: 1.15,
        fontWeight: 950
      }}
    >
      {label}
    </div>
    <div
      style={{
        position: 'absolute',
        left: 66,
        right: 66,
        top: 128,
        maxHeight: 150,
        overflow: 'hidden',
        color: '#fff',
        fontSize: 58,
        lineHeight: 1.12,
        fontWeight: 950,
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
        top: 306,
        maxHeight: 112,
        overflow: 'hidden',
        color: 'rgba(255,255,255,0.76)',
        fontSize: 29,
        lineHeight: 1.34,
        fontWeight: 800,
        wordBreak: 'break-word'
      }}
    >
      {body}
    </div>
  </>
);

const ComparisonPanel: React.FC<CardProps> = ({beat, segment, second}) => {
  const frame = useCurrentFrame();
  const progress = localProgress(beat ?? segment, second);
  const title = truncateText(pickAudienceTitle({beat, segment}), 34);
  const body = truncateText(pickAudienceBody({beat, segment}), 78);
  const keywords = variantKeywords(beat, segment, 3);
  const panels = ['机会', '成本', '风险'].map((label, index) => ({
    label,
    value: keywords[index] ?? ['效率提升', '资源消耗', '边界控制'][index]
  }));

  return (
    <div style={{...panelStyle, background: '#0a0b08', borderColor: 'rgba(245,180,0,0.54)'}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(245,180,0,0.22), transparent 46%), radial-gradient(circle at 82% 22%, rgba(248,113,113,0.18), transparent 42%)'}} />
      <VariantHeader label="三点对比" title={title} body={body} color="#f5b400" />
      <div style={{position: 'absolute', left: 58, right: 58, bottom: 100, display: 'grid', gridTemplateColumns: '1fr', gap: 22}}>
        {panels.map((panel, index) => {
          const active = progress > index * 0.22;
          return (
            <div
              key={panel.label}
              style={{
                minHeight: 118,
                padding: '22px 26px',
                display: 'grid',
                gridTemplateColumns: '150px 1fr',
                alignItems: 'center',
                gap: 18,
                border: '3px solid rgba(255,255,255,0.22)',
                background: active ? 'rgba(245,180,0,0.18)' : 'rgba(255,255,255,0.06)',
                transform: `translateX(${active ? 0 : -18}px)`,
                opacity: active ? 1 : 0.52
              }}
            >
              <div style={{color: '#f5b400', fontSize: 34, fontWeight: 950}}>{panel.label}</div>
              <div style={{color: '#fff', fontSize: 38, lineHeight: 1.12, fontWeight: 950, wordBreak: 'break-word'}}>
                {panel.value}
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: 24,
                  top: 18,
                  width: 96,
                  height: 6,
                  background: `linear-gradient(90deg, #f5b400 ${Math.min(100, progress * 120 + index * 12)}%, rgba(255,255,255,0.16) 0%)`
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', right: 46, top: 48, color: 'rgba(255,255,255,0.16)', fontSize: 96, fontWeight: 950}}>
        {Math.round(frame / 12) % 3 + 1}
      </div>
    </div>
  );
};

const TimelineOrbit: React.FC<CardProps> = ({beat, segment, second}) => {
  const frame = useCurrentFrame();
  const progress = localProgress(beat ?? segment, second);
  const title = truncateText(pickAudienceTitle({beat, segment}), 34);
  const body = truncateText(pickAudienceBody({beat, segment}), 78);
  const points = (variantKeywords(beat, segment, 4).length ? variantKeywords(beat, segment, 4) : ['出现', '扩散', '落地', '影响']);

  return (
    <div style={{...panelStyle, background: '#061014', borderColor: 'rgba(96,165,250,0.5)'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 64%, rgba(96,165,250,0.22), transparent 50%), radial-gradient(circle at 20% 18%, rgba(94,234,212,0.16), transparent 42%)'}} />
      <VariantHeader label="趋势时间线" title={title} body={body} color="#60a5fa" />
      <svg width="100%" height="100%" viewBox="0 0 1080 1048" style={{position: 'absolute', inset: 0}}>
        <path d="M150 710 C320 558 520 552 930 704" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" strokeDasharray="18 18" />
        <path d="M150 710 C320 558 520 552 930 704" fill="none" stroke="#60a5fa" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${progress * 880} 920`} />
      </svg>
      {points.map((point, index) => {
        const x = [160, 382, 658, 914][index] ?? 540;
        const y = [710, 594, 592, 704][index] ?? 650;
        const active = progress > index / points.length;
        return (
          <div key={`${point}-${index}`} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${Math.sin(frame / 18 + index) * 3}deg)`}}>
            <div style={{width: 38, height: 38, borderRadius: 99, background: active ? '#60a5fa' : 'rgba(255,255,255,0.24)', boxShadow: active ? '0 0 34px rgba(96,165,250,0.5)' : 'none'}} />
            <div style={{marginTop: 18, width: 190, color: '#fff', fontSize: 27, lineHeight: 1.14, fontWeight: 900, textAlign: 'center', wordBreak: 'break-word'}}>
              {point}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const SignalStack: React.FC<CardProps> = ({beat, segment, second}) => {
  const frame = useCurrentFrame();
  const progress = localProgress(beat ?? segment, second);
  const title = truncateText(pickAudienceTitle({beat, segment}), 34);
  const body = truncateText(pickAudienceBody({beat, segment}), 78);
  const layers = (variantKeywords(beat, segment, 5).length ? variantKeywords(beat, segment, 5) : ['模型', '工具', '流程', '成本', '边界']);

  return (
    <div style={{...panelStyle, background: '#090811', borderColor: 'rgba(167,139,250,0.52)'}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(167,139,250,0.18), transparent 60%), radial-gradient(circle at 78% 74%, rgba(245,180,0,0.16), transparent 48%)'}} />
      <VariantHeader label="信号堆叠" title={title} body={body} color="#a78bfa" />
      <div style={{position: 'absolute', left: 104, right: 104, bottom: 92, display: 'flex', flexDirection: 'column-reverse', gap: 16}}>
        {layers.map((layer, index) => {
          const active = progress > index / (layers.length + 1);
          return (
            <div
              key={`${layer}-${index}`}
              style={{
                height: 72,
                padding: '0 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#fff',
                fontSize: 30,
                fontWeight: 950,
                background: active ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.07)',
                border: '2px solid rgba(167,139,250,0.5)',
                transform: `translateX(${Math.sin(frame / 16 + index) * 8}px) scaleX(${active ? 1 : 0.92})`,
                transformOrigin: 'left center'
              }}
            >
              <span>{layer}</span>
              <span style={{color: '#a78bfa'}}>{String(index + 1).padStart(2, '0')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SummaryMatrix: React.FC<CardProps> = ({beat, segment, second}) => {
  const progress = localProgress(beat ?? segment, second);
  const title = truncateText(pickAudienceTitle({beat, segment}), 32);
  const body = truncateText(pickAudienceBody({beat, segment}), 76);
  const keywords = variantKeywords(beat, segment, 4);
  const cells = ['模型能力', '工具接入', '成本控制', '安全边界'].map((label, index) => ({
    label,
    value: keywords[index] ?? ['变强', '变深', '变贵', '变重要'][index]
  }));

  return (
    <div style={{...panelStyle, background: '#07100c', borderColor: 'rgba(52,211,153,0.54)'}}>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 22% 22%, rgba(52,211,153,0.18), transparent 42%), linear-gradient(135deg, transparent, rgba(245,180,0,0.1))'}} />
      <VariantHeader label="总结矩阵" title={title} body={body} color="#34d399" />
      <div style={{position: 'absolute', left: 72, right: 72, bottom: 94, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
        {cells.map((cell, index) => {
          const active = progress > index * 0.18;
          return (
            <div
              key={cell.label}
              style={{
                height: 160,
                padding: 22,
                border: '3px solid rgba(52,211,153,0.58)',
                background: active ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)',
                color: '#fff',
                opacity: active ? 1 : 0.48
              }}
            >
              <div style={{fontSize: 28, fontWeight: 900, color: '#34d399'}}>{cell.label}</div>
              <div style={{marginTop: 22, fontSize: 40, lineHeight: 1.12, fontWeight: 950, wordBreak: 'break-word'}}>{cell.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MotionClip: React.FC<CardProps> = ({beat, segment, second}) => {
  if (beat?.animationVariant === 'comparison_panel') {
    return <ComparisonPanel beat={beat} segment={segment} second={second} />;
  }
  if (beat?.animationVariant === 'timeline_orbit') {
    return <TimelineOrbit beat={beat} segment={segment} second={second} />;
  }
  if (beat?.animationVariant === 'signal_stack') {
    return <SignalStack beat={beat} segment={segment} second={second} />;
  }
  if (beat?.animationVariant === 'summary_matrix') {
    return <SummaryMatrix beat={beat} segment={segment} second={second} />;
  }

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
            'radial-gradient(circle at 24% 28%, rgba(245,180,0,0.22), rgba(245,180,0,0.06) 38%, rgba(0,0,0,0) 66%), radial-gradient(circle at 78% 68%, rgba(94,234,212,0.16), rgba(0,0,0,0) 58%)'
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

export const DiagramMotion: React.FC<CardProps> = ({beat, segment, second}) => {
  if (beat?.animationVariant === 'comparison_panel') {
    return <ComparisonPanel beat={beat} segment={segment} second={second} />;
  }
  if (beat?.animationVariant === 'timeline_orbit') {
    return <TimelineOrbit beat={beat} segment={segment} second={second} />;
  }
  if (beat?.animationVariant === 'signal_stack') {
    return <SignalStack beat={beat} segment={segment} second={second} />;
  }
  if (beat?.animationVariant === 'summary_matrix') {
    return <SummaryMatrix beat={beat} segment={segment} second={second} />;
  }

  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const progress = localProgress(beat ?? segment, second);
  const title = truncateText(pickAudienceTitle({beat, segment}), 34);
  const body = truncateText(pickAudienceBody({beat, segment}), 78);
  const keywords = cleanAudienceKeywords(beat?.keywords ?? [segment.title], 4).map((keyword) => truncateText(keyword, 12));
  const entrance = spring({
    frame: Math.max(0, Math.round((second - (beat?.start ?? segment.start)) * fps)),
    fps,
    config: {damping: 18, stiffness: 105}
  });
  const flow = interpolate(progress, [0, 1], [0, 1], {easing: Easing.inOut(Easing.ease)});
  const nodes = (keywords.length ? keywords : ['来源', '机制', '影响', '落点']).slice(0, 4);

  return (
    <div style={{...panelStyle, background: '#07100e', borderColor: 'rgba(94,234,212,0.52)'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 18% 20%, rgba(94,234,212,0.2), rgba(0,0,0,0) 42%), radial-gradient(circle at 82% 74%, rgba(245,180,0,0.18), rgba(0,0,0,0) 50%)'
        }}
      />
      <svg width="100%" height="100%" viewBox="0 0 1080 1048" style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="diagramFlow" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(94,234,212,0.16)" />
            <stop offset="55%" stopColor="rgba(94,234,212,0.88)" />
            <stop offset="100%" stopColor="rgba(245,180,0,0.72)" />
          </linearGradient>
        </defs>
        <path
          d="M190 642 C330 520 440 520 540 642 S760 760 890 606"
          fill="none"
          stroke="url(#diagramFlow)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(80, flow * 760)} 900`}
          opacity={0.9}
        />
        <path
          d="M238 426 L842 426"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="18 22"
          strokeDashoffset={-frame * 1.8}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 66,
          right: 66,
          top: 70,
          color: '#5eead4',
          fontSize: 30,
          lineHeight: 1.15,
          fontWeight: 950
        }}
      >
        结构图解
      </div>
      <div
        style={{
          position: 'absolute',
          left: 66,
          right: 66,
          top: 128,
          maxHeight: 150,
          overflow: 'hidden',
          color: '#ffffff',
          fontSize: 58,
          lineHeight: 1.12,
          fontWeight: 950,
          transform: `translateY(${interpolate(entrance, [0, 1], [18, 0])}px)`
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 66,
          right: 66,
          top: 304,
          maxHeight: 112,
          overflow: 'hidden',
          color: 'rgba(255,255,255,0.76)',
          fontSize: 29,
          lineHeight: 1.34,
          fontWeight: 800
        }}
      >
        {body}
      </div>
      {nodes.map((keyword, index) => {
        const x = [190, 424, 656, 890][index] ?? 540;
        const y = [642, 520, 642, 606][index] ?? 620;
        const active = progress > index / Math.max(1, nodes.length);
        return (
          <div
            key={`${keyword}-${index}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 190,
              minHeight: 92,
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: active ? '#07100e' : '#fff',
              fontSize: 25,
              lineHeight: 1.16,
              fontWeight: 950,
              wordBreak: 'break-word',
              border: '3px solid rgba(94,234,212,0.82)',
              background: active ? 'rgba(94,234,212,0.92)' : 'rgba(0,0,0,0.66)',
              boxShadow: active ? '0 0 34px rgba(94,234,212,0.36)' : '0 12px 42px rgba(0,0,0,0.36)',
              transform: `translate(-50%, -50%) scale(${interpolate(entrance, [0, 1], [0.9, 1])})`
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
            'radial-gradient(circle at 24% 22%, rgba(255,255,255,0.28), rgba(255,255,255,0) 42%), radial-gradient(circle at 78% 76%, rgba(0,0,0,0.18), rgba(0,0,0,0) 56%)'
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
      return <DiagramMotion {...props} />;
    case 'yellow_opinion_card':
      return <KeywordPunch {...props} />;
    default:
      return <BrollCard {...props} />;
  }
};
