const realWorldFunctions = new Set([
  'evidence_screenshot',
  'company_person',
  'product_ui',
  'real_broll',
  'industry_broll',
  'commercial_broll'
]);

const explanatoryFunctions = new Set([
  'evidence_screenshot',
  'product_ui',
  'remotion_motion_clip',
  'remotion_diagram',
  'yellow_opinion_card'
]);

export const inventoryTargets = {
  evidence_screenshot: {min: 7, max: 15},
  product_ui: {min: 5, max: 10},
  real_broll: {min: 24, max: 45},
  remotion_motion_clip: {min: 4, max: 12},
  abstract_tech: {min: 0, max: 4},
  remotion_diagram: {min: 5, max: 10},
  yellow_opinion_card: {min: 3, max: 6}
};

const motionTriggers =
  /mechanism|workflow|flow|pipeline|path|dependency|dependencies|supply chain|risk spreads|routing|orchestration|system|loop|feedback|infrastructure|deployment|rules|agent|鏈哄埗|娴佺▼|渚濊禆|渚涘簲閾緗绯荤粺|閮ㄧ讲|璺緞|瑙勫垯|鑱斿姩|鎵╂暎|闂幆|鎶借薄/i;

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

  if (beat.visualRole === 'motion') {
    return 'remotion_motion_clip';
  }

  if (beat.visualRole === 'concept') {
    if (motionTriggers.test(text)) {
      return 'remotion_motion_clip';
    }
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
  let lastRealWorldEnd = null;
  let lastExplanatoryEnd = null;

  for (let index = 0; index < sorted.length; index += 1) {
    const beat = sorted[index];
    const previous = sorted[index - 1];
    const assetFunction = assignAssetFunction(beat);
    const previousAssetFunction = previous ? assignAssetFunction(previous) : null;

    if (previous && beat.visualRole === previous.visualRole) {
      sameRoleCount += 1;
      if (sameRoleCount > 2) {
        problems.push(`${beat.id} repeats visual role ${beat.visualRole} more than 2 times`);
      }
    } else {
      sameRoleCount = 1;
    }

    if (previousAssetFunction === 'yellow_opinion_card' && assetFunction === 'yellow_opinion_card') {
      problems.push(`${beat.id} consecutive generated cards should be broken up with real footage, product UI, or evidence`);
    }

    if (realWorldFunctions.has(assetFunction)) {
      if (lastRealWorldEnd === null && beat.start > 15.04) {
        problems.push(`${beat.id} real-world asset gap exceeds 15s from episode start`);
      }
      if (lastRealWorldEnd !== null && beat.start - lastRealWorldEnd > 15.04) {
        problems.push(`${beat.id} real-world asset gap exceeds 15s`);
      }
      lastRealWorldEnd = Math.max(lastRealWorldEnd ?? beat.end, beat.end);
    }

    if (explanatoryFunctions.has(assetFunction)) {
      if (lastExplanatoryEnd === null && beat.start > 20.04) {
        problems.push(`${beat.id} diagram/opinion gap exceeds 20s from episode start`);
      }
      if (lastExplanatoryEnd !== null && beat.start - lastExplanatoryEnd > 20.04) {
        problems.push(`${beat.id} diagram/opinion gap exceeds 20s`);
      }
      lastExplanatoryEnd = Math.max(lastExplanatoryEnd ?? beat.end, beat.end);
    }

    if (assetFunction === 'abstract_tech') {
      abstractStart ??= beat.start;
      if (beat.end - abstractStart > 12.04) {
        problems.push(`${beat.id} abstract visuals continue over 12s`);
      }
    } else if (previous && previousAssetFunction === 'abstract_tech' && !realWorldFunctions.has(assetFunction)) {
      problems.push(`${beat.id} must follow abstract visuals with real-world or evidence material`);
      abstractStart = null;
    } else {
      abstractStart = null;
    }
  }

  return problems;
};
