import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {buildDailyArchive, renderDailyMarkdown} from './daily_news_job_utils.mjs';

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

const timestampShanghai = () => {
  const now = new Date();
  const offsetMs = 8 * 60 * 60 * 1000;
  return `${new Date(now.getTime() + offsetMs).toISOString().replace('Z', '+08:00')}`;
};

const slash = (filePath) => path.relative(root, filePath).replaceAll(path.sep, '/');

const appendLog = async (entry) => {
  const logPath = path.join(root, 'logs', 'daily-news-job.jsonl');
  await fs.mkdir(path.dirname(logPath), {recursive: true});
  await fs.appendFile(logPath, `${JSON.stringify({...entry, at: timestampShanghai()})}\n`, 'utf8');
  return logPath;
};

const main = async () => {
  const date = readArg('--date', todayShanghai());
  const force = args.includes('--force');
  const finalJsonPath = path.join(root, 'data', 'daily', `${date}.json`);
  const finalReportPath = path.join(root, 'reports', `${date}.md`);
  const rawPath = path.join(root, 'data', 'daily', `${date}-news-aggregator-raw.json`);

  await appendLog({event: 'start', date, force});

  if (!force) {
    try {
      await fs.access(finalJsonPath);
      await fs.access(finalReportPath);
      await appendLog({event: 'skip_existing', date, json: slash(finalJsonPath), report: slash(finalReportPath)});
      console.log(JSON.stringify({status: 'skipped', date, json: slash(finalJsonPath), report: slash(finalReportPath)}, null, 2));
      return;
    } catch {
      // Continue when either final artifact is missing.
    }
  }

  const aggregate = spawnSync('node', ['scripts/run_news_aggregator.mjs', '--profile', 'daily_collect', '--date', date], {
    cwd: root,
    encoding: 'utf8',
    env: {...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? ''},
    maxBuffer: 1024 * 1024 * 30
  });

  if (aggregate.error) {
    await appendLog({event: 'aggregate_error', date, error: aggregate.error.message});
    throw aggregate.error;
  }

  if (aggregate.status !== 0) {
    await appendLog({
      event: 'aggregate_failed',
      date,
      status: aggregate.status,
      stderr: aggregate.stderr.trim().slice(0, 4000)
    });
    throw new Error(aggregate.stderr.trim() || `news aggregator exited with ${aggregate.status}`);
  }

  const rawPayload = JSON.parse(await fs.readFile(rawPath, 'utf8'));
  const archive = buildDailyArchive({
    date,
    rawPayload,
    generatedAt: timestampShanghai()
  });

  if (archive.items.length === 0) {
    await appendLog({event: 'no_items', date, raw: slash(rawPath)});
    throw new Error(`No valid news items parsed from ${slash(rawPath)}`);
  }

  await fs.mkdir(path.dirname(finalJsonPath), {recursive: true});
  await fs.mkdir(path.dirname(finalReportPath), {recursive: true});
  await fs.writeFile(finalJsonPath, `${JSON.stringify(archive, null, 2)}\n`, 'utf8');
  await fs.writeFile(finalReportPath, `${renderDailyMarkdown({
    archive,
    rawPath: slash(rawPath),
    logPath: 'logs/daily-news-job.jsonl'
  })}\n`, 'utf8');

  await appendLog({
    event: 'success',
    date,
    item_count: archive.items.length,
    json: slash(finalJsonPath),
    report: slash(finalReportPath),
    raw: slash(rawPath)
  });

  console.log(JSON.stringify({
    status: 'ok',
    date,
    item_count: archive.items.length,
    json: slash(finalJsonPath),
    report: slash(finalReportPath),
    raw: slash(rawPath)
  }, null, 2));
};

main().catch(async (error) => {
  await appendLog({event: 'fatal', error: error instanceof Error ? error.message : String(error)});
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
