import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignAssetFunction,
  countAssetInventory,
  inventoryTargets,
  validateAssetInventory,
  validateAssetRhythm
} from './asset_function_rules.mjs';

const beat = (id, visualRole, start, end, extra = {}) => ({
  id,
  visualRole,
  start,
  end,
  subject: id,
  action: 'shows',
  concept: 'test',
  ...extra
});

test('assignAssetFunction maps beat roles and subjects to production asset functions', () => {
  assert.equal(assignAssetFunction(beat('source', 'evidence', 0, 3)), 'evidence_screenshot');
  assert.equal(assignAssetFunction(beat('ui', 'product_ui', 3, 6)), 'product_ui');
  assert.equal(assignAssetFunction(beat('chip', 'broll', 6, 9, {keywords: ['芯片', '数据中心']})), 'industry_broll');
  assert.equal(assignAssetFunction(beat('office', 'broll', 9, 12, {keywords: ['企业会议']})), 'commercial_broll');
  assert.equal(assignAssetFunction(beat('idea', 'concept', 12, 15)), 'abstract_tech');
  assert.equal(assignAssetFunction(beat('map', 'diagram', 15, 18)), 'remotion_diagram');
  assert.equal(assignAssetFunction(beat('take', 'keyword', 18, 21)), 'yellow_opinion_card');
});

test('assignAssetFunction uses Remotion motion clips for semantic mechanism beats', () => {
  assert.equal(
    assignAssetFunction(beat('mechanism-flow', 'motion', 0, 4, {concept: 'enterprise AI workflow deployment path'})),
    'remotion_motion_clip'
  );
  assert.equal(
    assignAssetFunction(beat('concept-fallback', 'concept', 4, 8, {concept: 'supply chain risk spreads through dependencies'})),
    'remotion_motion_clip'
  );
});

test('validateAssetRhythm rejects repeated roles and long gaps between real/explanatory assets', () => {
  const problems = validateAssetRhythm([
    beat('a', 'keyword', 0, 5),
    beat('b', 'keyword', 5, 10),
    beat('c', 'keyword', 10, 15),
    beat('d', 'broll', 35, 38),
    beat('e', 'diagram', 60, 63)
  ]);

  assert.ok(problems.some((problem) => problem.includes('more than 2 times')));
  assert.ok(problems.some((problem) => problem.includes('real-world asset gap exceeds 15s')));
  assert.ok(problems.some((problem) => problem.includes('diagram/opinion gap exceeds 20s')));
});

test('validateAssetRhythm measures coverage gaps instead of start-to-start distance', () => {
  const problems = validateAssetRhythm([
    beat('evidence', 'evidence', 0, 10),
    beat('diagram', 'diagram', 10, 18),
    beat('broll', 'broll', 18, 24)
  ]);

  assert.doesNotMatch(problems.join('\n'), /real-world asset gap|diagram\/opinion gap/);
});

test('validateAssetRhythm treats evidence screenshots as explanatory coverage', () => {
  const problems = validateAssetRhythm([
    beat('keyword', 'keyword', 0, 10),
    beat('evidence', 'evidence', 10, 35),
    beat('diagram', 'diagram', 35, 42)
  ]);

  assert.doesNotMatch(problems.join('\n'), /diagram\/opinion gap/);
});

test('validateAssetRhythm treats product UI as explanatory coverage', () => {
  const problems = validateAssetRhythm([
    beat('concept', 'concept', 0, 10),
    beat('product', 'product_ui', 10, 32),
    beat('keyword', 'keyword', 32, 39)
  ]);

  assert.doesNotMatch(problems.join('\n'), /diagram\/opinion gap/);
});

test('validateAssetInventory enforces minimum production stock for a 3-5 minute episode', () => {
  const inventory = countAssetInventory([
    {assetFunction: 'evidence_screenshot'},
    {assetFunction: 'product_ui'},
    {assetFunction: 'industry_broll'}
  ]);
  const problems = validateAssetInventory(inventory);

  assert.ok(problems.some((problem) => problem.includes('evidence_screenshot')));
  assert.ok(problems.some((problem) => problem.includes('real_broll')));
  assert.ok(problems.some((problem) => problem.includes('remotion_motion_clip')));
});

test('inventory targets reduce dependence on generated opinion cards', () => {
  assert.ok(inventoryTargets.real_broll.min >= 24);
  assert.ok(inventoryTargets.remotion_motion_clip.min >= 4);
  assert.ok(inventoryTargets.yellow_opinion_card.max <= 6);
});

test('validateAssetRhythm flags consecutive generated cards', () => {
  const problems = validateAssetRhythm([
    beat('a', 'keyword', 0, 3, {assetFunction: 'yellow_opinion_card'}),
    beat('b', 'keyword', 3, 6, {assetFunction: 'yellow_opinion_card'})
  ]);

  assert.ok(problems.some((problem) => problem.includes('consecutive generated cards')));
});
