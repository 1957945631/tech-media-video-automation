import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config', 'news-aggregator.json');
const args = process.argv.slice(2);

const readArg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const hasArg = (name) => args.includes(name);

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const expandHome = (value) => {
  if (!value) {
    return value;
  }

  return value
    .replace('%USERPROFILE%', process.env.USERPROFILE ?? '')
    .replace('$HOME', process.env.HOME ?? process.env.USERPROFILE ?? '');
};

const ensureJson = (stdout) => {
  const text = stdout.trim();
  if (!text) {
    throw new Error('news-aggregator-skill returned empty stdout.');
  }

  return JSON.parse(text);
};

const countItems = (payload) => {
  if (Array.isArray(payload)) {
    return payload.length;
  }

  if (payload && typeof payload === 'object') {
    return Object.values(payload).reduce((total, value) => {
      if (Array.isArray(value)) {
        return total + value.length;
      }
      return total;
    }, 0);
  }

  return 0;
};

const main = async () => {
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const profileName = readArg('--profile', 'daily_collect');
  const date = readArg('--date', today());
  const profile = config.profiles[profileName];

  if (!profile) {
    const names = Object.keys(config.profiles).join(', ');
    throw new Error(`Unknown profile "${profileName}". Available profiles: ${names}`);
  }

  const skillDir = path.resolve(
    expandHome(process.env[config.skill.override_env]) ||
      expandHome(config.skill.default_dir)
  );
  const scriptName = profile.runner === 'daily_briefing' ? 'daily_briefing.py' : 'fetch_news.py';
  const scriptPath = path.join(skillDir, 'scripts', scriptName);
  const commandArgs = [scriptPath];

  if (profile.runner === 'daily_briefing') {
    commandArgs.push('--profile', profile.profile ?? 'general', '--no-save');
  } else {
    commandArgs.push('--source', profile.source, '--limit', String(profile.limit ?? 10), '--no-save');
    const keyword = readArg('--keyword', profile.keyword ?? '');
    if (keyword) {
      commandArgs.push('--keyword', keyword);
    }
    if (profile.deep || hasArg('--deep')) {
      commandArgs.push('--deep');
    }
  }

  const result = spawnSync('python', commandArgs, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8'
    },
    maxBuffer: 1024 * 1024 * 20
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || `news-aggregator-skill exited with ${result.status}`);
  }

  const payload = ensureJson(result.stdout);
  const outputPath = path.join(root, profile.output.replace('{date}', date));
  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  const reportDir = path.join(root, 'reports');
  await fs.mkdir(reportDir, {recursive: true});
  const reportPath = path.join(reportDir, `${date}-${profileName}-news-aggregator.md`);
  const report = [
    `# News Aggregator Raw Scan - ${date}`,
    '',
    `- Profile: ${profileName}`,
    `- Description: ${profile.description}`,
    `- Skill dir: ${skillDir}`,
    `- Output JSON: ${path.relative(root, outputPath).replaceAll(path.sep, '/')}`,
    `- Item count: ${countItems(payload)}`,
    '',
    'This file records the raw scan handoff. The daily collection or selection automation should transform the JSON into the project schema before publishing the final report.'
  ].join('\n');
  await fs.writeFile(reportPath, `${report}\n`, 'utf8');

  console.log(JSON.stringify({
    profile: profileName,
    date,
    output: path.relative(root, outputPath).replaceAll(path.sep, '/'),
    report: path.relative(root, reportPath).replaceAll(path.sep, '/'),
    item_count: countItems(payload)
  }, null, 2));
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
