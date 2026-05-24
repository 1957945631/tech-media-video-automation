import assert from 'node:assert/strict';
import test from 'node:test';
import {buildVisualPlan, chooseBestSource, validateSourceUsage} from './visual_beat_plan.mjs';

const sampleSelection = {
  date: '2026-05-19',
  recommended: [
    {
      title: 'Acme Quantum Phone enters consumer testing',
      category: '消费电子',
      event_summary: 'Acme is testing a new quantum phone for ordinary users.',
      video_angle: 'Use the phone testing scenario to explain why this consumer hardware story matters.',
      source_name: 'Acme Newsroom',
      source_url: 'https://example.com/acme-phone'
    },
    {
      title: 'National grid adds AI power forecasting',
      category: '新能源与电力',
      event_summary: 'The national grid is adding AI forecasting to improve power dispatch.',
      video_angle: 'Explain why AI infrastructure depends on electricity and grid planning.',
      source_name: 'Grid Daily',
      source_url: 'https://example.com/grid-ai'
    }
  ]
};

const sampleVoiceover = `
# 2026-05-19 一周科技大事口播稿

## 配音用口播全文

第一件事，Acme Quantum Phone 进入消费者测试。

第二件事，国家电网开始加入 AI 电力预测。

总结一下，这一周的科技主线是 AI 进入真实设备和真实基础设施。

## 段落锚点
`;

test('buildVisualPlan derives story and beats from the current selection instead of old static topics', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const serialized = JSON.stringify(plan).toLowerCase();

  assert.equal(plan.storyPlan.length, 2);
  assert.equal(plan.storyPlan[0].segmentId, 'news_1');
  assert.equal(plan.storyPlan[1].segmentId, 'news_2');
  assert.match(serialized, /acme quantum phone/);
  assert.match(serialized, /national grid/);
  assert.doesNotMatch(serialized, /gpt55|gpt-55|deployment company|tsmc/);
  assert.ok(plan.visualBeatPlan.every((beat) => beat.subject && beat.action && beat.concept));
});

test('buildVisualPlan creates generic intro, per-story, and outro beat structure', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});

  assert.ok(plan.segmentBoundaries.some((boundary) => boundary.segment === 'intro'));
  assert.ok(plan.segmentBoundaries.some((boundary) => boundary.segment === 'outro'));
  assert.ok(plan.visualBeatPlan.some((beat) => beat.segmentId === 'news_1' && beat.visualRole === 'evidence'));
  assert.ok(plan.visualBeatPlan.some((beat) => beat.segmentId === 'news_1' && beat.visualRole === 'diagram'));
  assert.ok(plan.visualBeatPlan.some((beat) => beat.segmentId === 'news_1' && beat.visualRole === 'keyword'));
  assert.ok(plan.visualBeatPlan.some((beat) => beat.segmentId === 'news_2' && beat.visualRole === 'evidence'));
});

test('buildVisualPlan brings real-world intro footage before the overview map', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const introBeats = plan.visualBeatPlan.filter((beat) => beat.segmentId === 'intro');
  const realWorldIndex = introBeats.findIndex((beat) => beat.id === 'intro-real-world');
  const mapIndex = introBeats.findIndex((beat) => beat.id === 'intro-map');

  assert.ok(realWorldIndex > -1);
  assert.ok(mapIndex > -1);
  assert.ok(realWorldIndex < mapIndex);
});

test('buildVisualPlan closes the episode without a long concept card and returns to real-world material before final summary', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const outroBeats = plan.visualBeatPlan.filter((beat) => beat.segmentId === 'outro');
  const realWorldIndex = outroBeats.findIndex((beat) => beat.id === 'outro-real-world');

  assert.ok(realWorldIndex > 0);
  assert.ok(realWorldIndex < outroBeats.length - 1);
  assert.equal(outroBeats[realWorldIndex].visualRole, 'broll');
  assert.ok(!outroBeats.some((beat) => beat.visualRole === 'concept'));
});

test('buildVisualPlan does not end with consecutive generated keyword cards', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const outroBeats = plan.visualBeatPlan.filter((beat) => beat.segmentId === 'outro');

  for (let index = 1; index < outroBeats.length; index += 1) {
    assert.notEqual(`${outroBeats[index - 1].visualRole}:${outroBeats[index].visualRole}`, 'keyword:keyword');
  }
});

test('buildVisualPlan places impact before takeaway to keep real-world cadence tight', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const storyBeats = plan.visualBeatPlan.filter((beat) => beat.segmentId === 'news_1');
  const impactIndex = storyBeats.findIndex((beat) => beat.id.endsWith('-impact'));
  const takeawayIndex = storyBeats.findIndex((beat) => beat.id.endsWith('-takeaway'));

  assert.ok(impactIndex > -1);
  assert.ok(takeawayIndex > -1);
  assert.ok(impactIndex < takeawayIndex);
});

