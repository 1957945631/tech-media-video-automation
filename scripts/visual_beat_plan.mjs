import fs from 'node:fs/promises';
import path from 'node:path';

const accentPalette = ['#f5b400', '#5eead4', '#8ab4f8', '#f87171', '#60a5fa', '#a78bfa', '#34d399'];

const categoryKickers = [
  [/ai|大模型|模型|agent|智能/i, 'AI 落地'],
  [/芯片|半导体|算力|能源|电力|数据中心/i, '基础设施'],
  [/监管|政策|安全|供应链|治理/i, '规则与风险'],
  [/手机|硬件|设备|消费|终端/i, '终端体验'],
  [/开源|开发|npm|github/i, '开发生态']
];

const stopWords = new Set([
  'https',
  'http',
  'www',
  'com',
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'news',
  'daily',
  '2026',
  '2025'
]);

const asArray = (value) => (Array.isArray(value) ? value : []);

const compact = (value, limit = 36) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

export const slugify = (value) =>
  String(value ?? 'item')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'item';

export const extractKeywords = (parts, limit = 12) => {
  const text = asArray(parts)
    .filter(Boolean)
    .join(' ')
    .replace(/https?:\/\/\S+/g, ' ');
  const tokens = text.match(/[\p{Script=Han}]{2,}|[a-zA-Z][a-zA-Z0-9.+-]{2,}/gu) ?? [];
  const seen = new Set();
  const keywords = [];

  for (const token of tokens) {
    const normalized = token.toLowerCase();
    if (stopWords.has(normalized) || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    keywords.push(token);
    if (keywords.length >= limit) {
      break;
    }
  }

  return keywords;
};

const keywordText = (keywords) => asArray(keywords).join('、') || '本期主线';

const getKicker = (item) => {
  const text = `${item.category ?? ''} ${item.title ?? ''} ${item.summary ?? ''}`;
  const match = categoryKickers.find(([pattern]) => pattern.test(text));
  return match?.[1] ?? compact(item.category ?? '科技变化', 8);
};

const getSummary = (item) =>
  item.event_summary ??
  item.video_angle ??
  item.why_it_matters ??
  item.summary ??
  item.description ??
  item.title ??
  '这条新闻需要结合来源与当期口播解释。';

const storyFromSelectionItem = (item, index) => {
  const keywords = extractKeywords([
    item.title,
    item.category,
    item.source_name,
    item.video_angle,
    item.event_summary,
    item.why_it_matters
  ]);
  const title = item.title ?? `新闻 ${index + 1}`;

  return {
    id: slugify(`${index + 1}-${title}`),
    segmentId: `news_${index + 1}`,
    kicker: getKicker(item),
    title: compact(title, 28),
    body: compact(getSummary(item), 96),
    ribbon: compact(item.video_angle ?? item.why_it_matters ?? item.category ?? '值得关注的科技变化', 30),
    accent: accentPalette[index % accentPalette.length],
    sourceName: item.source_name ?? item.publisher ?? null,
    sourceUrl: item.source_url ?? item.url ?? null,
    risk: item.risk_reminder ?? item.risk ?? item.fact_check_notes ?? null,
    category: item.category ?? null,
    keywords,
    rawTitle: title
  };
};

const makeBeat = ({id, segmentId, intent, subject, action, concept, visualRole, keywords, assetQuery, overlayTitle, transitionOut = 'cut'}) => ({
  id,
  segmentId,
  captionRange: [0, 0],
  intent,
  subject,
  action,
  concept,
  visualRole,
  keywords,
  assetQuery,
  overlayTitle,
  transitionOut
});

const buildStoryBeats = (story, index) => {
  const keyText = keywordText(story.keywords.slice(0, 4));
  const sourceQuery = [story.rawTitle, story.sourceName, story.sourceUrl, ...story.keywords].filter(Boolean).join(' ');

  return [
    makeBeat({
      id: `${story.id}-evidence`,
      segmentId: story.segmentId,
      intent: `展示第 ${index + 1} 条新闻的当期来源，先让画面证明这条信息从哪里来。`,
      subject: story.rawTitle,
      action: '呈现来源与核心事实',
      concept: story.body,
      visualRole: 'evidence',
      keywords: story.keywords,
      assetQuery: [sourceQuery],
      overlayTitle: `第 ${index + 1} 条：${story.title}`,
      transitionOut: 'cut'
    }),
    makeBeat({
      id: `${story.id}-explain`,
      segmentId: story.segmentId,
      intent: '把新闻里的机制、因果或变化路径解释清楚。',
      subject: story.kicker,
      action: '拆解原因和结构',
      concept: story.body,
      visualRole: 'diagram',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} explainer diagram`],
      overlayTitle: compact(story.ribbon, 24),
      transitionOut: 'cut'
    }),
    makeBeat({
      id: `${story.id}-real-world-context`,
      segmentId: story.segmentId,
      intent: '补充和这条新闻相关的真实场景，让画面从网页证据落到现实行业或使用现场。',
      subject: story.rawTitle,
      action: '连接真实场景',
      concept: story.body,
      visualRole: 'broll',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} real world industry scene`],
      overlayTitle: compact(`${story.kicker} 的现场`, 24),
      transitionOut: 'cut'
    }),
    makeBeat({
      id: `${story.id}-concept-visual`,
      segmentId: story.segmentId,
      intent: '用概念画面承接抽象机制，避免长时间只看网页或文字卡。',
      subject: story.kicker,
      action: '抽象表达',
      concept: story.body,
      visualRole: 'concept',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} abstract technology concept`],
      overlayTitle: compact(story.kicker, 24),
      transitionOut: 'cut'
    }),
    makeBeat({
      id: `${story.id}-takeaway`,
      segmentId: story.segmentId,
      intent: '用一句判断收束这一条新闻，让观众记住它和本期主线的关系。',
      subject: story.rawTitle,
      action: '提炼判断',
      concept: story.ribbon,
      visualRole: 'keyword',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} takeaway`],
      overlayTitle: compact(story.ribbon, 24),
      transitionOut: 'flash'
    }),
    makeBeat({
      id: `${story.id}-impact`,
      segmentId: story.segmentId,
      intent: '落到用户、行业或下一步影响，避免只停留在标题转述。',
      subject: story.rawTitle,
      action: '说明影响',
      concept: story.risk ? `${story.body} 风险提示：${story.risk}` : story.body,
      visualRole: /产品|手机|应用|平台|agent|ai/i.test(`${story.category ?? ''} ${story.rawTitle}`) ? 'product_ui' : 'broll',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} impact product industry`],
      overlayTitle: compact(`影响：${story.ribbon}`, 24),
      transitionOut: 'cut'
    }),
    makeBeat({
      id: `${story.id}-user-or-industry-scene`,
      segmentId: story.segmentId,
      intent: '把影响落到用户、开发者、企业或产业链的具体场景。',
      subject: story.rawTitle,
      action: '展示影响发生的位置',
      concept: story.ribbon,
      visualRole: 'broll',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} user industry impact scene`],
      overlayTitle: compact(`落点：${story.kicker}`, 24),
      transitionOut: 'cut'
    }),
    makeBeat({
      id: `${story.id}-transition-scene`,
      segmentId: story.segmentId,
      intent: '用相关现实素材完成段落转场，为下一条新闻留出视觉呼吸。',
      subject: story.rawTitle,
      action: '段落转场',
      concept: story.ribbon,
      visualRole: 'broll',
      keywords: story.keywords,
      assetQuery: [`${story.rawTitle} ${keyText} related technology b-roll`],
      overlayTitle: compact(story.title, 24),
      transitionOut: 'flash'
    })
  ];
};

