import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {storyPlan, visualBeatPlan} from '../visual_beat_plan.mjs';
import {mergeResearchSourcesIntoPools, normalizeResearchSources} from '../asset_research_sources.mjs';
import {assignAssetFunction, countAssetInventory, normalizeInventoryFunction, validateAssetInventory} from '../asset_function_rules.mjs';

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
const skillResearchPath = path.join(dataAssetDir, 'news-aggregator-research.json');

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

const buildSourcePools = async () => {
  const selection = await readJson(selectionPath, {recommended: [], candidates: []});
  const skillResearch = await readJson(skillResearchPath, []);
  const skillResearchSources = normalizeResearchSources(skillResearch, {limit: 80});
  const selectedSources = [...(selection.recommended ?? []), ...(selection.candidates ?? [])]
    .filter((item) => item.source_url)
    .map((item) => ({
      name: item.source_name ?? item.title,
      title: item.title,
      url: item.source_url
    }));

  const official = [
    {name: 'OpenAI', title: 'OpenAI Deployment Company', url: 'https://openai.com/index/openai-launches-the-deployment-company/'},
    {name: 'OpenAI Newsroom', title: 'Company announcements', url: 'https://openai.com/news/company-announcements/'},
    {name: 'Google Blog', title: 'Android Show I/O Edition', url: 'https://blog.google/products-and-platforms/platforms/android/android-show-io-edition-2026'},
    {name: 'Apple Developer', title: 'App Store Review Guidelines', url: 'https://developer.apple.com/app-store/review/guidelines/'},
    {name: 'Anthropic', title: 'Policy', url: 'https://www.anthropic.com/policy'},
    {name: 'TSMC', title: 'Technology', url: 'https://www.tsmc.com/english/dedicatedFoundry/technology'},
    {name: 'NVIDIA', title: 'Data Center', url: 'https://www.nvidia.com/en-us/data-center/'},
    {name: 'Google Data Centers', title: 'Infrastructure', url: 'https://www.google.com/about/datacenters/'},
    {name: 'npm', title: 'npm package registry', url: 'https://www.npmjs.com/'},
    {name: 'TanStack', title: 'TanStack', url: 'https://tanstack.com/'}
  ];

  return mergeResearchSourcesIntoPools({
    evidence_screenshot: [...selectedSources, ...official],
    company_person: [
      {name: 'OpenAI', title: 'OpenAI company page', url: 'https://openai.com/about/'},
      {name: 'Google', title: 'Google products', url: 'https://blog.google/products/'},
      {name: 'Apple', title: 'Apple newsroom', url: 'https://www.apple.com/newsroom/'},
      {name: 'Anthropic', title: 'Anthropic company', url: 'https://www.anthropic.com/company'},
      {name: 'TSMC', title: 'TSMC company', url: 'https://www.tsmc.com/english/aboutTSMC'}
    ],
    product_ui: [
      {name: 'OpenAI', title: 'OpenAI business', url: 'https://openai.com/business/'},
      {name: 'OpenAI', title: 'ChatGPT business', url: 'https://openai.com/chatgpt/business/'},
      {name: 'Google Android', title: 'Android product page', url: 'https://www.android.com/'},
      {name: 'Google Gemini', title: 'Gemini product page', url: 'https://gemini.google.com/'},
      {name: 'Apple Developer', title: 'App Store Connect', url: 'https://developer.apple.com/app-store-connect/'},
      {name: 'npm', title: 'npm registry UI', url: 'https://www.npmjs.com/'},
      {name: 'TanStack', title: 'TanStack docs UI', url: 'https://tanstack.com/query/latest'},
      {name: 'Anthropic', title: 'Claude product page', url: 'https://www.anthropic.com/claude'},
      {name: 'TSMC', title: 'TSMC technology page', url: 'https://www.tsmc.com/english/dedicatedFoundry/technology'},
      {name: 'NVIDIA', title: 'NVIDIA enterprise AI', url: 'https://www.nvidia.com/en-us/ai-data-science/'}
    ],
    real_broll: [
      {name: 'Google Data Centers', title: 'Data center real-world page', url: 'https://www.google.com/about/datacenters/'},
      {name: 'Microsoft Datacenters', title: 'Cloud infrastructure', url: 'https://datacenters.microsoft.com/'},
      {name: 'NVIDIA Data Center', title: 'GPU data center', url: 'https://www.nvidia.com/en-us/data-center/'},
      {name: 'TSMC', title: 'Semiconductor manufacturing', url: 'https://www.tsmc.com/english/dedicatedFoundry/manufacturing'},
      {name: 'Apple Newsroom', title: 'Device ecosystem', url: 'https://www.apple.com/newsroom/'},
      {name: 'Google Blog', title: 'Android ecosystem', url: 'https://blog.google/products/android/'},
      {name: 'OpenAI Business', title: 'Enterprise work', url: 'https://openai.com/business/'},
      {name: 'Anthropic News', title: 'AI company work', url: 'https://www.anthropic.com/news'}
    ],
    industry_broll: [
      {name: 'TSMC Manufacturing', title: 'Wafer and fab', url: 'https://www.tsmc.com/english/dedicatedFoundry/manufacturing'},
      {name: 'NVIDIA Data Center', title: 'GPU servers', url: 'https://www.nvidia.com/en-us/data-center/'},
      {name: 'Google Data Centers', title: 'Data center infrastructure', url: 'https://www.google.com/about/datacenters/'},
      {name: 'TSMC Technology', title: 'Advanced process', url: 'https://www.tsmc.com/english/dedicatedFoundry/technology'}
    ],
    commercial_broll: [
      {name: 'OpenAI Business', title: 'Enterprise AI workflow', url: 'https://openai.com/business/'},
      {name: 'ChatGPT Enterprise', title: 'Subscription and enterprise', url: 'https://openai.com/chatgpt/enterprise/'},
      {name: 'Apple Developer', title: 'Developer business', url: 'https://developer.apple.com/app-store/'},
      {name: 'Google Workspace', title: 'Business software', url: 'https://workspace.google.com/'}
    ]
  }, skillResearchSources);
};

