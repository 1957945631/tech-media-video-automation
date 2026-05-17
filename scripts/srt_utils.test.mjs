import assert from 'node:assert/strict';
import test from 'node:test';
import {parseSrt, secondsToTsLiteral} from './srt_utils.mjs';

test('parseSrt parses captions and converts timestamps to seconds', () => {
  const captions = parseSrt(`1
00:00:01,250 --> 00:00:03,500
第一句字幕

2
00:01:00.000 --> 00:01:02.250
第二句
跨行字幕
`);

  assert.deepEqual(captions, [
    {start: 1.25, end: 3.5, text: '第一句字幕'},
    {start: 60, end: 62.25, text: '第二句 跨行字幕'}
  ]);
});

test('parseSrt rejects overlapping or reversed captions', () => {
  assert.throws(
    () =>
      parseSrt(`1
00:00:02,000 --> 00:00:01,000
bad
`),
    /end must be after start/
  );

  assert.throws(
    () =>
      parseSrt(`1
00:00:01,000 --> 00:00:03,000
one

2
00:00:02,900 --> 00:00:04,000
two
`),
    /overlaps previous/
  );
});

test('secondsToTsLiteral keeps compact millisecond precision', () => {
  assert.equal(secondsToTsLiteral(1), '1');
  assert.equal(secondsToTsLiteral(1.2), '1.2');
  assert.equal(secondsToTsLiteral(181.65551020408162), '181.656');
});