const assignCaptionDrafts = (beats, storyCount) => {
  const segmentOrder = ['intro', ...Array.from({length: storyCount}, (_, index) => `news_${index + 1}`), 'outro'];
  const segmentCounts = new Map(segmentOrder.map((segment) => [segment, beats.filter((beat) => beat.segmentId === segment).length]));
  let cursor = 0;
  const boundaries = [];

  for (const segment of segmentOrder) {
    const count = segmentCounts.get(segment) ?? 0;
    const width = Math.max(4, count * 4);
    boundaries.push({segment, startCaption: cursor, endCaption: cursor + width});
    cursor += width;
  }

  const positions = new Map();
  return {
    visualBeatPlan: beats.map((beat) => {
      const boundary = boundaries.find((item) => item.segment === beat.segmentId);
      const count = segmentCounts.get(beat.segmentId) ?? 1;
      const position = positions.get(beat.segmentId) ?? 0;
      positions.set(beat.segmentId, position + 1);
      const start = boundary.startCaption + Math.floor(((boundary.endCaption - boundary.startCaption) * position) / count);
      const end = boundary.startCaption + Math.floor(((boundary.endCaption - boundary.startCaption) * (position + 1)) / count);
      return {...beat, captionRange: [start, Math.max(start + 1, end)]};
    }),
    segmentBoundaries: boundaries
  };
};