const cardShell = ({kicker, title, body, chips = [], source = '', tone = 'dark', diagram = false}) => `<!doctype html>
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
    .grid {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(${tone === 'yellow' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.12)'} 2px, transparent 2px),
        linear-gradient(90deg, ${tone === 'yellow' ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.12)'} 2px, transparent 2px);
      background-size: 92px 92px;
      transform: ${diagram ? 'none' : 'perspective(560px) rotateX(54deg) translateY(-120px) scale(1.3)'};
      opacity: .42;
    }
    .panel {
      position: absolute;
      left: 72px;
      right: 72px;
      top: 112px;
      min-height: 780px;
      padding: 58px;
      border: 4px solid ${tone === 'yellow' ? 'rgba(0,0,0,.78)' : 'rgba(255,255,255,.78)'};
      background: ${tone === 'yellow' ? 'rgba(255,255,255,.2)' : 'linear-gradient(135deg, rgba(12,12,12,.96), rgba(0,0,0,.98))'};
      box-shadow: 0 38px 120px rgba(0,0,0,.55);
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
      margin: 46px 0 34px;
      font-size: ${tone === 'yellow' ? '86px' : '76px'};
      line-height: 1.08;
      font-weight: 950;
      text-shadow: ${tone === 'yellow' ? 'none' : '0 6px 0 #000'};
    }
    p {
      margin: 0;
      font-size: 34px;
      line-height: 1.42;
      font-weight: 850;
      color: ${tone === 'yellow' ? 'rgba(0,0,0,.78)' : 'rgba(255,255,255,.84)'};
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 38px;
    }
    .chip {
      padding: 10px 16px;
      border: 2px solid ${tone === 'yellow' ? 'rgba(0,0,0,.78)' : 'rgba(245,180,0,.72)'};
      color: ${tone === 'yellow' ? '#050505' : '#f5b400'};
      font-size: 30px;
      font-weight: 900;
      background: ${tone === 'yellow' ? 'rgba(0,0,0,.06)' : 'rgba(245,180,0,.1)'};
    }
    .nodes {
      position: absolute;
      left: 108px;
      right: 108px;
      bottom: 132px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
    }
    .node {
      min-height: 118px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 18px;
      border: 3px solid ${tone === 'yellow' ? '#050505' : '#f5b400'};
      font-size: 30px;
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
  </style>
</head>
<body>
  <div class="grid"></div>
  <div class="panel">
    <div class="kicker">${escapeHtml(kicker)}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(body)}</p>
    <div class="chips">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join('')}</div>
  </div>
  ${diagram ? `<div class="nodes">${chips.slice(0, 6).map((chip) => `<div class="node">${escapeHtml(chip)}</div>`).join('')}</div>` : ''}
  <div class="source">${escapeHtml(source)}</div>
</body>
</html>`;

