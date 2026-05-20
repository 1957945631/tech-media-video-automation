const internalCopyPatterns = [
  /用一个具体使用场景切入/u,
  /再解释它为什么代表本周科技趋势/u,
  /用一句判断收束/u,
  /用一句关键判断承接总结/u,
  /用概念画面承接抽象机制/u,
  /避免长时间只看/u,
  /让观众记住/u,
  /把新闻里的机制、因果或变化路径解释清楚/u,
  /补充和这条新闻相关/u,
  /段落转场/u,
  /视觉呼吸/u,
  /最终配音/u,
  /\bSRT\b/u,
  /生成时间线/u,
  /制作意图/u,
  /Remotion/u,
  /abstract technology visual/i,
  /takeaway/i
];

const asArray = (value) => (Array.isArray(value) ? value : []);

export const isInternalAudienceCopy = (value) => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return !text || internalCopyPatterns.some((pattern) => pattern.test(text));
};

export const cleanAudienceText = (value, fallback = '') => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text || isInternalAudienceCopy(text)) {
    return String(fallback ?? '').replace(/\s+/g, ' ').trim();
  }
  return text;
};

export const cleanAudienceKeywords = (keywords, limit = 4) => {
  const seen = new Set();
  const clean = [];

  for (const keyword of asArray(keywords)) {
    const text = cleanAudienceText(keyword);
    const key = text.toLowerCase();
    if (!text || seen.has(key)) {
      continue;
    }
    seen.add(key);
    clean.push(text.length > 18 ? `${text.slice(0, 17)}...` : text);
    if (clean.length >= limit) {
      break;
    }
  }

  return clean;
};

export const pickAudienceBody = ({beat, segment, fallback = '这条变化正在影响产品、产业和普通用户。'} = {}) => {
  const candidates = [
    segment?.body,
    beat?.concept,
    beat?.subject,
    beat?.overlayTitle,
    fallback
  ];

  for (const candidate of candidates) {
    const text = cleanAudienceText(candidate);
    if (text) {
      return text;
    }
  }

  return fallback;
};

export const pickAudienceTitle = ({beat, segment, fallback = '本期科技变化'} = {}) => {
  const candidates = [beat?.overlayTitle, segment?.title, segment?.kicker, beat?.subject, fallback];
  for (const candidate of candidates) {
    const text = cleanAudienceText(candidate);
    if (text) {
      return text;
    }
  }
  return fallback;
};

export const assertAudienceVisibleText = ({label, value}) => {
  if (isInternalAudienceCopy(value)) {
    return `${label} contains internal production copy`;
  }
  return null;
};