export const buildVisualPlan = ({selection, voiceoverText = '', date = ''}) => {
  const recommended = asArray(selection?.recommended).slice(0, 8);
  const storyPlan = recommended.map(storyFromSelectionItem);
  const voiceKeywords = extractKeywords([voiceoverText], 10);
  const introKeywords = storyPlan.flatMap((story) => story.keywords.slice(0, 2)).slice(0, 8);
  const introConcept = keywordText([...introKeywords, ...voiceKeywords].slice(0, 8));

  const beats = [
    makeBeat({
      id: 'intro-thesis',
      segmentId: 'intro',
      intent: '建立本期新闻主线，先给观众一个判断框架。',
      subject: `${date} 科技新闻`,
      action: '提出主题',
      concept: introConcept,
      visualRole: 'keyword',
      keywords: introKeywords,
      assetQuery: [`${introConcept} tech news trend`],
      overlayTitle: '本期科技主线',
      transitionOut: 'cut'
    }),
    makeBeat({
      id: 'intro-map',
      segmentId: 'intro',
      intent: '把多条新闻整理成可理解的结构，而不是堆标题。',
      subject: '本期推荐新闻结构',
      action: '串联议题',
      concept: storyPlan.map((story) => story.kicker).join(' / '),
      visualRole: 'diagram',
      keywords: introKeywords,
      assetQuery: [`${storyPlan.map((story) => story.rawTitle).join(' ')} overview map`],
      overlayTitle: '先看结构',
      transitionOut: 'cut'
    }),
    makeBeat({
      id: 'intro-real-world',
      segmentId: 'intro',
      intent: '用真实科技产业场景建立本期不是纯文字资讯的视觉基调。',
      subject: `${date} 科技产业现场`,
      action: '建立现实感',
      concept: introConcept,
      visualRole: 'broll',
      keywords: introKeywords,
      assetQuery: [`${introConcept} real technology industry b-roll`],
      overlayTitle: '回到真实世界',
      transitionOut: 'cut'
    }),
    makeBeat({
      id: 'intro-concept',
      segmentId: 'intro',
      intent: '用趋势画面承接本期多条新闻之间的共同技术主线。',
      subject: `${date} 科技变化`,
      action: '抽象连接',
      concept: introConcept,
      visualRole: 'concept',
      keywords: introKeywords,
      assetQuery: [`${introConcept} abstract technology visual`],
      overlayTitle: '技术主线',
      transitionOut: 'cut'
    }),
    ...storyPlan.flatMap(buildStoryBeats),
    makeBeat({
      id: 'outro-mainline',
      segmentId: 'outro',
      intent: '把本期分散新闻收束成一条主线。',
      subject: '本期科技新闻',
      action: '总结共同趋势',
      concept: introConcept,
      visualRole: 'diagram',
      keywords: introKeywords,
      assetQuery: [`${introConcept} technology trend summary`],
      overlayTitle: '这几条新闻连在一起看',
      transitionOut: 'cut'
    }),
    makeBeat({
      id: 'outro-impact',
      segmentId: 'outro',
      intent: '提醒观众接下来继续关注真实产品、产业和规则变化。',
      subject: '后续观察',
      action: '提示影响',
      concept: '真正重要的是这些变化怎样进入产品、产业和日常使用。',
      visualRole: 'keyword',
      keywords: ['产品', '产业', '规则', ...introKeywords.slice(0, 3)],
      assetQuery: [`${introConcept} product industry regulation impact`],
      overlayTitle: '下一步看落地',
      transitionOut: 'cut'
    }),
    makeBeat({
      id: 'outro-real-world',
      segmentId: 'outro',
      intent: '用真实产业场景收束，强调这些新闻最终会进入产品、产业和生活。',
      subject: '科技产业落地',
      action: '现实收束',
      concept: introConcept,
      visualRole: 'broll',
      keywords: introKeywords,
      assetQuery: [`${introConcept} technology industry real world closing`],
      overlayTitle: '落地才是重点',
      transitionOut: 'cut'
    }),
    makeBeat({
      id: 'outro-concept',
      segmentId: 'outro',
      intent: '用概念画面完成最后的趋势收束。',
      subject: '本期趋势',
      action: '趋势收束',
      concept: introConcept,
      visualRole: 'concept',
      keywords: introKeywords,
      assetQuery: [`${introConcept} technology trend concept`],
      overlayTitle: '继续观察',
      transitionOut: 'cut'
    })
  ];

  const withTiming = assignCaptionDrafts(beats, storyPlan.length);
  return {
    date,
    storyPlan,
    segmentBoundaries: withTiming.segmentBoundaries,
    visualBeatPlan: withTiming.visualBeatPlan
  };
};

