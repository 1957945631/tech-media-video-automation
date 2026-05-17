import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {storyPlan, visualBeatPlan} from './visual_beat_plan.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const date = process.argv[2];

if (!date) {
  console.error('Usage: node scripts/capture_daily_assets.mjs YYYY-MM-DD');
  process.exit(1);
}

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const dailyPath = path.join(root, 'data', 'daily', `${date}.json`);
const dataAssetDir = path.join(root, 'data', 'assets', date);
const publicAssetDir = path.join(root, 'public', 'assets', date);
const manifestPath = path.join(dataAssetDir, 'assets-manifest.json');
const visualBeatsPath = path.join(dataAssetDir, 'visual-beats.json');

const preferredIds = storyPlan.map((item) => item.id);

const sourceCardHtml = (item) => `<!doctype html>
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
      color: #f4f4f4;
    }
    .grid {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(rgba(255,255,255,.12) 2px, transparent 2px),
        linear-gradient(90deg, rgba(255,255,255,.12) 2px, transparent 2px);
      background-size: 86px 86px;
      transform: perspective(520px) rotateX(54deg) translateY(-160px) scale(1.6);
      transform-origin: center top;
      opacity: .55;
    }
    .card {
      position: absolute;
      left: 70px;
      right: 70px;
      top: 110px;
      min-height: 760px;
      padding: 64px 58px;
      border: 4px solid rgba(255,255,255,.86);
      background: linear-gradient(135deg, rgba(22,22,22,.94), rgba(7,7,7,.98));
      box-shadow: 0 36px 110px rgba(0,0,0,.7);
    }
    .kicker {
      display: inline-block;
      padding-left: 18px;
      border-left: 12px solid #f5b400;
      color: #f5b400;
      font-size: 38px;
      font-weight: 900;
    }
    h1 {
      margin: 42px 0 34px;
      font-size: 64px;
      line-height: 1.12;
      font-weight: 950;
      text-wrap: balance;
    }
    p {
      margin: 0;
      font-size: 34px;
      line-height: 1.45;
      color: rgba(255,255,255,.86);
      font-weight: 800;
    }
    .source {
      position: absolute;
      left: 58px;
      right: 58px;
      bottom: 50px;
      border-top: 2px solid rgba(255,255,255,.25);
      padding-top: 28px;
      font-size: 30px;
      color: rgba(255,255,255,.62);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="grid"></div>
  <div class="card">
    <div class="kicker">${escapeHtml(item.category ?? '科技新闻')}</div>
    <h1>${escapeHtml(item.title)}</h1>
    <p>${escapeHtml(item.summary_zh ?? '')}</p>
    <div class="source">${escapeHtml(item.source_name ?? '')} · ${escapeHtml(item.url ?? '')}</div>
  </div>
</body>
</html>`;

const beatCardHtml = (beat, sourceItem) => `<!doctype html>
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
    .grid {
      position: absolute;
      left: -220px;
      right: -220px;
      top: 80px;
      height: 1060px;
      background:
        linear-gradient(rgba(255,255,255,.14) 2px, transparent 2px),
        linear-gradient(90deg, rgba(255,255,255,.14) 2px, transparent 2px);
      background-size: 88px 88px;
      transform: perspective(560px) rotateX(54deg) translateY(-120px);
      transform-origin: center top;
      opacity: .48;
    }
    .panel {
      position: absolute;
      left: 78px;
      right: 78px;
      top: 130px;
      min-height: 760px;
      padding: 66px 58px;
      border: 4px solid rgba(255,255,255,.78);
      background: linear-gradient(135deg, rgba(12,12,12,.96), rgba(0,0,0,.98));
      box-shadow: 0 38px 120px rgba(0,0,0,.76);
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 18px;
      color: #f5b400;
      font-size: 34px;
      font-weight: 950;
    }
    .kicker::before {
      content: "";
      width: 12px;
      height: 62px;
      background: #f5b400;
      display: block;
    }
    h1 {
      margin: 52px 0 38px;
      font-size: 82px;
      line-height: 1.08;
      font-weight: 950;
      text-shadow: 0 6px 0 #000;
    }
    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      margin-top: 40px;
    }
    .keyword {
      padding: 12px 18px;
      border: 2px solid rgba(245,180,0,.72);
      color: #f5b400;
      font-size: 34px;
      font-weight: 900;
      background: rgba(245,180,0,.1);
    }
    .intent {
      margin-top: 38px;
      color: rgba(255,255,255,.82);
      font-size: 34px;
      line-height: 1.45;
      font-weight: 800;
    }
    .source {
      position: absolute;
      left: 58px;
      right: 58px;
      bottom: 48px;
      padding-top: 26px;
      border-top: 2px solid rgba(255,255,255,.25);
      color: rgba(255,255,255,.58);
      font-size: 28px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="grid"></div>
  <div class="panel">
    <div class="kicker">${escapeHtml(sourceItem?.source_name ?? '硅基打底')}</div>
    <h1>${escapeHtml(beat.overlayTitle)}</h1>
    <div class="keywords">${beat.keywords.map((keyword) => `<span class="keyword">${escapeHtml(keyword)}</span>`).join('')}</div>
    <div class="intent">${escapeHtml(beat.intent)}</div>
    <div class="source">${escapeHtml(sourceItem?.url ?? '自制语义素材卡')}</div>
  </div>
</body>
</html>`;

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const dismissCommonOverlays = async (page) => {
  const labels = ['Accept', 'Accept all', 'I agree', 'Agree', 'Got it', 'Continue', '同意', '接受', '我知道了', '继续'];

  for (const label of labels) {
    const button = page.getByRole('button', {name: new RegExp(label, 'i')}).first();
    try {
      if (await button.isVisible({timeout: 500})) {
        await button.click({timeout: 1000});
      }
    } catch {
      // Overlay absent or not clickable.
    }
  }
};

