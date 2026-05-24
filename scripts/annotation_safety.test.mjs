import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const captureSource = fs.readFileSync(new URL('./pipeline/capture_daily_assets.mjs', import.meta.url), 'utf8');
const visualCardsSource = fs.readFileSync(new URL('../src/components/VisualCards.tsx', import.meta.url), 'utf8');
const highlightSource = fs.readFileSync(new URL('../src/components/HighlightEngine.tsx', import.meta.url), 'utf8');
const techNewsVideoSource = fs.readFileSync(new URL('../src/TechNewsVideo.tsx', import.meta.url), 'utf8');
const visualSystemSource = fs.readFileSync(new URL('../config/visual-system.json', import.meta.url), 'utf8');

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
  assert.doesNotMatch(visualCardsSource, /highlight && !beat\?\.hasHighlight/);
  assert.match(visualCardsSource, /Boolean\(beat\?\.highlight && beat\?\.hasHighlight\)/);
  assert.doesNotMatch(visualCardsSource, /<CardShell \{\.\.\.props\} fit="contain" highlight \/>/);
});

test('HighlightEngine uses a subtle non-red focus treatment instead of fixed red boxes', () => {
  assert.doesNotMatch(highlightSource, /variant\?: 'box' \| 'arrow'/);
  assert.doesNotMatch(highlightSource, /#ff2d2d/);
  assert.doesNotMatch(highlightSource, /看标题 \/ 来源 \/ 关键段落/);
  assert.doesNotMatch(highlightSource, /border:\s*['"]\d+px solid #ff/i);
  assert.match(highlightSource, /enabled = false/);
});

test('video backgrounds do not add strong horizontal scanline overlays', () => {
  assert.doesNotMatch(techNewsVideoSource, /repeating-linear-gradient\(0deg/);
  assert.doesNotMatch(visualCardsSource, /repeating-linear-gradient\(0deg/);
  const repeatedGridPattern = /linear-gradient\([^)]*transparent[^)]*\)[\s\S]{0,220}background-?Size|background-?Size[\s\S]{0,220}linear-gradient\([^)]*transparent[^)]*\)/i;
  assert.doesNotMatch(techNewsVideoSource, repeatedGridPattern);
  assert.doesNotMatch(visualCardsSource, repeatedGridPattern);
  assert.doesNotMatch(captureSource, repeatedGridPattern);
  assert.doesNotMatch(visualSystemSource, /scanline/i);
});

test('self-authored cards manage their own layout without global overlays', () => {
  assert.match(visualCardsSource, /showSourceTag\?: boolean/);
  assert.match(visualCardsSource, /showKeywordChips\?: boolean/);
  assert.match(visualCardsSource, /showSourceTag && !isGeneratedFallback && <SourceTag/);
  assert.match(visualCardsSource, /showKeywordChips && !isGeneratedFallback && <KeywordChips/);
  assert.match(visualCardsSource, /showSourceTag=\{false\}/);
  assert.match(visualCardsSource, /showKeywordChips=\{false\}/);
});

test('visible Remotion cards never render internal beat intent as audience copy', () => {
  assert.doesNotMatch(visualCardsSource, /beat\?\.intent\s*\?\?/);
  assert.doesNotMatch(visualCardsSource, /body\s*=\s*truncateText\(beat\?\.intent/);
  assert.match(visualCardsSource, /pickAudienceBody/);
  assert.match(visualCardsSource, /cleanAudienceKeywords/);
});

test('generated fallback cards do not use internal intent as body copy', () => {
  assert.doesNotMatch(captureSource, /body:\s*beat\.intent/);
  assert.match(captureSource, /pickAudienceBody/);
  assert.match(captureSource, /cleanAudienceKeywords/);
});

test('asset capture enforces final production inputs before visual capture', () => {
  assert.match(captureSource, /ensureProductionInputs/);
  assert.match(captureSource, /data['"], ['"]audio['"], `\$\{date\}-voiceover\.mp3`/);
  assert.match(captureSource, /public['"], ['"]audio['"], `\$\{date\}-voiceover\.mp3`/);
  assert.match(captureSource, /data['"], ['"]subtitles['"], `\$\{date\}-aligned\.srt`/);
  assert.match(captureSource, /data['"], ['"]video-scripts['"], `\$\{date\}-voiceover\.md`/);
});

test('generated fallback assets are marked so render layer can suppress global overlays', () => {
  assert.match(captureSource, /assetStatus:\s*capture\?\.ok \? 'captured' : 'generated-fallback'/);
  assert.match(captureSource, /isGeneratedFallback:\s*!capture\?\.ok/);
  assert.match(visualCardsSource, /isGeneratedFallback/);
  assert.match(visualCardsSource, /showSourceTag && !isGeneratedFallback/);
  assert.match(visualCardsSource, /showKeywordChips && !isGeneratedFallback/);
});

test('direct image and video research assets are copied before falling back to generated cards', () => {
  assert.match(captureSource, /downloadRemoteMediaAsset/);
  assert.match(captureSource, /\['image', 'video'\]\.includes\(source\?\.mediaType\)/);
  assert.match(captureSource, /Buffer\.from\(await response\.arrayBuffer\(\)\)/);
  assert.match(captureSource, /mediaExtensionFor/);
  assert.match(captureSource, /source\?\.localPath \?\? source\?\.url/);
});

test('Remotion semantic motion clips are rendered by the component layer, not generated as PNG cards', () => {
  assert.match(visualCardsSource, /MotionClip/);
  assert.match(visualCardsSource, /case 'remotion_motion_clip'/);
  assert.doesNotMatch(visualCardsSource, /SEMANTIC MOTION/);
  assert.match(captureSource, /componentRenderedAssetFunctions = new Set\(\['remotion_motion_clip'/);
});

test('Remotion diagrams are component-rendered instead of static fallback PNG cards', () => {
  assert.match(visualCardsSource, /DiagramMotion/);
  assert.match(visualCardsSource, /case 'remotion_diagram'/);
  assert.match(captureSource, /componentRenderedAssetFunctions/);
  assert.match(captureSource, /assetFunction === 'remotion_diagram'/);
});

test('failed non-evidence captures are promoted to Remotion components instead of static fallback PNGs', () => {
  assert.match(captureSource, /promoteFallbackAssetFunction/);
  assert.match(captureSource, /shouldPromoteToMotionComponent/);
  assert.match(captureSource, /promoted from \$\{assetFunction\}/);
});

test('asset capture treats below-minimum inventory as blocking after remediation', () => {
  assert.doesNotMatch(captureSource, /filter\(\(problem\) => !problem\.includes\('below minimum'\)\)/);
  assert.doesNotMatch(captureSource, /blockingProblems\s*=\s*inventoryProblems\.filter\(\(problem\) => !problem\.includes\('below minimum'\)\)/);
});