const annotatedScreenshotHtml = ({imageDataUrl, title, source, annotation = true}) => `<!doctype html>
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
      background: #050505;
      color: #fff;
    }
    .shot {
      position: absolute;
      left: 38px;
      right: 38px;
      top: 92px;
      height: 870px;
      border: 4px solid rgba(255,255,255,.82);
      overflow: hidden;
      background: #111;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      filter: contrast(1.08) saturate(.94) brightness(.78);
    }
    .label {
      position: absolute;
      left: 56px;
      right: 56px;
      top: 24px;
      display: flex;
      gap: 16px;
      align-items: center;
      font-size: 30px;
      font-weight: 950;
    }
    .bar { width: 10px; height: 48px; background: #f5b400; }
    .caption {
      position: absolute;
      left: 58px;
      right: 58px;
      bottom: 80px;
      font-size: 48px;
      line-height: 1.15;
      font-weight: 950;
      text-shadow: 0 7px 0 #000;
    }
    .source {
      position: absolute;
      left: 58px;
      right: 58px;
      bottom: 34px;
      color: rgba(255,255,255,.62);
      font-size: 24px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .box {
      position: absolute;
      left: 76px;
      right: 76px;
      top: 142px;
      height: 312px;
      border: 7px solid #ff2b2b;
      box-shadow: 0 0 0 9999px rgba(0,0,0,.12), 0 0 28px rgba(255,43,43,.38);
      pointer-events: none;
    }
    .box::before,
    .box::after {
      content: "";
      position: absolute;
      left: 22px;
      right: 22px;
      height: 6px;
      background: #ff2b2b;
      opacity: .92;
    }
    .box::before { top: 76px; }
    .box::after { bottom: 76px; }
    .hint {
      position: absolute;
      left: 76px;
      top: 466px;
      padding: 10px 18px;
      background: #ff2b2b;
      color: #fff;
      font-size: 24px;
      font-weight: 950;
      box-shadow: 0 5px 0 rgba(0,0,0,.72);
    }
  </style>
</head>
<body>
  <div class="label"><div class="bar"></div><div>真实证据截图</div></div>
  <div class="shot"><img src="${imageDataUrl}" /></div>
  ${annotation ? '<div class="box"></div><div class="hint">看标题 / 来源 / 关键段落</div>' : ''}
  <div class="caption">${escapeHtml(title)}</div>
  <div class="source">${escapeHtml(source)}</div>
</body>
</html>`;

const renderHtmlPng = async ({context, html, publicPath, dataPath}) => {
  const page = await context.newPage();
  await page.setContent(html, {waitUntil: 'load'});
  await page.screenshot({path: publicPath});
  await page.close();
  await fs.copyFile(publicPath, dataPath);
};

const captureUrlPng = async ({context, source, publicPath, dataPath, title, annotation}) => {
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

    if (annotation) {
      const imageDataUrl = `data:image/png;base64,${await fs.readFile(rawPath, 'base64')}`;
      await renderHtmlPng({
        context,
        html: annotatedScreenshotHtml({imageDataUrl, title, source: `${source.name} | ${source.url}`, annotation}),
        publicPath,
        dataPath
      });
    } else {
      await fs.copyFile(rawPath, publicPath);
      await fs.copyFile(rawPath, dataPath);
    }

    return {ok: true, source_url: source.url};
  } catch (error) {
    await page.close();
    return {ok: false, error: error instanceof Error ? error.message : String(error), source_url: source.url};
  }
};

const sourceMatchesBeat = (source, beat) => {
  const haystack = `${source.name ?? ''} ${source.title ?? ''} ${source.url ?? ''}`.toLowerCase();
  const text = `${beat.id ?? ''} ${beat.subject ?? ''} ${beat.concept ?? ''} ${(beat.keywords ?? []).join(' ')}`.toLowerCase();
  const groups = [
    ['openai', ['openai', 'chatgpt']],
    ['google', ['google', 'android', 'gemini']],
    ['apple', ['apple', 'app store']],
    ['tsmc', ['tsmc', 'semiconductor', 'chip', '芯片', '半导体']],
    ['anthropic', ['anthropic', 'axios']],
    ['tanstack', ['tanstack', 'npm']],
    ['nvidia', ['nvidia', 'gpu', 'data center', '数据中心']]
  ];

  for (const [needle, aliases] of groups) {
    if (text.includes(needle) || aliases.some((alias) => text.includes(alias))) {
      return haystack.includes(needle) || aliases.some((alias) => haystack.includes(alias));
    }
  }

  return false;
};

const chooseSource = (pools, assetFunction, beat, index) => {
  const pool = pools[assetFunction] ?? pools[normalizeInventoryFunction(assetFunction)] ?? [];
  if (!pool.length) {
    return null;
  }

  const matched = pool.filter((source) => sourceMatchesBeat(source, beat));
  const candidates = matched.length ? matched : pool;
  return candidates[index % candidates.length];
};

