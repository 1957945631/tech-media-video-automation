const sourceReliability = [
  {pattern: /openai|google|apple|microsoft|anthropic|nvidia|tsmc|official|blog|newsroom|官网|官方/i, score: 2},
  {pattern: /reuters|axios|the verge|marketwatch|marketscreener|财新|界面|晚点|36氪|中国经济网/i, score: 1.4},
  {pattern: /product hunt|hacker news|github|weibo|v2ex/i, score: 0.8}
];

const topicTargets = {
  'AI/大模型': 2,
  '消费电子': 1,
  '互联网公司': 1,
  '芯片/硬科技': 1,
  '政策监管': 1,
  '融资并购': 1,
  '开源/开发者工具': 1
};

const tokensOf = (title) => title
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .split(/\s+/)
  .filter((word) => word.length > 1)
  .filter((word) => !/^(发布|推出|研究|回应|服务|进入|上线|the|and|for|with)$/i.test(word));

const isDuplicateEvent = (left, right) => {
  const leftTokens = new Set(tokensOf(left));
  const rightTokens = new Set(tokensOf(right));
  const shared = [...leftTokens].filter((token) => rightTokens.has(token));
  return shared.length >= 2;
};

const sourceScore = (sourceName, sourceUrl) => {
  const text = `${sourceName ?? ''} ${sourceUrl ?? ''}`;
  return sourceReliability.find((rule) => rule.pattern.test(text))?.score ?? 1;
};

const freshnessScore = (publishedAt, archiveDate, targetDate) => {
  const base = Date.parse(`${targetDate}T00:00:00+08:00`);
  const rawDate = /^\d{4}-\d{2}-\d{2}/.test(publishedAt ?? '') ? publishedAt.slice(0, 10) : archiveDate;
  const itemTime = Date.parse(`${rawDate}T00:00:00+08:00`);
  if (!Number.isFinite(base) || !Number.isFinite(itemTime)) {
    return 0.5;
  }
  const days = Math.max(0, Math.round((base - itemTime) / 86400000));
  return Math.max(0, 1.5 - days * 0.25);
};

const explainabilityScore = (item) => {
  const text = `${item.title ?? ''} ${item.summary ?? ''}`;
  let score = 1;
  if (/普通人|用户|手机|电脑|工作|安全|价格|监管|企业|开发者|App|应用/i.test(text)) {
    score += 0.6;
  }
  if ((item.summary ?? '').length >= 40) {
    score += 0.4;
  }
  return Math.min(2, score);
};

const videoAngle = (item) => {
  const category = item.category ?? '备用热点';
  if (category === '消费电子') {
    return '用“以后手机/电脑会怎么变”开场，结合用户场景讲清产品变化。';
  }
  if (category === '芯片/硬科技') {
    return '用“AI 背后的算力账单”解释产业链和普通人能感知到的产品速度。';
  }
  if (category === '政策监管') {
    return '用“规则正在追上技术”讲清谁受影响、哪些能力会被限制或放开。';
  }
  if (category === '融资并购') {
    return '用“钱流向哪里，行业就往哪里卷”解释资本信号。';
  }
  if (category === '互联网公司') {
    return '用平台规则变化解释用户、开发者和生态的连锁影响。';
  }
  return '用一个具体使用场景切入，再解释它为什么代表本周科技趋势。';
};

const publicImpact = (item) => {
  const category = item.category ?? '备用热点';
  if (category === '消费电子') {
    return '可能改变用户使用手机、电脑或应用的入口和习惯。';
  }
  if (category === '芯片/硬科技') {
    return '会影响 AI 服务成本、产品速度，以及硬件产业链的投入方向。';
  }
  if (category === '政策监管') {
    return '会影响 AI 产品能不能上线、怎么收费、哪些能力需要限制。';
  }
  if (category === '融资并购') {
    return '反映产业资源集中方向，后续可能影响产品竞争和就业机会。';
  }
  return '能帮助普通观众理解本周科技公司和 AI 产品为什么值得关注。';
};

const whyImportant = (item) => {
  const category = item.category ?? '备用热点';
  return `它属于${category}主线，分数和来源显示具有持续发酵价值，适合进入“一周科技大事”的候选池。`;
};

const riskNote = (item) => {
  const notes = item.fact_check_notes ?? '';
  if (/传|曝|rumor|reported|报道称|爆料/i.test(`${item.title} ${notes}`)) {
    return '含报道或爆料口径，视频中需要明确标注尚待官方确认。';
  }
  if (/官方|OpenAI|Google|Apple|Microsoft|Anthropic|Nvidia|TSMC/i.test(`${item.source_name} ${notes}`)) {
    return '来源相对可靠，但仍建议保留原文链接并避免过度外推。';
  }
  return '来自候选池或媒体整理，正式口播前建议补充一个权威来源交叉核验。';
};

