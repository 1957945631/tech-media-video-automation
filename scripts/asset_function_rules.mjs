const realWorldFunctions = new Set([
  'evidence_screenshot',
  'company_person',
  'product_ui',
  'real_broll',
  'industry_broll',
  'commercial_broll'
]);

const explanatoryFunctions = new Set(['remotion_diagram', 'yellow_opinion_card']);

export const inventoryTargets = {
  evidence_screenshot: {min: 8, max: 15},
  product_ui: {min: 5, max: 10},
  real_broll: {min: 20, max: 35},
  abstract_tech: {min: 8, max: 15},
  remotion_diagram: {min: 5, max: 10},
  yellow_opinion_card: {min: 6, max: 10},
  annotation: {min: 10, max: 20}
};

export const assignAssetFunction = (beat) => {
  const text = `${beat.id ?? ''} ${beat.subject ?? ''} ${beat.concept ?? ''} ${(beat.keywords ?? []).join(' ')}`;

  if (beat.assetFunction) {
    return beat.assetFunction;
  }

  if (beat.visualRole === 'evidence') {
    return 'evidence_screenshot';
  }

  if (beat.visualRole === 'product_ui') {
    return 'product_ui';
  }

  if (beat.visualRole === 'diagram') {
    return 'remotion_diagram';
  }

  if (beat.visualRole === 'keyword') {
    return 'yellow_opinion_card';
  }

  if (beat.visualRole === 'concept') {
    return 'abstract_tech';
  }

  if (/芯片|数据中心|GPU|TSMC|半导体|制程|电力|供应链|产业|HPC/i.test(text)) {
    return 'industry_broll';
  }

  if (/企业|会议|商业|订阅|支付|广告|客服|办公室|工作流/i.test(text)) {
    return 'commercial_broll';
  }

  return 'real_broll';
};

export const normalizeInventoryFunction = (assetFunction) => {
  if (assetFunction === 'industry_broll' || assetFunction === 'commercial_broll') {
    return 'real_broll';
  }

  return assetFunction;
};

export const countAssetInventory = (assets) => {
  const counts = {};

  for (const asset of assets) {
    const key = normalizeInventoryFunction(asset.assetFunction);
    counts[key] = (counts[key] ?? 0) + 1;
    if (asset.annotation) {
      counts.annotation = (counts.annotation ?? 0) + 1;
    }
  }

  return counts;
};

export const validateAssetInventory = (inventory, targets = inventoryTargets) => {
  const problems = [];

  for (const [key, target] of Object.entries(targets)) {
    const count = inventory[key] ?? 0;
    if (count < target.min) {
      problems.push(`${key} count ${count} is below minimum ${target.min}`);
    }
    if (count > target.max) {
      problems.push(`${key} count ${count} is above maximum ${target.max}`);
    }
  }

  return problems;
};

export const validateAssetRhythm = (beats) => {
  const problems = [];
  const sorted = [...beats].sort((a, b) => a.start - b.start);
  let sameRoleCount = 1;
  let abstractStart = null;
  let lastRealWorldStart = null;
  let lastExplanatoryStart = null;

  for (let index = 0; index < sorted.length; index += 1) {
    const beat = sorted[index];
    const previous = sorted[index - 1];
    const assetFunction = assignAssetFunction(beat);

    if (previous && beat.visualRole === previous.visualRole) {
      sameRoleCount += 1;
      if (sameRoleCount > 2) {
        problems.push(`${beat.id} repeats visual role ${beat.visualRole} more than 2 times`);
      }
    } else {
      sameRoleCount = 1;
    }

    if (realWorldFunctions.has(assetFunction)) {
      if (lastRealWorldStart === null && beat.start > 15.04) {
        problems.push(`${beat.id} real-world asset gap exceeds 15s from episode start`);
      }
      if (lastRealWorldStart !== null && beat.start - lastRealWorldStart > 15.04) {
        problems.push(`${beat.id} real-world asset gap exceeds 15s`);
      }
      lastRealWorldStart = beat.start;
    }

    if (explanatoryFunctions.has(assetFunction)) {
      if (lastExplanatoryStart === null && beat.start > 20.04) {
        problems.push(`${beat.id} diagram/opinion gap exceeds 20s from episode start`);
      }
      if (lastExplanatoryStart !== null && beat.start - lastExplanatoryStart > 20.04) {
        problems.push(`${beat.id} diagram/opinion gap exceeds 20s`);
      }
      lastExplanatoryStart = beat.start;
    }

    if (assetFunction === 'abstract_tech') {
      abstractStart ??= beat.start;
      if (beat.end - abstractStart > 12.04) {
        problems.push(`${beat.id} abstract visuals continue over 12s`);
      }
    } else if (previous && assignAssetFunction(previous) === 'abstract_tech' && !realWorldFunctions.has(assetFunction)) {
      problems.push(`${beat.id} must follow abstract visuals with real-world or evidence material`);
      abstractStart = null;
    } else {
      abstractStart = null;
    }
  }

  return problems;
};
