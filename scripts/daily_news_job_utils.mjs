const DEFAULT_FACT_NOTE =
  '来自 news-aggregator 原始扫描；正式选题前仍需补充官方源或可信媒体交叉核验。';

const categoryRules = [
  {category: '芯片/硬科技', pattern: /chip|gpu|nvidia|amd|tsmc|semiconductor|h200|算力|芯片|半导体|光模块|封装/i},
  {category: '消费电子', pattern: /android|iphone|apple|googlebook|phone|device|wearable|手机|电脑|终端|硬件/i},
  {category: '政策监管', pattern: /policy|regulation|cma|export|control|safety|guardrail|监管|政策|安全|伦理|出口管制/i},
  {category: '融资并购', pattern: /funding|ipo|acquire|merger|valuation|round|融资|收购|上市|并购|估值/i},
  {category: 'AI/大模型', pattern: /ai|openai|anthropic|gemini|gpt|claude|llm|agent|model|大模型|智能体/i},
  {category: '开源/开发者工具', pattern: /github|repository|repo|developer|cli|npm|开源|仓库|开发者|代码/i}
];

const asArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    return Object.values(payload).flatMap((value) => asArray(value));
  }

  return [];
};

const textOf = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
};

const classify = (item) => {
  const haystack = [
    item.title,
    item.name,
    item.description,
    item.summary,
    item.source,
    item.source_name,
    item.language
  ].filter(Boolean).join(' ');

  return categoryRules.find((rule) => rule.pattern.test(haystack))?.category ?? '互联网公司';
};

const scoreItem = (item, category) => {
  const heat = Number(item.heat ?? item.score ?? item.points ?? item.stars ?? item.upvotes ?? 0);
  let score = 6;

  if (category === 'AI/大模型' || category === '芯片/硬科技' || category === '政策监管') {
    score += 1;
  }
  if (heat >= 1000) {
    score += 1;
  } else if (heat >= 100) {
    score += 0.5;
  }

  return Math.min(9, Number(score.toFixed(1)));
};

const normalizeItem = (item) => {
  const title = textOf(item.title, item.name, item.repo, item.headline);
  const sourceUrl = textOf(item.url, item.link, item.html_url, item.discussion_url, item.source_url);

  if (!title || !sourceUrl) {
    return null;
  }

  const category = classify(item);
  const summary = textOf(item.summary, item.description, item.abstract, item.text, title);

  return {
    title,
    published_at: textOf(item.published_at, item.time, item.date, item.created_at, 'Unknown Time'),
    source_name: textOf(item.source_name, item.source, item.site, item.provider, 'news-aggregator'),
    source_url: sourceUrl,
    summary,
    category,
    initial_score: scoreItem(item, category),
    follow_up: category !== '互联网公司',
    fact_check_notes: textOf(item.fact_check_notes, item.note, DEFAULT_FACT_NOTE)
  };
};

export const flattenRawItems = (rawPayload) => {
  const seen = new Set();
  const normalized = [];

  for (const item of asArray(rawPayload)) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const normalizedItem = normalizeItem(item);
    if (!normalizedItem) {
      continue;
    }

    const key = `${normalizedItem.title.toLowerCase()}|${normalizedItem.source_url.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(normalizedItem);
  }

  return normalized.sort((left, right) => right.initial_score - left.initial_score);
};

export const buildDailyArchive = ({date, rawPayload, generatedAt}) => {
  const items = flattenRawItems(rawPayload).slice(0, 15);
  const highPriority = items.filter((item) => item.initial_score >= 7.5);

  return {
    date,
    timezone: 'Asia/Shanghai',
    positioning: '普通人看懂的一周科技大事',
    generated_at: generatedAt,
    run_note: '由本地每日任务从 news-aggregator 原始候选池生成；用于保证 Windows 计划任务可独立产出日报，重点新闻仍建议在五天筛选阶段二次核验。',
    items,
    coverage_summary: {
      total_items: items.length,
      high_priority_items: highPriority.length,
      recommended_follow_up_topics: highPriority.slice(0, 5).map((item) => item.title)
    }
  };
};

export const renderDailyMarkdown = ({archive, rawPath, logPath}) => {
  const lines = [
    `# ${archive.date} 每日科技新闻抓取`,
    '',
    `生成时间：${archive.generated_at}`,
    '',
    archive.run_note,
    '',
    '## 运行诊断',
    '',
    `- 原始候选池：${rawPath}`,
    `- 运行日志：${logPath}`,
    `- 条目数量：${archive.coverage_summary.total_items}`,
    '',
    '## 今日重点',
    ''
  ];

  if (archive.items.length === 0) {
    lines.push('- 今日未从原始候选池解析出有效条目，请查看运行日志和 raw scan 输出。');
  } else {
    archive.items.slice(0, 5).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
    });
  }

  lines.push('', '## 新闻条目', '');

  archive.items.forEach((item, index) => {
    lines.push(
      `### ${index + 1}. ${item.title}`,
      '',
      `- 发布时间：${item.published_at}`,
      `- 来源：${item.source_name}`,
      `- 原文链接：${item.source_url}`,
      `- 分类：${item.category}`,
      `- 初步重要性评分：${item.initial_score}`,
      `- 是否需要后续关注：${item.follow_up ? '是' : '否'}`,
      `- 中文摘要：${item.summary}`,
      `- 事实核验备注：${item.fact_check_notes}`,
      ''
    );
  });

  return lines.join('\n');
};
