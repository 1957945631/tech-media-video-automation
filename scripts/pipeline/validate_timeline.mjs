import fs from 'node:fs';
import path from 'node:path';
import {parseMedia} from '@remotion/media-parser';
import {nodeReader} from '@remotion/media-parser/node';
import {validateAssetRhythm} from '../asset_function_rules.mjs';
import {isVisualRhythmProblem, validateVisualBeats} from '../visual_beats_utils.mjs';

const root = process.cwd();
const dataPath = path.join(root, 'src', 'data', 'currentEpisode.ts');
const videoPath = process.argv[2] ? path.resolve(root, process.argv[2]) : null;

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const round = (n) => Math.round(n * 1000) / 1000;

const extractNumber = (source, pattern, label) => {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`无法读取 ${label}`);
  }

  return Number(match[1]);
};

const extractBlocks = (source, arrayName) => {
  const start = source.indexOf(`${arrayName}: [`);
  if (start === -1) {
    throw new Error(`无法找到 ${arrayName}`);
  }

  const endMarker =
    arrayName === 'segments'
      ? '\n  ],\n  visualBeats:'
      : arrayName === 'captions'
        ? '\n  ]\n}'
        : '\n  ],';
  const end = source.indexOf(endMarker, start);
  if (end === -1) {
    throw new Error(`无法找到 ${arrayName} 结束位置`);
  }

  return source
    .slice(start, end)
    .split(/\n    \{/)
    .slice(1)
    .map((block) => {
      const startMatch = block.match(/start: ([0-9.]+)/);
      const endMatch = block.match(/end: ([0-9.]+)/);
      const idMatch = block.match(/id: ["']([^"']+)["']/);
      const textMatch = block.match(/text: ["']([^"']+)["']/);

      return {
        id: idMatch?.[1] ?? textMatch?.[1]?.slice(0, 12) ?? 'unknown',
        start: Number(startMatch?.[1]),
        end: Number(endMatch?.[1])
      };
    });
};

const extractVisualBeats = (source) => {
  const start = source.indexOf('visualBeats: [');
  if (start === -1) {
    return [];
  }

  const end = source.indexOf('\n  ],\n  captions:', start);
  if (end === -1) {
    throw new Error('无法找到 visualBeats 结束位置');
  }

  return source
    .slice(start, end)
    .split(/\n    \{/)
    .slice(1)
    .map((block) => {
      const idMatch = block.match(/id: ["']([^"']+)["']/);
      const segmentMatch = block.match(/segmentId: ["']([^"']+)["']/);
      const startMatch = block.match(/start: ([0-9.]+)/);
      const endMatch = block.match(/end: ([0-9.]+)/);
      const rangeMatch = block.match(/captionRange: \[([0-9]+),([0-9]+)\]/);
      const titleMatch = block.match(/overlayTitle: ["']([^"']+)["']/);
      const subjectMatch = block.match(/subject: ["']([^"']+)["']/);
      const actionMatch = block.match(/action: ["']([^"']+)["']/);
      const conceptMatch = block.match(/concept: ["']([^"']+)["']/);
      const visualRoleMatch = block.match(/visualRole: ["']([^"']+)["']/);
      const assetFunctionMatch = block.match(/assetFunction: ["']([^"']+)["']/);
      const transitionOutMatch = block.match(/transitionOut: ["']([^"']+)["']/);
      const assetsMatch = block.match(/assets: (\[[^\n]+\])/);
      let assets = [];

      if (assetsMatch) {
        try {
          assets = JSON.parse(assetsMatch[1]);
        } catch {
          assets = [];
        }
      }

      return {
        id: idMatch?.[1] ?? 'unknown',
        segmentId: segmentMatch?.[1] ?? 'unknown',
        start: Number(startMatch?.[1]),
        end: Number(endMatch?.[1]),
        captionRange: rangeMatch ? [Number(rangeMatch[1]), Number(rangeMatch[2])] : [],
        overlayTitle: titleMatch?.[1] ?? '',
        subject: subjectMatch?.[1] ?? '',
        action: actionMatch?.[1] ?? '',
        concept: conceptMatch?.[1] ?? '',
        visualRole: visualRoleMatch?.[1],
        assetFunction: assetFunctionMatch?.[1],
        transitionOut: transitionOutMatch?.[1],
        hasHighlight: /(?:highlight|hasHighlight):/.test(block),
        assets
      };
    });
};

const checkContinuity = (items, label, options = {}) => {
  const tolerance = options.tolerance ?? 0.04;
  const allowGaps = options.allowGaps ?? false;
  const problems = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!Number.isFinite(item.start) || !Number.isFinite(item.end)) {
      problems.push(`${label}[${index}] 时间不是有效数字`);
      continue;
    }

    if (item.end <= item.start) {
      problems.push(`${label}[${index}] ${item.id} end <= start`);
    }

    const previous = items[index - 1];
    if (previous) {
      const gap = item.start - previous.end;
      const hasProblem = allowGaps ? gap < -tolerance : Math.abs(gap) > tolerance;
      if (hasProblem) {
        problems.push(`${label}[${index}] ${previous.id} -> ${item.id} 间隔/重叠 ${round(gap)}s`);
      }
    }
  }

  return problems;
};

