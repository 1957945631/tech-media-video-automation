import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {buildVisualPlan, chooseBestSource, validateSourceUsage} from '../visual_beat_plan.mjs';
import {mergeResearchSourcesIntoPools, normalizeResearchSources} from '../asset_research_sources.mjs';
import {assignAssetFunction, countAssetInventory, normalizeInventoryFunction, validateAssetInventory} from '../asset_function_rules.mjs';
import {cleanAudienceKeywords, pickAudienceBody, pickAudienceTitle} from '../audience_copy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..');
const date = process.argv[2];

if (!date) {
  console.error('Usage: node scripts/capture_daily_assets.mjs YYYY-MM-DD');
  process.exit(1);
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const dataAssetDir = path.join(root, 'data', 'assets', date);
const publicAssetDir = path.join(root, 'public', 'assets', date);
const manifestPath = path.join(dataAssetDir, 'assets-manifest.json');
const visualBeatsPath = path.join(dataAssetDir, 'visual-beats.json');
const selectionPath = path.join(root, 'data', 'selected', `${date}-selection.json`);
const voiceoverPath = path.join(root, 'data', 'video-scripts', `${date}-voiceover.md`);
const skillResearchPath = path.join(dataAssetDir, 'news-aggregator-research.json');
const componentRenderedAssetFunctions = new Set(['remotion_motion_clip', 'remotion_diagram']);
const promotableCaptureFunctions = new Set(['real_broll', 'industry_broll', 'commercial_broll', 'product_ui', 'company_person']);

const requiredProductionInputs = [
  path.join(root, 'data', 'video-scripts', `${date}-voiceover.md`),
  path.join(root, 'data', 'audio', `${date}-voiceover.mp3`),
  path.join(root, 'public', 'audio', `${date}-voiceover.mp3`),
  path.join(root, 'data', 'subtitles', `${date}-aligned.srt`)
];

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const slugify = (value) =>
  String(value ?? 'asset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 88) || 'asset';

const dismissCommonOverlays = async (page) => {
  const labels = ['Accept', 'Accept all', 'I agree', 'Agree', 'Got it', 'Continue', '同意', '接受', '我知道了', '继续'];

  for (const label of labels) {
    const button = page.getByRole('button', {name: new RegExp(label, 'i')}).first();
    try {
      if (await button.isVisible({timeout: 400})) {
        await button.click({timeout: 900});
      }
    } catch {
      // Overlay absent or not clickable.
    }
  }
};

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
};

const readText = async (file, fallback = '') => {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
};

const ensureProductionInputs = async () => {
  const missing = [];
  for (const file of requiredProductionInputs) {
    try {
      await fs.access(file);
    } catch {
      missing.push(path.relative(root, file).replaceAll(path.sep, '/'));
    }
  }

  if (missing.length) {
    throw new Error(
      `Missing production inputs before asset capture:\n${missing.join('\n')}\nRun five-day selection, confirm voiceover script, then add final MP3/SRT before capture:daily-assets.`
    );
  }
};

const cleanGeneratedAssetDir = async (dir) => {
  await fs.mkdir(dir, {recursive: true});
  const entries = await fs.readdir(dir, {withFileTypes: true});
  const generatedExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.mp4', '.webm', '.mov', '.m4v']);
  const generatedFiles = new Set(['assets-manifest.json', 'visual-beats.json']);

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    const target = path.join(dir, entry.name);
    if (generatedExtensions.has(path.extname(entry.name).toLowerCase()) || generatedFiles.has(entry.name)) {
      await fs.rm(target, {force: true});
    }
  }
};

const buildSourcePools = async (selection) => {
  const skillResearch = await readJson(skillResearchPath, []);
  const skillResearchSources = normalizeResearchSources(skillResearch, {limit: 80});
  const selectedSources = [...(selection.recommended ?? []), ...(selection.candidates ?? [])]
    .filter((item) => item.source_url)
    .map((item) => ({
      name: item.source_name ?? item.title,
      title: item.title,
      url: item.source_url
    }));
  return mergeResearchSourcesIntoPools({
    evidence_screenshot: selectedSources,
    company_person: [],
    product_ui: [],
    real_broll: [],
    industry_broll: [],
    commercial_broll: []
  }, skillResearchSources);
};

const fitText = (value, limit) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

const fontSizeFor = (text, shortSize, mediumSize, longSize) => {
  const length = String(text ?? '').length;
  if (length > 44) return longSize;
  if (length > 26) return mediumSize;
  return shortSize;
};