const main = async () => {
  await fs.mkdir(dataAssetDir, {recursive: true});
  await fs.mkdir(publicAssetDir, {recursive: true});

  const daily = JSON.parse(await fs.readFile(dailyPath, 'utf8'));
  const byId = new Map(daily.items.map((item) => [item.id, item]));
  const items = preferredIds.map((id) => byId.get(id)).filter(Boolean);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });
  const context = await browser.newContext({
    viewport: {width: 1080, height: 1160},
    deviceScaleFactor: 1,
    locale: 'zh-CN'
  });

  const results = [];
  const resultById = new Map();

  for (const [index, item] of items.entries()) {
    const key = `${String(index + 1).padStart(2, '0')}-${slugify(item.id)}`;
    const publicViewport = path.join(publicAssetDir, `${key}-source.png`);
    const dataViewport = path.join(dataAssetDir, `${key}-source.png`);
    const publicCard = path.join(publicAssetDir, `${key}-card.png`);
    const dataCard = path.join(dataAssetDir, `${key}-card.png`);
    const attempts = [];
    let captured = false;

    if (item.url) {
      const page = await context.newPage();
      try {
        const response = await page.goto(item.url, {waitUntil: 'domcontentloaded', timeout: 45000});
        const status = response?.status() ?? null;
        if (status && status >= 400) {
          throw new Error(`HTTP ${status}`);
        }

        await page.waitForTimeout(2500);
        await dismissCommonOverlays(page);
        await page.screenshot({path: publicViewport});
        await fs.copyFile(publicViewport, dataViewport);
        captured = true;
      } catch (error) {
        attempts.push(error instanceof Error ? error.message : String(error));
      } finally {
        await page.close();
      }
    }

    const cardPage = await context.newPage();
    await cardPage.setContent(sourceCardHtml(item), {waitUntil: 'load'});
    await cardPage.screenshot({path: publicCard});
    await cardPage.close();
    await fs.copyFile(publicCard, dataCard);

    const result = {
      id: item.id,
      title: item.title,
      source_name: item.source_name,
      source_url: item.url,
      status: captured ? 'captured' : 'fallback-card-only',
      attempts,
      assets: [
        captured ? `assets/${date}/${path.basename(publicViewport)}` : null,
        `assets/${date}/${path.basename(publicCard)}`
      ].filter(Boolean)
    };
    results.push(result);
    resultById.set(item.id, result);
  }

  const dailyById = new Map(daily.items.map((item) => [item.id, item]));
  const visualBeats = [];

  for (const beat of visualBeatPlan) {
    const sourceItem = beat.sourceId ? dailyById.get(beat.sourceId) : null;
    const sourceAssets = beat.sourceId ? resultById.get(beat.sourceId)?.assets ?? [] : [];
    const publicBeatCard = path.join(publicAssetDir, `beat-${slugify(beat.id)}.png`);
    const dataBeatCard = path.join(dataAssetDir, `beat-${slugify(beat.id)}.png`);
    const beatPage = await context.newPage();

    await beatPage.setContent(beatCardHtml(beat, sourceItem), {waitUntil: 'load'});
    await beatPage.screenshot({path: publicBeatCard});
    await beatPage.close();
    await fs.copyFile(publicBeatCard, dataBeatCard);

    visualBeats.push({
      ...beat,
      assets: [...sourceAssets.slice(0, 1), `assets/${date}/${path.basename(publicBeatCard)}`]
    });
  }

  await browser.close();

  const manifest = {
    date,
    generated_at: new Date().toISOString(),
    source_daily: path.relative(root, dailyPath).replaceAll(path.sep, '/'),
    items: results
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  await fs.writeFile(visualBeatsPath, JSON.stringify({date, generated_at: manifest.generated_at, visualBeats}, null, 2), 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
