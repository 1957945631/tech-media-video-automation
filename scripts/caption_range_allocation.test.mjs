import assert from 'node:assert/strict';
import test from 'node:test';
import {
  allocateSegmentCaptionRanges,
  assignBeatCaptionRanges
} from './caption_range_allocation.mjs';

const makeItems = (count, factory) => Array.from({length: count}, (_, index) => factory(index));

test('caption range allocation preserves enough outro captions for every outro beat', () => {
  const captions = makeItems(93, () => ({}));
  const storyPlan = makeItems(7, (index) => ({segmentId: `news_${index + 1}`}));
  const visualBeatPlan = [
    ...makeItems(4, (index) => ({id: `intro_${index}`, segmentId: 'intro'})),
    ...storyPlan.flatMap((story) => makeItems(8, (index) => ({id: `${story.segmentId}_${index}`, segmentId: story.segmentId}))),
    ...makeItems(4, (index) => ({id: `outro_${index}`, segmentId: 'outro'}))
  ];

  const boundaries = allocateSegmentCaptionRanges({captions, storyPlan, visualBeatPlan});
  const outro = boundaries.find((boundary) => boundary.segment === 'outro');

  assert.equal(outro.endCaption - outro.startCaption, 6);
  assert.equal(boundaries.at(-1).endCaption, captions.length);

  const assigned = assignBeatCaptionRanges({beats: visualBeatPlan, boundaries});
  const outroRanges = assigned
    .filter((beat) => beat.segmentId === 'outro')
    .map((beat) => beat.captionRange);

  for (let index = 1; index < outroRanges.length; index += 1) {
    assert.ok(outroRanges[index][0] >= outroRanges[index - 1][1]);
  }
});