const mediaDuration = async (file) => {
  const result = await parseMedia({
    src: file,
    reader: nodeReader,
    acknowledgeRemotionLicense: true,
    fields: {durationInSeconds: true, audioCodec: true, videoCodec: true}
  });

  return result;
};

const main = async () => {
  const source = read(dataPath);
  const durationSeconds = extractNumber(source, /const durationSeconds = ([0-9.]+);/, 'durationSeconds');
  const fps = extractNumber(source, /const fps = ([0-9.]+);/, 'fps');
  const voiceover = source.match(/voiceover:\s*['"]([^'"]+)['"]/)?.[1];
  const segments = extractBlocks(source, 'segments');
  const captions = extractBlocks(source, 'captions');
  const visualBeats = extractVisualBeats(source);
  const visualBeatProblems = validateVisualBeats({beats: visualBeats, segments, captions, durationSeconds});
  const assetRhythmProblems = validateAssetRhythm(visualBeats);
  const rhythmWarnings = [...visualBeatProblems, ...assetRhythmProblems].filter(isVisualRhythmProblem);
  const problems = [
    ...checkContinuity(segments, 'segments'),
    ...checkContinuity(captions, 'captions', {allowGaps: true}),
    ...visualBeatProblems.filter((problem) => !isVisualRhythmProblem(problem)),
    ...assetRhythmProblems.filter((problem) => !isVisualRhythmProblem(problem))
  ];

  if (/审核提醒|瀹℃牳鎻愰啋|risk\s*:/.test(source)) {
    problems.push('观众版 episode 数据不能包含 risk 或审核提醒文案');
  }

  const finalSegmentEnd = segments.at(-1)?.end ?? 0;
  const finalCaptionEnd = captions.at(-1)?.end ?? 0;

  if (Math.abs(finalSegmentEnd - durationSeconds) > 0.06) {
    problems.push(`最后一个画面段落结束 ${round(finalSegmentEnd)}s，不等于总时长 ${round(durationSeconds)}s`);
  }

  if (finalCaptionEnd - durationSeconds > 0.06) {
    problems.push(`最后一条字幕结束 ${round(finalCaptionEnd)}s，超过总时长 ${round(durationSeconds)}s`);
  }

  let audioInfo = null;
  if (voiceover) {
    audioInfo = await mediaDuration(path.join(root, 'public', voiceover));
    const diff = (audioInfo.durationInSeconds ?? 0) - durationSeconds;
    if (Math.abs(diff) > 0.1) {
      problems.push(`配音时长与总时长相差 ${round(diff)}s`);
    }
  }

  let videoInfo = null;
  if (videoPath) {
    videoInfo = await mediaDuration(videoPath);
    const diff = (videoInfo.durationInSeconds ?? 0) - durationSeconds;
    if (Math.abs(diff) > 0.12) {
      problems.push(`视频时长与总时长相差 ${round(diff)}s`);
    }
  }

  const report = {
    ok: problems.length === 0,
    fps,
    durationSeconds: round(durationSeconds),
    durationInFrames: Math.ceil(durationSeconds * fps),
    segments: segments.length,
    captions: captions.length,
    visualBeats: visualBeats.length,
    audioDuration: audioInfo?.durationInSeconds ? round(audioInfo.durationInSeconds) : null,
    videoDuration: videoInfo?.durationInSeconds ? round(videoInfo.durationInSeconds) : null,
    problems,
    warnings: rhythmWarnings
  };

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