export const loadVisualPlanInputs = async ({root, date}) => {
  const selectionPath = path.join(root, 'data', 'selected', `${date}-selection.json`);
  const voiceoverPath = path.join(root, 'data', 'video-scripts', `${date}-voiceover.md`);
  const selection = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
  let voiceoverText = '';
  try {
    voiceoverText = await fs.readFile(voiceoverPath, 'utf8');
  } catch {
    voiceoverText = '';
  }
  return {selection, voiceoverText};
};

const sourceText = (source) => `${source?.name ?? ''} ${source?.title ?? ''} ${source?.url ?? ''}`.toLowerCase();
const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

export const chooseBestSource = (sources, beat, options = {}) => {
  const usedUrls = options.usedUrls ?? new Map();
  const usedDomains = options.usedDomains ?? new Map();
  const maxUrlUses = options.maxUrlUses ?? 2;
  const maxDomainUses = options.maxDomainUses ?? 8;
  const keywords = extractKeywords([
    beat.subject,
    beat.action,
    beat.concept,
    beat.overlayTitle,
    ...(beat.keywords ?? []),
    ...(beat.assetQuery ?? [])
  ], 16);
  const pool = asArray(sources).filter((source) => {
    if (!source?.url) {
      return false;
    }
    const urlCount = usedUrls.get(source.url) ?? 0;
    const domain = domainOf(source.url);
    const domainCount = domain ? usedDomains.get(domain) ?? 0 : 0;
    return urlCount < maxUrlUses && domainCount < maxDomainUses;
  });
  const scored = pool.map((source) => {
    const text = sourceText(source);
    const matchedKeywords = keywords.map((keyword) => keyword.toLowerCase()).filter((keyword) => text.includes(keyword));
    const urlCount = usedUrls.get(source.url) ?? 0;
    const domain = domainOf(source.url);
    const domainCount = domain ? usedDomains.get(domain) ?? 0 : 0;
    const directUrlBoost = beat.visualRole === 'evidence' && beat.assetQuery?.some((query) => String(query).includes(source.url)) ? 8 : 0;
    const score = matchedKeywords.length * 3 + directUrlBoost - urlCount * 5 - domainCount * 2;

    return {source, score, matchedKeywords, domain, urlCount, domainCount};
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored.find((item) => item.score > 0);

  if (!winner) {
    return {
      source: null,
      matchedKeywords: [],
      matchReason: 'fallback: no semantically matched source',
      fallback: true
    };
  }

  return {
    source: winner.source,
    matchedKeywords: winner.matchedKeywords,
    matchReason: `${winner.matchedKeywords.length ? `semantic match: ${winner.matchedKeywords.join(', ')}` : 'semantic match: direct source URL'}; domain uses ${winner.domainCount}`,
    fallback: false
  };
};

export const validateSourceUsage = (assets, {maxUrlUses = 2, maxDomainUses = 8} = {}) => {
  const urlCounts = new Map();
  const domainCounts = new Map();
  const problems = [];

  for (const asset of asArray(assets)) {
    if (!asset.source_url) {
      continue;
    }
    urlCounts.set(asset.source_url, (urlCounts.get(asset.source_url) ?? 0) + 1);
    const domain = domainOf(asset.source_url);
    if (domain) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
    }
  }

  for (const [url, count] of urlCounts) {
    if (count > maxUrlUses) {
      problems.push(`source URL ${url} is used ${count} times, above maximum ${maxUrlUses}`);
    }
  }

  for (const [domain, count] of domainCounts) {
    if (count > maxDomainUses) {
      problems.push(`source domain reused ${count} times: ${domain}`);
    }
  }

  return problems;
};

export const storyPlan = [];
export const segmentBoundaries = [];
export const visualBeatPlan = [];
