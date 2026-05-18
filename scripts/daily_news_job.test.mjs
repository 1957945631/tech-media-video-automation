import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDailyArchive,
  flattenRawItems,
  renderDailyMarkdown
} from './daily_news_job_utils.mjs';

test('flattenRawItems normalizes nested news aggregator payloads', () => {
  const raw = {
    hackernews: [
      {
        title: 'OpenAI releases a new coding agent',
        url: 'https://example.com/openai-agent',
        time: '2026-05-18',
        source: 'Hacker News',
        summary: 'A developer tool update.',
        heat: 120
      }
    ],
    github: [
      {
        name: 'owner/project',
        html_url: 'https://github.com/owner/project',
        description: 'A useful AI repository.',
        language: 'TypeScript',
        stars: 4200
      }
    ]
  };

  const items = flattenRawItems(raw);
  const openaiItem = items.find((item) => item.source_url === 'https://example.com/openai-agent');
  const githubItem = items.find((item) => item.source_url === 'https://github.com/owner/project');

  assert.equal(items.length, 2);
  assert.deepEqual(openaiItem, {
    title: 'OpenAI releases a new coding agent',
    published_at: '2026-05-18',
    source_name: 'Hacker News',
    source_url: 'https://example.com/openai-agent',
    summary: 'A developer tool update.',
    category: 'AI/大模型',
    initial_score: 7.5,
    follow_up: true,
    fact_check_notes: '来自 news-aggregator 原始扫描；正式选题前仍需补充官方源或可信媒体交叉核验。'
  });
  assert.equal(githubItem.title, 'owner/project');
  assert.equal(githubItem.category, 'AI/大模型');
  assert.equal(githubItem.initial_score, 8);
});

test('buildDailyArchive creates stable daily schema with top items', () => {
  const archive = buildDailyArchive({
    date: '2026-05-18',
    rawPayload: [
      {title: 'Chip export control update', url: 'https://example.com/chips', source: 'Reuters'},
      {title: 'Consumer electronics launch', url: 'https://example.com/device', source: 'Official Blog'}
    ],
    generatedAt: '2026-05-18T09:00:00+08:00'
  });

  assert.equal(archive.date, '2026-05-18');
  assert.equal(archive.timezone, 'Asia/Shanghai');
  assert.equal(archive.items.length, 2);
  assert.equal(archive.coverage_summary.total_items, 2);
  assert.match(archive.run_note, /本地每日任务/);
});

test('renderDailyMarkdown includes item links and diagnostics', () => {
  const archive = buildDailyArchive({
    date: '2026-05-18',
    rawPayload: [{title: 'AI regulation update', url: 'https://example.com/reg', source: 'Gov'}],
    generatedAt: '2026-05-18T09:00:00+08:00'
  });

  const markdown = renderDailyMarkdown({
    archive,
    rawPath: 'data/daily/2026-05-18-news-aggregator-raw.json',
    logPath: 'logs/daily-news-job.jsonl'
  });

  assert.match(markdown, /2026-05-18 每日科技新闻抓取/);
  assert.match(markdown, /https:\/\/example.com\/reg/);
  assert.match(markdown, /data\/daily\/2026-05-18-news-aggregator-raw\.json/);
  assert.match(markdown, /logs\/daily-news-job\.jsonl/);
});
