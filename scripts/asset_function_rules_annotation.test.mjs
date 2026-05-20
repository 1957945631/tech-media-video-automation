import assert from 'node:assert/strict';
import test from 'node:test';
import {countAssetInventory, inventoryTargets, validateAssetInventory} from './asset_function_rules.mjs';

test('asset inventory no longer requires baked annotation assets', () => {
  assert.equal(Object.hasOwn(inventoryTargets, 'annotation'), false);
  assert.deepEqual(
    validateAssetInventory({
      evidence_screenshot: 7,
      product_ui: 5,
      real_broll: 24,
      remotion_motion_clip: 4,
      abstract_tech: 0,
      remotion_diagram: 5,
      yellow_opinion_card: 6
    }),
    []
  );
});

test('countAssetInventory ignores legacy annotation flags', () => {
  const inventory = countAssetInventory([
    {assetFunction: 'evidence_screenshot', annotation: true},
    {assetFunction: 'industry_broll'}
  ]);

  assert.equal(inventory.evidence_screenshot, 1);
  assert.equal(inventory.real_broll, 1);
  assert.equal(Object.hasOwn(inventory, 'annotation'), false);
});
