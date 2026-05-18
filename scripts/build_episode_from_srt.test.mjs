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
  assert.doesNotMatch(source, /审核提醒/);
});

test('episode builder includes assetFunction on every visual beat', () => {
  assert.match(source, /assetFunction: assignAssetFunction\(beat\)/);
});