test('buildVisualPlan places user scene before takeaway to avoid long non-real stretches', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const storyBeats = plan.visualBeatPlan.filter((beat) => beat.segmentId === 'news_1');
  const userSceneIndex = storyBeats.findIndex((beat) => beat.id.endsWith('-user-or-industry-scene'));
  const takeawayIndex = storyBeats.findIndex((beat) => beat.id.endsWith('-takeaway'));

  assert.ok(userSceneIndex > -1);
  assert.ok(takeawayIndex > -1);
  assert.ok(userSceneIndex < takeawayIndex);
});

test('buildVisualPlan assigns infographic animation variants by beat semantics', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const beatBySuffix = (suffix) => plan.visualBeatPlan.find((beat) => beat.segmentId === 'news_1' && beat.id.endsWith(suffix));

  assert.equal(beatBySuffix('-explain').animationVariant, 'flow_map');
  assert.equal(beatBySuffix('-impact').animationVariant, 'comparison_panel');
  assert.equal(beatBySuffix('-real-world-context').animationVariant, 'timeline_orbit');
  assert.equal(beatBySuffix('-concept-visual').animationVariant, 'signal_stack');
  assert.equal(plan.visualBeatPlan.find((beat) => beat.id === 'outro-mainline').animationVariant, 'summary_matrix');
});

test('buildVisualPlan avoids repeating the same Remotion animation variant on adjacent component beats', () => {
  const plan = buildVisualPlan({selection: sampleSelection, voiceoverText: sampleVoiceover, date: '2026-05-19'});
  const componentBeats = plan.visualBeatPlan.filter((beat) =>
    ['diagram', 'broll', 'concept', 'product_ui'].includes(beat.visualRole)
  );

  for (let index = 1; index < componentBeats.length; index += 1) {
    assert.notEqual(
      `${componentBeats[index - 1].animationVariant}:${componentBeats[index].animationVariant}`,
      `${componentBeats[index].animationVariant}:${componentBeats[index].animationVariant}`
    );
  }
});

test('chooseBestSource prefers semantically matched sources and reports why it matched', () => {
  const beat = {
    id: 'news-1-evidence',
    subject: 'Acme Quantum Phone enters consumer testing',
    action: '进入消费者测试',
    concept: '消费硬件测试',
    keywords: ['Acme', 'Quantum Phone', 'consumer hardware'],
    assetQuery: ['Acme Quantum Phone official testing']
  };
  const sources = [
    {name: 'Unrelated Cloud', title: 'Cloud pricing', url: 'https://example.com/cloud'},
    {name: 'Acme Newsroom', title: 'Acme Quantum Phone test begins', url: 'https://example.com/acme-phone'}
  ];

  const chosen = chooseBestSource(sources, beat, {usedUrls: new Map(), usedDomains: new Map()});

  assert.equal(chosen.source.url, 'https://example.com/acme-phone');
  assert.ok(chosen.matchedKeywords.includes('acme'));
  assert.match(chosen.matchReason, /semantic match/i);
  assert.equal(chosen.matchStrength, 'strong');
});

test('chooseBestSource rejects generic one-word matches for product and b-roll beats', () => {
  const productBeat = {
    id: 'product-impact',
    visualRole: 'product_ui',
    subject: 'Claude Code token costs',
    action: 'show product impact',
    concept: 'cost pressure for coding agents',
    overlayTitle: 'impact',
    keywords: ['token'],
    assetQuery: ['Claude Code token impact product industry']
  };
  const productChoice = chooseBestSource([
    {name: 'Product Hunt', title: 'SuprSend product launch', url: 'https://www.producthunt.com/products/suprsend'}
  ], productBeat);

  assert.equal(productChoice.source, null);
  assert.equal(productChoice.fallback, true);
  assert.equal(productChoice.matchStrength, 'weak');

  const brollBeat = {
    id: 'broll-context',
    visualRole: 'broll',
    subject: 'GPT-5.5',
    action: 'connect real world scene',
    concept: 'big model capability shift',
    overlayTitle: 'industry scene',
    keywords: ['big'],
    assetQuery: ['GPT-5.5 real world industry scene']
  };
  const brollChoice = chooseBestSource([
    {name: 'AI to ROI', title: 'AI-native professional services big story', url: 'https://ai2roi.substack.com/p/story'}
  ], brollBeat);

  assert.equal(brollChoice.source, null);
  assert.equal(brollChoice.fallback, true);
  assert.equal(brollChoice.matchStrength, 'weak');
});

test('validateSourceUsage flags excessive reuse of the same URL', () => {
  const problems = validateSourceUsage([
    {source_url: 'https://example.com/a'},
    {source_url: 'https://example.com/a'},
    {source_url: 'https://example.com/a'}
  ], {maxPerUrl: 2, maxPerDomain: 3});

  assert.deepEqual(problems, ['source URL https://example.com/a is used 3 times, above maximum 2']);
});

test('validateSourceUsage uses strict non-evidence domain limits by default', () => {
  const problems = validateSourceUsage([
    {assetFunction: 'real_broll', source_url: 'https://github.com/a'},
    {assetFunction: 'product_ui', source_url: 'https://github.com/b'},
    {assetFunction: 'industry_broll', source_url: 'https://github.com/c'}
  ]);

  assert.deepEqual(problems, ['source domain reused 3 times: github.com']);
});