const cardShell = ({kicker, title, body, chips = [], source = '', tone = 'dark', diagram = false}) => {
  const cleanTitle = fitText(title, diagram ? 38 : 34);
  const cleanBody = fitText(body, diagram ? 118 : 92);
  const cleanChips = chips.map((chip) => fitText(chip, 16)).slice(0, diagram ? 4 : 6);
  const titleSize = fontSizeFor(cleanTitle, tone === 'yellow' ? 82 : 72, tone === 'yellow' ? 66 : 58, tone === 'yellow' ? 54 : 48);
  const bodySize = fontSizeFor(cleanBody, 32, 28, 24);
  const sourceText = fitText(source, 88);

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1080px;
      height: 1160px;
      overflow: hidden;
      font-family: "Microsoft YaHei", Arial, sans-serif;
      background: ${tone === 'yellow' ? '#f5b400' : '#050505'};
      color: ${tone === 'yellow' ? '#080808' : '#fff'};
    }
    .ambient {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 18% 18%, ${tone === 'yellow' ? 'rgba(255,255,255,.3)' : 'rgba(245,180,0,.18)'}, transparent 34%),
        radial-gradient(circle at 82% 70%, ${tone === 'yellow' ? 'rgba(0,0,0,.16)' : 'rgba(94,234,212,.12)'}, transparent 38%);
      opacity: .72;
    }
    .panel {
      position: absolute;
      left: 72px;
      right: 72px;
      top: 112px;
      height: 900px;
      padding: 56px 58px 48px;
      border: 4px solid ${tone === 'yellow' ? 'rgba(0,0,0,.78)' : 'rgba(255,255,255,.78)'};
      background: ${tone === 'yellow' ? 'rgba(255,255,255,.2)' : 'linear-gradient(135deg, rgba(12,12,12,.96), rgba(0,0,0,.98))'};
      box-shadow: 0 38px 120px rgba(0,0,0,.55);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 18px;
      color: ${tone === 'yellow' ? '#050505' : '#f5b400'};
      font-size: 34px;
      font-weight: 950;
    }
    .kicker::before {
      content: "";
      width: 12px;
      height: 62px;
      background: ${tone === 'yellow' ? '#050505' : '#f5b400'};
      display: block;
    }
    h1 {
      margin: 42px 0 28px;
      font-size: ${titleSize}px;
      line-height: 1.12;
      font-weight: 950;
      text-shadow: ${tone === 'yellow' ? 'none' : '0 6px 0 #000'};
    }
    p {
      margin: 0;
      font-size: ${bodySize}px;
      line-height: 1.42;
      font-weight: 850;
      color: ${tone === 'yellow' ? 'rgba(0,0,0,.78)' : 'rgba(255,255,255,.84)'};
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 30px;
      max-height: 168px;
      overflow: hidden;
    }
    .chip {
      padding: 8px 14px;
      border: 2px solid ${tone === 'yellow' ? 'rgba(0,0,0,.78)' : 'rgba(245,180,0,.72)'};
      color: ${tone === 'yellow' ? '#050505' : '#f5b400'};
      font-size: 24px;
      font-weight: 900;
      background: ${tone === 'yellow' ? 'rgba(0,0,0,.06)' : 'rgba(245,180,0,.1)'};
    }
    .nodes {
      margin-top: auto;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 18px;
      padding-top: 34px;
    }
    .node {
      min-height: 92px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 14px;
      border: 3px solid ${tone === 'yellow' ? '#050505' : '#f5b400'};
      font-size: 26px;
      line-height: 1.18;
      font-weight: 950;
      background: ${tone === 'yellow' ? 'rgba(255,255,255,.24)' : 'rgba(0,0,0,.6)'};
    }
    .source {
      position: absolute;
      left: 58px;
      right: 58px;
      bottom: 48px;
      padding-top: 24px;
      border-top: 2px solid ${tone === 'yellow' ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.25)'};
      color: ${tone === 'yellow' ? 'rgba(0,0,0,.58)' : 'rgba(255,255,255,.58)'};
      font-size: 26px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .source:empty { display: none; }
  </style>
</head>
<body>
  <div class="ambient"></div>
  <div class="panel">
    <div class="kicker">${escapeHtml(kicker)}</div>
    <h1>${escapeHtml(cleanTitle)}</h1>
    <p>${escapeHtml(cleanBody)}</p>
    ${diagram ? '' : `<div class="chips">${cleanChips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>`}
    ${diagram ? `<div class="nodes">${cleanChips.map((chip) => `<div class="node">${escapeHtml(chip)}</div>`).join('')}</div>` : ''}
  </div>
  <div class="source">${escapeHtml(sourceText)}</div>
</body>
</html>`;
};


const renderHtmlPng = async ({context, html, publicPath, dataPath}) => {
  const page = await context.newPage();
  await page.setContent(html, {waitUntil: 'load'});
  await page.screenshot({path: publicPath});
  await page.close();
  await fs.copyFile(publicPath, dataPath);
};

const captureUrlPng = async ({context, source, publicPath, dataPath}) => {
  const rawPath = publicPath.replace(/\.png$/, '-raw.png');
  const page = await context.newPage();
  try {
    const response = await page.goto(source.url, {waitUntil: 'domcontentloaded', timeout: 45000});
    const status = response?.status() ?? null;
    if (status && status >= 400) {
      throw new Error(`HTTP ${status}`);
    }

    await page.waitForTimeout(1800);
    await dismissCommonOverlays(page);
    await page.screenshot({path: rawPath});
    await page.close();

    await fs.copyFile(rawPath, publicPath);
    await fs.copyFile(rawPath, dataPath);

    return {ok: true, source_url: source.url};
  } catch (error) {
    await page.close();
    return {ok: false, error: error instanceof Error ? error.message : String(error), source_url: source.url};
  }
};

const copyLocalMediaAsset = async ({source, publicPath, dataPath}) => {
  if (!source?.localPath) {
    return {ok: false, error: 'missing local media path', source_url: source?.url ?? null};
  }
  const absoluteSource = path.isAbsolute(source.localPath) ? source.localPath : path.join(root, source.localPath);
  try {
    await fs.copyFile(absoluteSource, publicPath);
    await fs.copyFile(absoluteSource, dataPath);
    return {ok: true, source_url: source.url, mediaType: source.mediaType};
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : String(error), source_url: source.url};
  }
};

const mediaExtensionFor = (source) => {
  const candidate = source?.localPath ?? source?.url ?? '';
  const extension = path.extname(new URL(candidate, 'https://asset.local').pathname).toLowerCase();
  if (extension) {
    return extension;
  }
  return source?.mediaType === 'video' ? '.mp4' : '.png';
};

const downloadRemoteMediaAsset = async ({source, publicPath, dataPath}) => {
  if (!source?.url || !['image', 'video'].includes(source.mediaType)) {
    return {ok: false, error: 'not a direct remote media asset', source_url: source?.url ?? null};
  }

  try {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(publicPath, buffer);
    await fs.copyFile(publicPath, dataPath);
    return {ok: true, source_url: source.url, mediaType: source.mediaType};
  } catch (error) {
    return {ok: false, error: error instanceof Error ? error.message : String(error), source_url: source.url};
  }
};


const chooseSource = (pools, assetFunction, beat, usage) => {
  const pool = pools[assetFunction] ?? pools[normalizeInventoryFunction(assetFunction)] ?? [];
  if (!pool.length) {
    return {source: null, matchedKeywords: [], matchReason: 'fallback: empty source pool', fallback: true};
  }

  return chooseBestSource(pool, beat, usage);
};

const fallbackHtml = (assetFunction, beat, source) => {
  const title = pickAudienceTitle({beat});
  const body = pickAudienceBody({beat});
  const chips = cleanAudienceKeywords(beat.keywords ?? [], assetFunction === 'remotion_diagram' ? 4 : 6);

  if (assetFunction === 'yellow_opinion_card') {
    return cardShell({
      kicker: '\u5173\u952e\u5224\u65ad',
      title,
      body,
      chips,
      source,
      tone: 'yellow'
    });
  }

  if (assetFunction === 'remotion_diagram') {
    return cardShell({
      kicker: '\u7ed3\u6784\u62c6\u89e3',
      title,
      body,
      chips,
      source,
      diagram: true
    });
  }

  if (assetFunction === 'abstract_tech') {
    return cardShell({
      kicker: '\u8d8b\u52bf\u753b\u9762',
      title,
      body,
      chips: [],
      source: ''
    });
  }

  return cardShell({
    kicker: '内容补充',
    title,
    body,
    chips: [],
    source: ''
  });
};

const createComponentAsset = ({beat, assetFunction, index, matchReason = 'component-rendered semantic visual'}) => {
  const key = `${String(index + 1).padStart(3, '0')}-${slugify(beat.id)}-${assetFunction}`;
  const sourceCategory = assetFunction === 'remotion_diagram' ? 'remotion-diagram' : 'remotion-motion';
  return {
    id: key,
    beatId: beat.id,
    assetFunction,
    visualRole: beat.visualRole,
    path: null,
    source_url: null,
    source_name: 'Remotion component',
    assetStatus: 'component-rendered',
    mediaType: 'remotion_component',
    isRealWorldMaterial: false,
    isGeneratedFallback: false,
    annotation: false,
    hasHighlight: false,
    matchReason,
    matchedKeywords: cleanAudienceKeywords(beat.keywords ?? [], 4),
    meaningfulMatches: [],
    matchStrength: 'component',
    sourceCategory,
    status: 'component-rendered'
  };
};

const promoteFallbackAssetFunction = (assetFunction, beat) => {
  if (assetFunction === 'product_ui' || beat.visualRole === 'diagram') {
    return 'remotion_diagram';
  }
  return 'remotion_motion_clip';
};

const shouldPromoteToMotionComponent = ({assetFunction, sourceChoice, capture}) => {
  if (!promotableCaptureFunctions.has(assetFunction)) {
    return false;
  }
  return Boolean(sourceChoice?.fallback || sourceChoice?.matchStrength === 'weak' || (capture && !capture.ok));
};

const createAsset = async ({context, pools, usage, beat, assetFunction, index, forcedSource = null}) => {
  if (componentRenderedAssetFunctions.has(assetFunction)) {
    return createComponentAsset({
      beat,
      assetFunction,
      index,
      matchReason: assetFunction === 'remotion_diagram' ? 'component-rendered semantic diagram' : 'component-rendered semantic motion clip'
    });
  }

  const sourceChoice = forcedSource ? {source: forcedSource, matchedKeywords: [], matchReason: 'forced source', fallback: false} : chooseSource(pools, assetFunction, beat, usage);
  if (shouldPromoteToMotionComponent({assetFunction, sourceChoice, capture: null})) {
    const promotedFunction = promoteFallbackAssetFunction(assetFunction, beat);
    return createComponentAsset({
      beat,
      assetFunction: promotedFunction,
      index,
      matchReason: `promoted from ${assetFunction}: ${sourceChoice.matchReason}`
    });
  }

  const source = sourceChoice.source;
  const directMediaExtension = ['image', 'video'].includes(source?.mediaType) ? mediaExtensionFor(source) : '.png';
  const key = `${String(index + 1).padStart(3, '0')}-${slugify(beat.id)}-${assetFunction}`;
  const publicPath = path.join(publicAssetDir, `${key}${directMediaExtension}`);
  const dataPath = path.join(dataAssetDir, `${key}${directMediaExtension}`);
  const annotation = false;
  const canUseLocalMedia = source?.localPath && ['image', 'video'].includes(source.mediaType);
  const canCapture = source?.url && !sourceChoice.fallback && source.mediaType !== 'video' && !['abstract_tech', 'remotion_diagram', 'yellow_opinion_card'].includes(assetFunction);
  let capture = null;

  if (canUseLocalMedia) {
    capture = await copyLocalMediaAsset({source, publicPath, dataPath});
  } else if (!sourceChoice.fallback && ['image', 'video'].includes(source?.mediaType)) {
    capture = await downloadRemoteMediaAsset({source, publicPath, dataPath});
  } else if (canCapture) {
    capture = await captureUrlPng({
      context,
      source,
      publicPath,
      dataPath
    });
  }

  if (!capture?.ok) {
    if (shouldPromoteToMotionComponent({assetFunction, sourceChoice, capture})) {
      const promotedFunction = promoteFallbackAssetFunction(assetFunction, beat);
      return createComponentAsset({
        beat,
        assetFunction: promotedFunction,
        index,
        matchReason: `promoted from ${assetFunction}: ${capture?.error ?? sourceChoice.matchReason}`
      });
    }

    await renderHtmlPng({
      context,
      html: fallbackHtml(assetFunction, beat, source ? `${source.name} | ${source.url}` : ''),
      publicPath,
      dataPath
    });
  }

  return {
    id: key,
    beatId: beat.id,
    assetFunction,
    visualRole: beat.visualRole,
    path: `assets/${date}/${path.basename(publicPath)}`,
    source_url: source?.url ?? null,
    source_name: source?.name ?? null,
    mediaType: capture?.mediaType ?? source?.mediaType ?? (capture?.ok ? 'webpage' : 'generated_card'),
    assetStatus: capture?.ok ? 'captured' : 'generated-fallback',
    isRealWorldMaterial: Boolean(capture?.ok),
    isGeneratedFallback: !capture?.ok,
    annotation,
    hasHighlight: false,
    matchReason: sourceChoice.matchReason,
    matchedKeywords: sourceChoice.matchedKeywords,
    meaningfulMatches: sourceChoice.meaningfulMatches ?? [],
    matchStrength: sourceChoice.matchStrength ?? (capture?.ok ? 'strong' : 'weak'),
    sourceCategory: sourceChoice.fallback ? 'fallback-card' : assetFunction,
    status: capture?.ok ? 'captured' : 'generated-fallback',
    error: capture?.error
  };
};

const main = async () => {
  await ensureProductionInputs();
  await cleanGeneratedAssetDir(dataAssetDir);
  await cleanGeneratedAssetDir(publicAssetDir);

  const selection = await readJson(selectionPath, {recommended: [], candidates: []});
  const voiceoverText = await readText(voiceoverPath, '');
  const {storyPlan, visualBeatPlan} = buildVisualPlan({selection, voiceoverText, date});
  const pools = await buildSourcePools(selection);
  const usage = {usedUrls: new Map(), usedDomains: new Map()};
  const browser = await chromium.launch({executablePath: chromePath, headless: true});
  const context = await browser.newContext({
    viewport: {width: 1080, height: 1160},
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
  });

  const allAssets = [];
  const visualBeats = [];

  for (const [index, beat] of visualBeatPlan.entries()) {
    const assignedFunction = assignAssetFunction(beat);
    const primaryFunction = assignedFunction === 'abstract_tech' ? 'remotion_motion_clip' : assignedFunction;
    const assets = [await createAsset({context, pools, usage, beat, assetFunction: primaryFunction, index})];
    allAssets.push(...assets);
    for (const asset of assets) {
      if (asset.source_url) {
        usage.usedUrls.set(asset.source_url, (usage.usedUrls.get(asset.source_url) ?? 0) + 1);
        try {
          const domain = new URL(asset.source_url).hostname.replace(/^www\./, '');
          usage.usedDomains.set(domain, (usage.usedDomains.get(domain) ?? 0) + 1);
        } catch {
          // Ignore invalid source URLs from external research.
        }
      }
    }

    visualBeats.push({
      ...beat,
      assetFunction: assets[0]?.assetFunction ?? primaryFunction,
      plannedAssetFunction: primaryFunction,
      assetStatus: assets[0]?.assetStatus,
      assetMediaType: assets[0]?.mediaType,
      assetSourceName: assets[0]?.source_name,
      assetSourceUrl: assets[0]?.source_url,
      isGeneratedFallback: assets[0]?.isGeneratedFallback,
      assets: assets.map((asset) => asset.path).filter(Boolean)
    });
  }

  await browser.close();

  const inventory = countAssetInventory(allAssets);
  const qualitySummary = {
    captured: allAssets.filter((asset) => asset.assetStatus === 'captured').length,
    componentRendered: allAssets.filter((asset) => asset.assetStatus === 'component-rendered').length,
    generatedFallback: allAssets.filter((asset) => asset.assetStatus === 'generated-fallback').length,
    weakMatches: allAssets.filter((asset) => asset.matchStrength === 'weak').length,
    captureFailures: allAssets.filter((asset) => asset.error).length
  };
  const inventoryProblems = [
    ...validateAssetInventory(inventory).filter((problem) => !problem.includes('above maximum')),
    ...validateSourceUsage(allAssets)
  ];
  const manifest = {
    date,
    generated_at: new Date().toISOString(),
    source_selection: path.relative(root, selectionPath).replaceAll(path.sep, '/'),
    inventory,
    qualitySummary,
    inventoryProblems,
    assets: allAssets,
    storyPlan
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(visualBeatsPath, `${JSON.stringify({date, generated_at: manifest.generated_at, visualBeats}, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({date, inventory, qualitySummary, inventoryProblems, asset_count: allAssets.length}, null, 2));

  const blockingProblems = inventoryProblems;

  if (blockingProblems.length) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
