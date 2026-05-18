import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignAssetFunction,
  countAssetInventory,
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

test('validateAssetInventory enforces minimum production stock for a 3-5 minute episode', () => {
  const inventory = countAssetInventory([
    {assetFunction: 'evidence_screenshot'},
    {assetFunction: 'product_ui'},
    {assetFunction: 'industry_broll'}
  ]);
  const problems = validateAssetInventory(inventory);

  assert.ok(problems.some((problem) => problem.includes('evidence_screenshot')));
  assert.ok(problems.some((problem) => problem.includes('real_broll')));
  assert.ok(problems.some((problem) => problem.includes('abstract_tech')));
});
