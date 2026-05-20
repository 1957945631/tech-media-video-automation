export const allocateSegmentCaptionRanges = ({captions, storyPlan, visualBeatPlan}) => {
  const segmentOrder = ['intro', ...storyPlan.map((story) => story.segmentId), 'outro'];
  const beatCounts = new Map(segmentOrder.map((segment) => [
    segment,
    Math.max(1, visualBeatPlan.filter((beat) => beat.segmentId === segment).length)
  ]));
  const totalWeight = [...beatCounts.values()].reduce((sum, count) => sum + count, 0);
  const totalCaptions = captions.length;
  const minimumTotal = totalWeight;

  let widths;
  if (totalCaptions >= minimumTotal) {
    const extraCaptions = totalCaptions - minimumTotal;
    const allocations = segmentOrder.map((segment) => {
      const weight = beatCounts.get(segment) ?? 1;
      const rawExtra = (extraCaptions * weight) / totalWeight;
      return {
        segment,
        width: weight + Math.floor(rawExtra),
        remainder: rawExtra - Math.floor(rawExtra)
      };
    });

    let used = allocations.reduce((sum, item) => sum + item.width, 0);
    for (const item of [...allocations].sort((a, b) => b.remainder - a.remainder)) {
      if (used >= totalCaptions) break;
      item.width += 1;
      used += 1;
    }

    widths = new Map(allocations.map((item) => [item.segment, item.width]));
  } else {
    widths = new Map();
    let cursor = 0;
    for (const [index, segment] of segmentOrder.entries()) {
      const remainingSegments = segmentOrder.length - index - 1;
      const remainingCaptions = totalCaptions - cursor;
      const width = index === segmentOrder.length - 1
        ? remainingCaptions
        : Math.min(Math.max(1, Math.round((totalCaptions * (beatCounts.get(segment) ?? 1)) / totalWeight)), Math.max(1, remainingCaptions - remainingSegments));
      widths.set(segment, width);
      cursor += width;
    }
  }

  let cursor = 0;
  return segmentOrder.map((segment) => {
    const width = widths.get(segment) ?? 1;
    const boundary = {segment, startCaption: cursor, endCaption: cursor + width};
    cursor = boundary.endCaption;
    return boundary;
  });
};

export const assignBeatCaptionRanges = ({beats, boundaries}) => {
  const bySegment = new Map(boundaries.map((boundary) => [boundary.segment, boundary]));
  const positions = new Map();
  const counts = new Map();

  for (const beat of beats) {
    counts.set(beat.segmentId, (counts.get(beat.segmentId) ?? 0) + 1);
  }

  return beats.map((beat) => {
    const boundary = bySegment.get(beat.segmentId);
    if (!boundary) {
      return beat;
    }

    const count = counts.get(beat.segmentId) ?? 1;
    const position = positions.get(beat.segmentId) ?? 0;
    positions.set(beat.segmentId, position + 1);
    const span = Math.max(1, boundary.endCaption - boundary.startCaption);
    const start = boundary.startCaption + Math.floor((span * position) / count);
    const end = boundary.startCaption + Math.floor((span * (position + 1)) / count);

    return {
      ...beat,
      captionRange: [start, Math.max(start + 1, Math.min(boundary.endCaption, end))]
    };
  });
};
