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
      subject: 'intro',
      action: 'open',
      concept: 'opening hook',
      visualRole: 'keyword',
      keywords: ['intro'],
      overlayTitle: 'Intro',
      transitionOut: 'cut',
      assets: ['assets/card.png']
    },
    {
      id: 'news-a',
      segmentId: 'news',
      captionRange: [1, 3],
      start: 2,
      end: 6,
      intent: 'news',
      subject: 'news',
      action: 'explain',
      concept: 'evidence',
      visualRole: 'evidence',
      keywords: ['a'],
      overlayTitle: 'News',
      transitionOut: 'flash',
      hasHighlight: true,
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
        subject: 'cross',
        action: 'cross',
        concept: 'cross',
        visualRole: 'broll',
        keywords: [],
        overlayTitle: 'Cross',
        transitionOut: 'cut',
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
        subject: 'bad',
        action: 'bad',
        concept: 'bad',
        visualRole: 'broll',
        keywords: [],
        overlayTitle: 'Bad',
        transitionOut: 'cut',
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

test('validateVisualBeats rejects missing semantic role fields', () => {
  const problems = validateVisualBeats({
    beats: [
      {
        id: 'thin',
        segmentId: 'news',
        captionRange: [1, 2],
        start: 2,
        end: 4,
        intent: 'thin',
        keywords: [],
        overlayTitle: 'Thin',
        assets: ['assets/thin.png']
      }
    ],
    segments,
    captions,
    durationSeconds: 8
  });

  const report = problems.join('\n');
  assert.match(report, /missing subject/);
  assert.match(report, /invalid visualRole/);
  assert.match(report, /invalid transitionOut/);
});

test('validateVisualBeats rejects excessive visual role repetition', () => {
  const baseBeat = (id, captionRange, start, end) => ({
    id,
    segmentId: 'news',
    captionRange,
    start,
    end,
    intent: id,
    subject: id,
    action: 'show',
    concept: 'repeat',
    visualRole: 'broll',
    keywords: [id],
    overlayTitle: id,
    transitionOut: 'cut',
    assets: [`assets/${id}.png`]
  });

  const problems = validateVisualBeats({
    beats: [
      baseBeat('a', [1, 2], 2, 4),
      baseBeat('b', [2, 3], 4, 6),
      baseBeat('c', [3, 4], 6, 8)
    ],
    segments,
    captions,
    durationSeconds: 8
  });

  assert.match(problems.join('\n'), /appears more than 2 times/);
});
