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

test('validateVisualBeats measures rhythm gaps by visual coverage, not start distance', () => {
  const longCaptions = [
    {start: 0, end: 10, text: 'evidence'},
    {start: 10, end: 18, text: 'explain'},
    {start: 18, end: 24, text: 'scene'}
  ];
  const longSegments = [{id: 'news', start: 0, end: 24}];
  const baseBeat = (id, captionRange, start, end, visualRole) => ({
    id,
    segmentId: 'news',
    captionRange,
    start,
    end,
    intent: id,
    subject: id,
    action: 'show',
    concept: id,
    visualRole,
    keywords: [id],
    overlayTitle: id,
    transitionOut: 'cut',
    assets: [`assets/${id}.png`]
  });

  const problems = validateVisualBeats({
    beats: [
      baseBeat('evidence', [0, 1], 0, 10, 'evidence'),
      baseBeat('diagram', [1, 2], 10, 18, 'diagram'),
      baseBeat('broll', [2, 3], 18, 24, 'broll')
    ],
    segments: longSegments,
    captions: longCaptions,
    durationSeconds: 24
  });

  assert.doesNotMatch(problems.join('\n'), /real-world asset gap|diagram\/keyword gap/);
});

test('validateVisualBeats treats concept cards as explanatory rhythm coverage', () => {
  const longCaptions = [
    {start: 0, end: 10, text: 'diagram'},
    {start: 10, end: 35, text: 'concept'},
    {start: 35, end: 42, text: 'diagram'}
  ];
  const longSegments = [{id: 'news', start: 0, end: 42}];
  const baseBeat = (id, captionRange, start, end, visualRole) => ({
    id,
    segmentId: 'news',
    captionRange,
    start,
    end,
    intent: id,
    subject: id,
    action: 'show',
    concept: id,
    visualRole,
    keywords: [id],
    overlayTitle: id,
    transitionOut: 'cut',
    assets: [`assets/${id}.png`]
  });

  const problems = validateVisualBeats({
    beats: [
      baseBeat('diagram-a', [0, 1], 0, 10, 'diagram'),
      baseBeat('concept', [1, 2], 10, 35, 'concept'),
      baseBeat('diagram-b', [2, 3], 35, 42, 'diagram')
    ],
    segments: longSegments,
    captions: longCaptions,
    durationSeconds: 42
  });

  assert.doesNotMatch(problems.join('\n'), /diagram\/keyword gap/);
});

test('validateVisualBeats allows Remotion semantic motion clips without external assets', () => {
  const segments = [{id: 'intro', start: 0, end: 8}];
  const captions = [
    {start: 0, end: 4, text: 'mechanism'},
    {start: 4, end: 8, text: 'evidence'}
  ];
  const baseBeat = (id, captionRange, start, end, visualRole) => ({
    id,
    segmentId: 'intro',
    captionRange,
    start,
    end,
    intent: id,
    subject: id,
    action: 'show',
    concept: id,
    visualRole,
    keywords: [id],
    overlayTitle: id,
    transitionOut: 'scan',
    assets: [`assets/${id}.png`]
  });
  const beats = [
    {
      ...baseBeat('motion', [0, 1], 0, 4, 'motion'),
      assetFunction: 'remotion_motion_clip',
      assets: []
    },
    {
      ...baseBeat('evidence', [1, 2], 4, 8, 'evidence'),
      assetFunction: 'evidence_screenshot',
      assets: ['assets/source.png']
    }
  ];

  assert.deepEqual(validateVisualBeats({beats, segments, captions, durationSeconds: 8}), []);
});


test('validateVisualBeats treats evidence screenshots as explanatory rhythm coverage', () => {
  const longCaptions = [
    {start: 0, end: 10, text: 'keyword'},
    {start: 10, end: 35, text: 'evidence'},
    {start: 35, end: 42, text: 'diagram'}
  ];
  const longSegments = [{id: 'news', start: 0, end: 42}];
  const baseBeat = (id, captionRange, start, end, visualRole) => ({
    id,
    segmentId: 'news',
    captionRange,
    start,
    end,
    intent: id,
    subject: id,
    action: 'show',
    concept: id,
    visualRole,
    keywords: [id],
    overlayTitle: id,
    transitionOut: 'cut',
    assets: [`assets/${id}.png`]
  });

  const problems = validateVisualBeats({
    beats: [
      baseBeat('keyword', [0, 1], 0, 10, 'keyword'),
      baseBeat('evidence', [1, 2], 10, 35, 'evidence'),
      baseBeat('diagram', [2, 3], 35, 42, 'diagram')
    ],
    segments: longSegments,
    captions: longCaptions,
    durationSeconds: 42
  });

  assert.doesNotMatch(problems.join('\n'), /diagram\/keyword gap/);
});

test('validateVisualBeats treats product UI as explanatory rhythm coverage', () => {
  const longCaptions = [
    {start: 0, end: 10, text: 'concept'},
    {start: 10, end: 32, text: 'product'},
    {start: 32, end: 39, text: 'keyword'}
  ];
  const longSegments = [{id: 'news', start: 0, end: 39}];
  const baseBeat = (id, captionRange, start, end, visualRole) => ({
    id,
    segmentId: 'news',
    captionRange,
    start,
    end,
    intent: id,
    subject: id,
    action: 'show',
    concept: id,
    visualRole,
    keywords: [id],
    overlayTitle: id,
    transitionOut: 'cut',
    assets: [`assets/${id}.png`]
  });

  const problems = validateVisualBeats({
    beats: [
      baseBeat('concept', [0, 1], 0, 10, 'concept'),
      baseBeat('product', [1, 2], 10, 32, 'product_ui'),
      baseBeat('keyword', [2, 3], 32, 39, 'keyword')
    ],
    segments: longSegments,
    captions: longCaptions,
    durationSeconds: 39
  });

  assert.doesNotMatch(problems.join('\n'), /diagram\/keyword gap/);
});
