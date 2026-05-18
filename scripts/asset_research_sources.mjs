const toArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    return Object.values(payload).flatMap((value) => (Array.isArray(value) ? value : []));
  }

  return [];
};

const normalizeSourceName = (item) => {
  return item.source ?? item.source_name ?? item.site ?? item.platform ?? 'news-aggregator-skill';
};

const normalizeUrl = (item) => {
  return item.url ?? item.link ?? item.source_url ?? item.github_url ?? item.discussion_url ?? null;
};

const textOf = (item) => {
  return `${item.title ?? ''} ${item.summary ?? ''} ${item.content ?? ''} ${item.source ?? ''} ${normalizeUrl(item) ?? ''}`.toLowerCase();
};

const categoryFor = (item) => {
  const text = textOf(item);

  if (/github\.com|npm|developer|docs|api|sdk|open source|开源|开发者|代码|仓库/.test(text)) {
    return 'product_ui';
  }

  if (/producthunt|app store|play store|product|launch|demo|app|ui|工具|产品|发布/.test(text)) {
    return 'product_ui';
  }

  if (/data center|datacenter|gpu|chip|semiconductor|tsmc|nvidia|factory|wafer|power|energy|芯片|半导体|工厂|电力|数据中心|供应链/.test(text)) {
    return 'industry_broll';
  }

  if (/finance|subscription|ads|crm|enterprise|payment|pricing|business|商业|订阅|广告|支付|企业/.test(text)) {
    return 'commercial_broll';
  }

  return 'evidence_screenshot';
};

export const normalizeResearchSources = (payload, {limit = 40} = {}) => {
  const seen = new Set();

  return toArray(payload)
    .map((item) => {
      const url = normalizeUrl(item);
      if (!url || seen.has(url)) {
        return null;
      }
      seen.add(url);

      return {
        name: normalizeSourceName(item),
        title: item.title ?? item.summary ?? url,
        url,
        category: categoryFor(item),
        heat: item.heat ?? null,
        time: item.time ?? null
      };
    })
    .filter(Boolean)
    .slice(0, limit);
};

export const mergeResearchSourcesIntoPools = (pools, researchSources) => {
  const next = Object.fromEntries(Object.entries(pools).map(([key, value]) => [key, [...value]]));

  for (const source of researchSources) {
    const target = next[source.category] ? source.category : 'evidence_screenshot';
    next[target].push(source);
    if (target !== 'evidence_screenshot') {
      next.evidence_screenshot.push(source);
    }
  }

  return next;
};
