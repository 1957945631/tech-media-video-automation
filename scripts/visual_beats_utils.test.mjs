import assert from 'node:assert/strict';
import test from 'node:test';
import {validateVisualBeats} from './visual_beats_utils.mjs';

const captions = [
  {start: 0, end: 2, text: 'intro'},
  {start: 2, end: 4, text: 'a'},
  {start: 4, end: 6, text: 'b'},
  {start: 6, end: 8, text: 'c'}
];

const segments = [
  {id: 'intro', start: 0, end: 2},
  {id: 'news', start: 2, end: 8}
];

test('validateVisualBeats accepts beats aligned to caption ranges inside segments', () => {
  const beats = [
    {
      id: 'intro-title',
      segmentId: 'intro',
      captionRange: [0, 1],
      start: 0,
      end: 2,
      intent: 'intro',
      keywords: ['intro'],
      overlayTitle: 'Intro',
      assets: ['assets/card.png']
    },
    {
      id: 'news-a',
      segmentId: 'news',
      captionRange: [1, 3],
      start: 2,
      end: 6,
      intent: 'news',
      keywords: ['a'],
      overlayTitle: 'News',
      assets: ['assets/news.png']
    }
  ];

  assert.deepEqual(validateVisualBeats({beats, segments, captions, durationSeconds: 8}), []);
});

test('validateVisualBeats rejects beats that cross segment boundaries', () => {
  const problems = validateVisualBeats({
    beats: [
      {
        id: 'cross',
        segmentId: 'intro',
        captionRange: [0, 2],
        start: 0,
        end: 4,
        intent: 'cross',
        keywords: [],
        overlayTitle: 'Cross',
        assets: []
      }
    ],
    segments,
    captions,
    durationSeconds: 8
  });

  assert.match(problems.join('\n'), /crosses segment bounds/);
});

test('validateVisualBeats rejects missing assets and caption timing drift', () => {
  const problems = validateVisualBeats({
    beats: [
      {
        id: 'bad',
        segmentId: 'news',
        captionRange: [1, 2],
        start: 2.5,
        end: 4,
        intent: 'bad',
        keywords: [],
        overlayTitle: 'Bad',
        assets: []
      }
    ],
    segments,
    captions,
    durationSeconds: 8
  });

  const report = problems.join('\n');
  assert.match(report, /missing assets/);
  assert.match(report, /does not match caption range/);
});
