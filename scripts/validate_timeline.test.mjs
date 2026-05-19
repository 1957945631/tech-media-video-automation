import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./pipeline/validate_timeline.mjs', import.meta.url), 'utf8');

test('timeline validator reads the generated episode data entrypoint', () => {
  assert.match(source, /src['"], ['"]data['"], ['"]currentEpisode\.ts/);
});

test('timeline validator rejects internal audit text in audience data', () => {
  assert.match(source, /审核提醒/);
  assert.match(source, /risk\\s\*:/);
});

test('timeline validator does not require baked highlights for evidence screenshots', () => {
  assert.doesNotMatch(source, /missing highlight metadata/);
});
