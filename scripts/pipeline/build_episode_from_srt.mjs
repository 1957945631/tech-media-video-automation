import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMedia} from '@remotion/media-parser';
import {nodeReader} from '@remotion/media-parser/node';
import {assignAssetFunction} from '../asset_function_rules.mjs';
import {parseSrt, secondsToTsLiteral} from '../srt_utils.mjs';
import {captionRangeToTime, validateVisualBeats} from '../visual_beats_utils.mjs';
import {segmentBoundaries, storyPlan, visualBeatPlan} from '../visual_beat_plan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
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

  return `${normalized.slice(0, 67)}...`;
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
  return new Map((manifest.items ?? []).map((item) => [item.id, item.assets ?? []]));
};

const loadBeatAssets = async () => {
  const manifest = await loadJson(path.join(root, 'data', 'assets', date, 'visual-beats.json'), {visualBeats: []});
  return new Map((manifest.visualBeats ?? []).map((beat) => [beat.id, beat.assets ?? []]));
};

const buildSegment = ({id, start, end, kicker, title, body, ribbon, accent, sourceName, assets}) => ({
  id,
  start,
  end,
  kicker,
  title,
  body,
  ribbon,
  accent,
  sourceName,
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
        kicker: '本期导览',
        title: '一周科技大事',
        body: '本期按最终配音和 SRT 生成时间线，用真实证据、产品界面、产业画面、动态图解和观点卡讲清楚一周科技变化。',
        ribbon: 'SRT 驱动字幕，visual beats 驱动画面',
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
        title: '科技变化正在进入现实',
        body: '一周科技大事不只看 AI，也看芯片、平台、设备、开源安全和基础设施如何影响普通人的生活。',
        ribbon: '复杂科技新闻，讲成能听懂的版本',
        accent: '#f5b400',
        sourceName: `${date} 日报`,
        assets: []
      });
    }

    const plan = storyPlan.find((item) => item.segmentId === boundary.segment);
    if (!plan) {
      throw new Error(`Missing storyPlan entry for segment ${boundary.segment}`);
    }

    const item = byId.get(plan.id);

    return buildSegment({
      id: plan.segmentId,
      start,
      end,
      kicker: plan.kicker,
      title: plan.title,
      body: firstSentence(item?.summary_zh ?? item?.summary ?? plan.body),
      ribbon: plan.ribbon,
      accent: plan.accent,
      sourceName: item?.source_name ?? plan.sourceName,
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
      subject: beat.subject,
      action: beat.action,
      concept: beat.concept,
      visualRole: beat.visualRole,
      assetFunction: assignAssetFunction(beat),
      keywords: beat.keywords,
      assetQuery: beat.assetQuery,
      overlayTitle: beat.overlayTitle,
      transitionOut: beat.transitionOut,
      highlight: beat.highlight,
      hasHighlight: beat.hasHighlight,
      assets: beatAssetsById.get(beat.id) ?? []
    };
  });

  const visualBeatProblems = validateVisualBeats({beats: visualBeats, segments, captions, durationSeconds});
  if (visualBeatProblems.length) {
    throw new Error(`visualBeats invalid:\n${visualBeatProblems.join('\n')}`);
  }

  const source = `import type {VideoData} from '../types/video';

const fps = 30;
const durationSeconds = ${secondsToTsLiteral(durationSeconds)};

export const videoData = {
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
} satisfies VideoData;
`;

  await fs.mkdir(path.join(root, 'src', 'data'), {recursive: true});
  await fs.writeFile(path.join(root, 'src', 'data', 'currentEpisode.ts'), source, 'utf8');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
