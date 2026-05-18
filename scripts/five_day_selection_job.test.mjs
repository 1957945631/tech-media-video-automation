import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSelection,
  collectDailyItems,
  renderSelectionMarkdown
} from './five_day_selection_job_utils.mjs';

const dailyArchive = (date, items) => ({date, items});

test('collectDailyItems reads recent daily archives and dedupes by event', () => {
  const archives = [
    dailyArchive('2026-05-18', [
      {
        title: 'OpenAI 发布企业 AI 落地服务',
        published_at: '2026-05-18',
        source_name: 'OpenAI',
        source_url: 'https://openai.com/a',
        summary: '企业 AI 服务上线。',
        category: 'AI/大模型',
        initial_score: 9,
        follow_up: true,
        fact_check_notes: '官方来源。'
      }
    ]),
    dailyArchive('2026-05-17', [
      {
        title: 'OpenAI 推出企业 AI 落地服务',
        published_at: '2026-05-17',
        source_name: 'Reuters',
        source_url: 'https://reuters.com/a',
        summary: '同一事件的媒体报道。',
        category: 'AI/大模型',
        initial_score: 8,
        follow_up: true,
        fact_check_notes: '媒体交叉核验。'
      }
    ])
  ];

  const items = collectDailyItems({archives, targetDate: '2026-05-18'});

  assert.equal(items.length, 1);
  assert.equal(items[0].source_name, 'OpenAI');
  assert.equal(items[0].archive_date, '2026-05-18');
});

test('buildSelection returns balanced candidates and recommended items', () => {
  const rawItems = [
    ['OpenAI 发布企业 AI 落地服务', 'AI/大模型', 'OpenAI', 9],
    ['Google Android 加入 Gemini 系统能力', '消费电子', 'Google Blog', 8.8],
    ['TSMC 上调 AI 芯片市场预期', '芯片/硬科技', 'Reuters', 8.7],
    ['Apple 研究 AI Agent 进入 App Store', '互联网公司', 'MacRumors', 7.9],
    ['Anthropic 呼吁强化 AI 芯片出口管制', '政策监管', 'Axios', 8.2],
    ['OpenAI 回应 npm 供应链攻击', '政策监管', 'OpenAI Newsroom', 7.6],
    ['国产算力大会预热开发者生态', '芯片/硬科技', '中国经济网', 7.5],
    ['AI 推理周期带动光模块关注', '芯片/硬科技', '36氪', 6.9],
    ['AI 视频 Agent 新产品发布', 'AI/大模型', 'Product Hunt', 7],
    ['美国人不信任 AI 调查', 'AI/大模型', 'The Verge', 7]
  ].map(([title, category, source_name, initial_score], index) => ({
    title,
    category,
    source_name,
    initial_score,
    source_url: `https://example.com/${index}`,
    summary: `${title} 的事件摘要。`,
    published_at: '2026-05-18',
    fact_check_notes: '测试来源。',
    follow_up: true,
    archive_date: '2026-05-18'
  }));

  const selection = buildSelection({targetDate: '2026-05-18', items: rawItems});

  assert.equal(selection.date, '2026-05-18');
  assert.ok(selection.candidates.length >= 8);
  assert.ok(selection.candidates.length <= 12);
  assert.ok(selection.recommended.length >= 5);
  assert.ok(selection.recommended.length <= 7);
  assert.ok(selection.recommended.some((item) => item.category === '消费电子'));
  assert.ok(selection.recommended.some((item) => item.category === '芯片/硬科技'));
  assert.equal(selection.recommended[0].rank, 1);
});

test('renderSelectionMarkdown includes candidate and recommended sections', () => {
  const selection = buildSelection({
    targetDate: '2026-05-18',
    items: [
      {
        title: 'OpenAI 发布企业 AI 落地服务',
        category: 'AI/大模型',
        source_name: 'OpenAI',
        initial_score: 9,
        source_url: 'https://openai.com/a',
        summary: '企业 AI 服务上线。',
        published_at: '2026-05-18',
        fact_check_notes: '官方来源。',
        follow_up: true,
        archive_date: '2026-05-18'
      }
    ]
  });

  const markdown = renderSelectionMarkdown({
    selection,
    logPath: 'logs/five-day-selection-job.jsonl'
  });

  assert.match(markdown, /五天科技新闻筛选/);
  assert.match(markdown, /推荐入选/);
  assert.match(markdown, /候选池/);
  assert.match(markdown, /logs\/five-day-selection-job\.jsonl/);
});
