import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const captureSource = fs.readFileSync(new URL('./pipeline/capture_daily_assets.mjs', import.meta.url), 'utf8');
const visualCardsSource = fs.readFileSync(new URL('../src/components/VisualCards.tsx', import.meta.url), 'utf8');
const highlightSource = fs.readFileSync(new URL('../src/components/HighlightEngine.tsx', import.meta.url), 'utf8');

test('evidence screenshots do not bake fixed red annotations into captured assets', () => {
  assert.doesNotMatch(captureSource, /\.arrow/);
  assert.doesNotMatch(captureSource, /borderLeft:\s*['"]\d+px solid #ff/);
  assert.doesNotMatch(captureSource, /border:\s*\d+px solid #ff2b2b/);
  assert.doesNotMatch(captureSource, /annotation = assetFunction === 'evidence_screenshot'/);
  assert.doesNotMatch(captureSource, /hasHighlight:\s*annotation/);
});

test('daily asset capture cleans stale generated assets but preserves research inputs', () => {
  assert.match(captureSource, /cleanGeneratedAssetDir/);
  assert.match(captureSource, /assets-manifest\.json/);
  assert.match(captureSource, /visual-beats\.json/);
  assert.match(captureSource, /generatedExtensions/);
  assert.doesNotMatch(captureSource, /generatedFiles\s*=\s*new Set\([^)]*news-aggregator-research/s);
});

test('generated fallback cards do not leak internal placeholders or absolute node overlays', () => {
  assert.doesNotMatch(captureSource, /Generated functional asset/);
  assert.doesNotMatch(captureSource, /Generated abstract technology visual/);
  assert.doesNotMatch(captureSource, /kicker:\s*'Remotion 图解'/);
  assert.doesNotMatch(captureSource, /kicker:\s*'抽象科技画面'/);
  assert.doesNotMatch(captureSource, /kicker:\s*'黄色观点卡'/);
  assert.doesNotMatch(captureSource, /kicker:\s*assetFunction\.replaceAll/);
  assert.doesNotMatch(captureSource, /\.nodes\s*\{[^}]*position:\s*absolute/s);
  assert.match(captureSource, /height:\s*900px/);
  assert.match(captureSource, /overflow:\s*hidden/);
  assert.match(captureSource, /fitText/);
});

test('Remotion only applies dynamic highlights when a beat explicitly asks for one', () => {
  assert.match(visualCardsSource, /highlight && !beat\?\.hasHighlight/);
});

test('HighlightEngine uses a broad conservative focus label instead of a directional arrow variant', () => {
  assert.doesNotMatch(highlightSource, /variant\?: 'box' \| 'arrow'/);
});
