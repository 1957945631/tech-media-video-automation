import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMedia} from '@remotion/media-parser';
import {nodeReader} from '@remotion/media-parser/node';
import {parseSrt, secondsToTsLiteral} from './srt_utils.mjs';
import {captionRangeToTime, validateVisualBeats} from './visual_beats_utils.mjs';
import {segmentBoundaries, storyPlan, visualBeatPlan} from './visual_beat_plan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const date = process.argv[2];

if (!date) {
  console.error('Usage: node scripts/build_episode_from_srt.mjs YYYY-MM-DD');
  process.exit(1);
}

const quote = (value) => JSON.stringify(value);

const mediaDuration = async (file) => {
  const result = await parseMedia({
    src: file,
    reader: nodeReader,
    acknowledgeRemotionLicense: true,
    fields: {durationInSeconds: true}
  });

  return result.durationInSeconds;
};

const firstSentence = (text) => {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= 68) {
    return normalized;
  }

  return `${normalized.slice(0, 67)}…`;
};

const loadJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const loadAssets = async () => {
  const manifest = await loadJson(path.join(root, 'data', 'assets', date, 'assets-manifest.json'), {items: []});
  return new Map(manifest.items.map((item) => [item.id, item.assets ?? []]));
};

const loadBeatAssets = async () => {
  const manifest = await loadJson(path.join(root, 'data', 'assets', date, 'visual-beats.json'), {visualBeats: []});
  return new Map(manifest.visualBeats.map((beat) => [beat.id, beat.assets ?? []]));
};

const buildSegment = ({id, start, end, kicker, title, body, ribbon, accent, sourceName, risk, assets}) => ({
  id,
  start,
  end,
  kicker,
  title,
  body,
  ribbon,
  accent,
  sourceName,
  risk,
  assets
});

const propLine = (key, value) => `      ${key}: ${value}`;

const toTsObject = (value, extra = []) => {
  const entries = Object.entries(value).flatMap(([key, item]) => {
    if (item === undefined || item === null) return [];
    if (typeof item === 'number') return [propLine(key, secondsToTsLiteral(item))];
    if (Array.isArray(item)) return [propLine(key, JSON.stringify(item))];
    return [propLine(key, quote(item))];
  });

  return `    {\n${[...entries, ...extra].join(',\n')}\n    }`;
};

const main = async () => {
  const daily = JSON.parse(await fs.readFile(path.join(root, 'data', 'daily', `${date}.json`), 'utf8'));
  const captions = parseSrt(await fs.readFile(path.join(root, 'data', 'subtitles', `${date}-aligned.srt`), 'utf8'));
  const audioDuration = await mediaDuration(path.join(root, 'public', 'audio', `${date}-voiceover.mp3`));
  const durationSeconds = Math.max(audioDuration, captions.at(-1)?.end ?? 0);
  const byId = new Map(daily.items.map((item) => [item.id, item]));
  const assetsById = await loadAssets();
  const beatAssetsById = await loadBeatAssets();

  const segments = segmentBoundaries.map((boundary) => {
    const start = captions[boundary.startCaption]?.start ?? 0;
    const nextStart = captions[boundary.endCaption]?.start;
    const end = boundary.segment === 'outro' ? durationSeconds : nextStart ?? durationSeconds;

    if (boundary.segment === 'intro') {
      return buildSegment({
        id: 'intro',
        start,
        end,
        kicker: '真实素材测试',
        title: '一周科技大事',
        body: '本期素材、字幕和时长都从真实抓取内容与最终配音生成。',
        ribbon: 'SRT 时间码驱动字幕，关键句素材驱动画面',
        accent: '#f5b400',
        sourceName: `reports/${date}.md`,
        assets: []
      });
    }

    if (boundary.segment === 'outro') {
      return buildSegment({
        id: 'outro',
        start,
        end,
        kicker: '总结',
        title: '今天的主线很清楚',
        body: 'AI 正从模型热点，扩散到设备、标准、监管和基础设施。',
        ribbon: '复杂科技新闻，讲成能听懂的版本',
        accent: '#f5b400',
        sourceName: `${date} 日报`,
        assets: []
      });
    }

    const plan = storyPlan.find((item) => item.segmentId === boundary.segment);
    const item = byId.get(plan.id);

    return buildSegment({
      id: plan.segmentId,
      start,
      end,
      kicker: plan.kicker,
      title: plan.title,
      body: firstSentence(item?.summary_zh),
      ribbon: plan.ribbon,
      accent: plan.accent,
      sourceName: item?.source_name,
      risk: plan.risk,
      assets: assetsById.get(plan.id) ?? []
    });
  });

  const visualBeats = visualBeatPlan.map((beat) => {
    const {start, end} = captionRangeToTime(beat.captionRange, captions, durationSeconds);
    return {
      id: beat.id,
      segmentId: beat.segmentId,
      start,
      end,
      captionRange: beat.captionRange,
      intent: beat.intent,
      keywords: beat.keywords,
      overlayTitle: beat.overlayTitle,
      assets: beatAssetsById.get(beat.id) ?? []
    };
  });

  const visualBeatProblems = validateVisualBeats({beats: visualBeats, segments, captions, durationSeconds});
  if (visualBeatProblems.length) {
    throw new Error(`visualBeats invalid:\n${visualBeatProblems.join('\n')}`);
  }

  const source = `export type Segment = {
  id: string;
  start: number;
  end: number;
  kicker: string;
  title: string;
  body: string;
  accent: string;
  ribbon: string;
  asset?: string;
  assets?: string[];
  sourceName?: string;
  risk?: string;
};

export type Caption = {
  start: number;
  end: number;
  text: string;
};

export type VisualBeat = {
  id: string;
  segmentId: string;
  start: number;
  end: number;
  captionRange: [number, number];
  intent: string;
  keywords: string[];
  overlayTitle: string;
  assets: string[];
};

export type VideoData = {
  fps: number;
  durationInFrames: number;
  title: string;
  subtitle: string;
  date: string;
  voiceover?: string;
  captions: Caption[];
  segments: Segment[];
  visualBeats: VisualBeat[];
};

const fps = 30;
const durationSeconds = ${secondsToTsLiteral(durationSeconds)};

export const videoData: VideoData = {
  fps,
  durationInFrames: Math.ceil(durationSeconds * fps),
  title: '一周科技大事',
  subtitle: '硅基打底',
  date: ${quote(date)},
  voiceover: ${quote(`audio/${date}-voiceover.mp3`)},
  segments: [
${segments.map((segment) => toTsObject(segment)).join(',\n')}
  ],
  visualBeats: [
${visualBeats.map((beat) => toTsObject(beat)).join(',\n')}
  ],
  captions: [
${captions
  .map(
    (caption) =>
      `    {start: ${secondsToTsLiteral(caption.start)}, end: ${secondsToTsLiteral(caption.end)}, text: ${quote(caption.text)}}`
  )
  .join(',\n')}
  ]
};
`;

  await fs.writeFile(path.join(root, 'src', 'videoData.ts'), source, 'utf8');
  console.log(JSON.stringify({date, durationSeconds, captions: captions.length, segments: segments.length, visualBeats: visualBeats.length}, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
