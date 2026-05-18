import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {buildSelection, collectDailyItems, renderSelectionMarkdown} from './five_day_selection_job_utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const readArg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const todayShanghai = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const timestampShanghai = () => `${new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00')}`;
const slash = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/');

const appendLog = async (entry) => {
  const logPath = path.join(root, 'logs', 'five-day-selection-job.jsonl');
  await fs.mkdir(path.dirname(logPath), {recursive: true});
  await fs.appendFile(logPath, `${JSON.stringify({...entry, at: timestampShanghai()})}\n`, 'utf8');
  return logPath;
};

const readDailyArchives = async () => {
  const dir = path.join(root, 'data', 'daily');
  const names = await fs.readdir(dir);
  const archives = [];

  for (const name of names.filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file)).sort().reverse().slice(0, 5)) {
    const fullPath = path.join(dir, name);
    archives.push(JSON.parse(await fs.readFile(fullPath, 'utf8')));
  }

  return archives;
};

const runSupplementIfNeeded = (date) => {
  const result = spawnSync('node', ['scripts/run_news_aggregator.mjs', '--profile', 'five_day_supplement', '--date', date], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 30
  });

  if (result.status !== 0) {
    return {ok: false, error: (result.stderr || result.stdout).trim()};
  }

  return {ok: true};
};

const main = async () => {
  const date = readArg('--date', todayShanghai());
  const force = args.includes('--force');
  const outputPath = path.join(root, 'data', 'selected', `${date}-selection.json`);
  const reportPath = path.join(root, 'reports', `${date}-five-day-selection.md`);

  await appendLog({event: 'start', date, force});

  if (!force) {
    try {
      await fs.access(outputPath);
      await fs.access(reportPath);
      await appendLog({event: 'skip_existing', date, output: slash(outputPath), report: slash(reportPath)});
      console.log(JSON.stringify({status: 'skipped', date, output: slash(outputPath), report: slash(reportPath)}, null, 2));
      return;
    } catch {
      // Continue when selection artifacts are missing.
    }
  }

  let archives = await readDailyArchives();
  let items = collectDailyItems({archives, targetDate: date});

  if (items.length < 8) {
    const supplement = runSupplementIfNeeded(date);
    await appendLog({event: 'supplement_attempt', date, ok: supplement.ok, error: supplement.error?.slice(0, 1000)});
    archives = await readDailyArchives();
    items = collectDailyItems({archives, targetDate: date});
  }

  if (items.length === 0) {
    await appendLog({event: 'no_items', date});
    throw new Error('No daily archive items available for five-day selection.');
  }

  const selection = buildSelection({targetDate: date, items});
  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.mkdir(path.dirname(reportPath), {recursive: true});
  await fs.writeFile(outputPath, `${JSON.stringify(selection, null, 2)}\n`, 'utf8');
  await fs.writeFile(reportPath, `${renderSelectionMarkdown({
    selection,
    logPath: 'logs/five-day-selection-job.jsonl'
  })}\n`, 'utf8');

  await appendLog({
    event: 'success',
    date,
    input_items: items.length,
    candidate_count: selection.candidates.length,
    recommended_count: selection.recommended.length,
    output: slash(outputPath),
    report: slash(reportPath)
  });

  console.log(JSON.stringify({
    status: 'ok',
    date,
    input_items: items.length,
    candidate_count: selection.candidates.length,
    recommended_count: selection.recommended.length,
    output: slash(outputPath),
    report: slash(reportPath)
  }, null, 2));
};

main().catch(async (error) => {
  await appendLog({event: 'fatal', error: error instanceof Error ? error.message : String(error)});
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
