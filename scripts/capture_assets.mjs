import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const date = process.argv[2];

if (!date) {
  console.error('Usage: node scripts/capture_assets.mjs YYYY-MM-DD');
  process.exit(1);
}
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const selectionPath = path.join(root, 'data', 'selected', `${date}-selection.json`);
const assetDir = path.join(root, 'data', 'assets', date);
const manifestPath = path.join(assetDir, 'assets-manifest.json');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const pickItems = (selection) => {
  if (Array.isArray(selection.recommended_for_video) && Array.isArray(selection.candidates)) {
    const byKey = new Map(selection.candidates.map((item) => [item.key, item]));
    return selection.recommended_for_video.map((key) => byKey.get(key)).filter(Boolean);
  }

  if (Array.isArray(selection.recommended)) {
    return selection.recommended.map((item) => ({
      key: item.source_id ?? item.title,
      title: item.title,
      sources: (item.sources ?? []).map((url) =>
        typeof url === 'string' ? {name: 'source', url} : url
      )
    }));
  }

  throw new Error('筛选 JSON 中未找到 recommended_for_video 或 recommended');
};

const dismissCommonOverlays = async (page) => {
  const labels = [
    'Accept',
    'Accept all',
    'I agree',
    'Agree',
    'Got it',
    'Continue',
    '同意',
    '接受',
    '我知道了',
    '继续'
  ];

  for (const label of labels) {
    const button = page.getByRole('button', {name: new RegExp(label, 'i')}).first();
    try {
      if (await button.isVisible({timeout: 600})) {
        await button.click({timeout: 1200});
      }
    } catch {
      // Ignore overlays that are absent or non-clickable.
    }
  }
};

const main = async () => {
  await fs.mkdir(assetDir, {recursive: true});
  const selection = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
  const items = pickItems(selection);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });

  const context = await browser.newContext({
    viewport: {width: 1440, height: 1100},
    deviceScaleFactor: 1,
    locale: 'zh-CN',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'
  });

  const results = [];

  for (const item of items) {
    const key = slugify(item.key ?? item.title);

    if (!item.sources?.length) {
      results.push({
        key,
        title: item.title,
        status: 'skipped',
        reason: 'missing source url'
      });
      continue;
    }

    const base = `${String(item.rank ?? results.length + 1).padStart(2, '0')}-${key}`;
    const viewportPath = path.join(assetDir, `${base}-viewport.png`);
    const fullPagePath = path.join(assetDir, `${base}-fullpage.png`);
    const attempts = [];
    let captured = false;

    for (const source of item.sources) {
      const url = source?.url;
      if (!url) {
        continue;
      }

      const page = await context.newPage();
      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 45000
        });
        const status = response?.status() ?? null;
        if (status && status >= 400) {
          throw new Error(`HTTP ${status}`);
        }

        await page.waitForTimeout(2500);
        await dismissCommonOverlays(page);
        await page.screenshot({path: viewportPath});
        await page.screenshot({path: fullPagePath, fullPage: true});

        results.push({
          key,
          title: item.title,
          source_name: source.name ?? '',
          source_url: url,
          status: 'captured',
          http_status: status,
          viewport_asset: path.relative(root, viewportPath).replaceAll(path.sep, '/'),
          fullpage_asset: path.relative(root, fullPagePath).replaceAll(path.sep, '/'),
          attempts
        });
        captured = true;
        break;
      } catch (error) {
        attempts.push({
          source_name: source.name ?? '',
          source_url: url,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        await page.close();
      }
    }

    if (!captured) {
      results.push({
        key,
        title: item.title,
        status: 'failed',
        attempts
      });
    }
  }

  await browser.close();

  const manifest = {
    date,
    generated_at: new Date().toISOString(),
    source_selection: path.relative(root, selectionPath).replaceAll(path.sep, '/'),
    asset_dir: path.relative(root, assetDir).replaceAll(path.sep, '/'),
    items: results
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
