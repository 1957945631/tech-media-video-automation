import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const captureSource = fs.readFileSync(new URL('./pipeline/capture_daily_assets.mjs', import.meta.url), 'utf8');
const visualCardsSource = fs.readFileSync(new URL('../src/components/VisualCards.tsx', import.meta.url), 'utf8');
const highlightSource = fs.readFileSync(new URL('../src/components/HighlightEngine.tsx', import.meta.url), 'utf8');

test('evidence screenshot annotation does not use fixed directional arrows', () => {
  assert.doesNotMatch(captureSource, /\.arrow/);
  assert.doesNotMatch(captureSource, /borderLeft:\s*['"]\d+px solid #ff/);
  assert.match(captureSource, /看标题 \/ 来源 \/ 关键段落/);
});

test('Remotion does not double-highlight evidence screenshots that already have baked annotations', () => {
  assert.match(visualCardsSource, /highlight && !beat\?\.hasHighlight/);
});

test('HighlightEngine uses a broad conservative focus label instead of a directional arrow variant', () => {
  assert.doesNotMatch(highlightSource, /variant\?: 'box' \| 'arrow'/);
  assert.match(highlightSource, /看标题 \/ 来源 \/ 关键段落/);
});