const fallbackHtml = (assetFunction, beat, source) => {
  if (assetFunction === 'yellow_opinion_card') {
    return cardShell({
      kicker: '黄色观点卡',
      title: beat.overlayTitle,
      body: beat.intent,
      chips: beat.keywords ?? [],
      source,
      tone: 'yellow'
    });
  }

  if (assetFunction === 'remotion_diagram') {
    return cardShell({
      kicker: 'Remotion 图解',
      title: beat.overlayTitle,
      body: beat.concept,
      chips: beat.keywords ?? [],
      source,
      diagram: true
    });
  }

  if (assetFunction === 'abstract_tech') {
    return cardShell({
      kicker: '抽象科技画面',
      title: beat.overlayTitle,
      body: beat.intent,
      chips: beat.keywords ?? [],
      source: 'Generated abstract technology visual'
    });
  }

  return cardShell({
    kicker: assetFunction.replaceAll('_', ' '),
    title: beat.overlayTitle,
    body: beat.intent,
    chips: beat.keywords ?? [],
    source
  });
};

const createAsset = async ({context, pools, beat, assetFunction, index, forcedSource = null}) => {
  const key = `${String(index + 1).padStart(3, '0')}-${slugify(beat.id)}-${assetFunction}`;
  const publicPath = path.join(publicAssetDir, `${key}.png`);
  const dataPath = path.join(dataAssetDir, `${key}.png`);
  const source = forcedSource ?? chooseSource(pools, assetFunction, beat, index);
  const annotation = assetFunction === 'evidence_screenshot';
  const canCapture = source?.url && !['abstract_tech', 'remotion_diagram', 'yellow_opinion_card'].includes(assetFunction);
  let capture = null;

  if (canCapture) {
    capture = await captureUrlPng({
      context,
      source,
      publicPath,
      dataPath,
      title: beat.overlayTitle,
      annotation
    });
  }

  if (!capture?.ok) {
    await renderHtmlPng({
      context,
      html: fallbackHtml(assetFunction, beat, source ? `${source.name} | ${source.url}` : 'Generated functional asset'),
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
    isRealWorldMaterial: Boolean(capture?.ok),
    annotation,
    hasHighlight: annotation,
    status: capture?.ok ? 'captured' : 'generated-fallback',
    error: capture?.error
  };
};

const wantedSupplementFunctions = (counts) => {
  const result = [];
  const need = (key, min) => Math.max(0, min - (counts[key] ?? 0));

  result.push(...Array.from({length: need('evidence_screenshot', 8)}, () => 'evidence_screenshot'));
  result.push(...Array.from({length: need('product_ui', 5)}, () => 'product_ui'));
  result.push(...Array.from({length: need('real_broll', 20)}, () => 'real_broll'));
  result.push(...Array.from({length: need('abstract_tech', 8)}, () => 'abstract_tech'));
  result.push(...Array.from({length: need('remotion_diagram', 5)}, () => 'remotion_diagram'));
  result.push(...Array.from({length: need('yellow_opinion_card', 6)}, () => 'yellow_opinion_card'));
  result.push(...Array.from({length: need('annotation', 10)}, () => 'evidence_screenshot'));
  return result;
};

const main = async () => {
  await fs.mkdir(dataAssetDir, {recursive: true});
  await fs.mkdir(publicAssetDir, {recursive: true});

  const pools = await buildSourcePools();
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
    const primaryFunction = assignAssetFunction(beat);
    const assets = [await createAsset({context, pools, beat, assetFunction: primaryFunction, index})];
    allAssets.push(...assets);

    visualBeats.push({
      ...beat,
      assetFunction: primaryFunction,
      assets: assets.map((asset) => asset.path)
    });
  }

  let inventory = countAssetInventory(allAssets);
  const supplements = wantedSupplementFunctions(inventory);

  for (const [offset, assetFunction] of supplements.entries()) {
    const beat = visualBeatPlan[(offset * 5 + 2) % visualBeatPlan.length];
    const asset = await createAsset({
      context,
      pools,
      beat,
      assetFunction,
      index: visualBeatPlan.length + offset
    });
    allAssets.push(asset);
    const targetBeat = visualBeats.find((item) => item.id === beat.id);
    targetBeat.assets.push(asset.path);
  }

  await browser.close();

  inventory = countAssetInventory(allAssets);
  const inventoryProblems = validateAssetInventory(inventory).filter((problem) => !problem.includes('above maximum'));
  const manifest = {
    date,
    generated_at: new Date().toISOString(),
    source_selection: path.relative(root, selectionPath).replaceAll(path.sep, '/'),
    inventory,
    inventoryProblems,
    assets: allAssets,
    storyPlan
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(visualBeatsPath, `${JSON.stringify({date, generated_at: manifest.generated_at, visualBeats}, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({date, inventory, inventoryProblems, asset_count: allAssets.length}, null, 2));

  if (inventoryProblems.length) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