export const collectDailyItems = ({archives, targetDate}) => {
  const candidates = [];
  const seen = new Set();

  for (const archive of archives) {
    for (const item of archive.items ?? []) {
      if (!item?.title || !item?.source_url) {
        continue;
      }
      if ([...seen].some((title) => isDuplicateEvent(title, item.title))) {
        continue;
      }
      seen.add(item.title);
      candidates.push({
        ...item,
        archive_date: archive.date,
        freshness_score: freshnessScore(item.published_at, archive.date, targetDate)
      });
    }
  }

  return candidates;
};

const rankItems = (items, targetDate) => items
  .map((item) => {
    const reliability = sourceScore(item.source_name, item.source_url);
    const freshness = freshnessScore(item.published_at, item.archive_date, targetDate);
    const explainability = explainabilityScore(item);
    const impact = Number(item.initial_score ?? 6) / 2;
    const score = impact + reliability + freshness + explainability;
    return {...item, selection_score: Number(Math.min(10, score).toFixed(1))};
  })
  .sort((left, right) => right.selection_score - left.selection_score);

const pickBalanced = (ranked, minCount, maxCount) => {
  const picked = [];
  const used = new Set();

  for (const [category, target] of Object.entries(topicTargets)) {
    const matches = ranked.filter((item) => item.category === category && !used.has(item.source_url)).slice(0, target);
    for (const item of matches) {
      picked.push(item);
      used.add(item.source_url);
      if (picked.length >= maxCount) {
        return picked;
      }
    }
  }

  for (const item of ranked) {
    if (picked.length >= maxCount) {
      break;
    }
    if (!used.has(item.source_url)) {
      picked.push(item);
      used.add(item.source_url);
    }
  }

  return picked.slice(0, Math.max(minCount, Math.min(maxCount, picked.length)));
};

const toSelectionItem = (item, index) => ({
  rank: index + 1,
  title: item.title,
  category: item.category ?? '备用热点',
  event_summary: item.summary ?? item.title,
  why_important: whyImportant(item),
  public_impact: publicImpact(item),
  video_angle: videoAngle(item),
  source_name: item.source_name ?? 'Unknown Source',
  source_url: item.source_url,
  published_at: item.published_at ?? 'Unknown Time',
  selection_score: item.selection_score,
  risk_note: riskNote(item),
  archive_date: item.archive_date
});

export const buildSelection = ({targetDate, items}) => {
  const ranked = rankItems(items, targetDate);
  const candidates = pickBalanced(ranked, 8, 12).map(toSelectionItem);
  const recommended = pickBalanced(candidates, 5, 7).map((item, index) => ({...item, rank: index + 1}));

  return {
    date: targetDate,
    timezone: 'Asia/Shanghai',
    positioning: '普通人看懂的一周科技大事',
    generated_at: new Date().toISOString(),
    method: 'local deterministic five-day selector based on daily archives, source reliability, freshness, explainability, and topic balance',
    candidates,
    recommended,
    coverage_summary: {
      input_items: items.length,
      candidate_count: candidates.length,
      recommended_count: recommended.length,
      categories: [...new Set(candidates.map((item) => item.category))]
    }
  };
};

export const renderSelectionMarkdown = ({selection, logPath}) => {
  const lines = [
    `# ${selection.date} 五天科技新闻筛选`,
    '',
    `生成时间：${selection.generated_at}`,
    '',
    `运行日志：${logPath}`,
    '',
    '## 推荐入选',
    ''
  ];

  selection.recommended.forEach((item) => {
    lines.push(
      `### ${item.rank}. ${item.title}`,
      '',
      `- 分类：${item.category}`,
      `- 分数：${item.selection_score}`,
      `- 事件摘要：${item.event_summary}`,
      `- 为什么重要：${item.why_important}`,
      `- 对普通人的影响：${item.public_impact}`,
      `- 视频讲述角度：${item.video_angle}`,
      `- 来源：${item.source_name} ${item.source_url}`,
      `- 风险提醒：${item.risk_note}`,
      ''
    );
  });

  lines.push('## 候选池', '');
  selection.candidates.forEach((item) => {
    lines.push(`- ${item.rank}. [${item.title}](${item.source_url}) | ${item.category} | ${item.selection_score} | ${item.risk_note}`);
  });

  return lines.join('\n');
};
