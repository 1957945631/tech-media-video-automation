import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./pipeline/build_episode_from_srt.mjs', import.meta.url), 'utf8');

test('episode builder writes generated data to src/data/currentEpisode.ts', () => {
  assert.match(source, /src['"], ['"]data['"], ['"]currentEpisode\.ts/);
  assert.match(source, /satisfies VideoData/);
});

test('episode builder keeps internal risk metadata out of audience data', () => {
  assert.doesNotMatch(source, /risk\s*:/);
  assert.match(source, /intent: cleanAudienceText\(beat\.intent, beat\.subject\)/);
  assert.doesNotMatch(source, /审核提醒/);
});

test('episode builder includes assetFunction on every visual beat', () => {
  assert.match(source, /const assignedAssetFunction = assignAssetFunction\(beat\)/);
  assert.match(source, /assetFunction,/);
});

test('episode builder keeps abstract technology assets out of audience episode data', () => {
  assert.match(source, /assignedAssetFunction === 'abstract_tech' \? 'remotion_motion_clip'/);
  assert.match(source, /!asset\.includes\('abstract_tech'\)/);
});

test('episode builder uses the current visual plan for beat timing and metadata', () => {
  assert.doesNotMatch(source, /beatAssetData\.beats\.length \? beatAssetData\.beats : plan\.visualBeatPlan/);
  assert.match(source, /const sourceVisualBeatPlan = plan\.visualBeatPlan/);
});

test('episode builder carries asset status into audience episode data', () => {
  assert.match(source, /assetsByBeatMeta/);
  assert.match(source, /assetStatus:/);
  assert.match(source, /assetMediaType:/);
  assert.match(source, /isGeneratedFallback:/);
});

test('episode builder carries animation variants into audience episode data', () => {
  assert.match(source, /animationVariant:/);
});
