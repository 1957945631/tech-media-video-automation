const tolerance = 0.04;

export const captionRangeToTime = (captionRange, captions, durationSeconds) => {
  const [startIndex, endIndex] = captionRange;
  const start = captions[startIndex]?.start;
  const end = captions[endIndex - 1]?.end ?? durationSeconds;

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`Invalid captionRange: ${captionRange.join('-')}`);
  }

  return {start, end};
};

export const validateVisualBeats = ({beats, segments, captions, durationSeconds}) => {
  const problems = [];
  const segmentsById = new Map(segments.map((segment) => [segment.id, segment]));

  for (const [index, beat] of beats.entries()) {
    const label = `visualBeats[${index}] ${beat.id ?? 'unknown'}`;
    const segment = segmentsById.get(beat.segmentId);

    if (!segment) {
      problems.push(`${label} references missing segment ${beat.segmentId}`);
      continue;
    }

    if (!beat.assets?.length) {
      problems.push(`${label} missing assets`);
    }

    if (!beat.overlayTitle) {
      problems.push(`${label} missing overlayTitle`);
    }

    if (!Array.isArray(beat.captionRange) || beat.captionRange.length !== 2) {
      problems.push(`${label} has invalid captionRange`);
      continue;
    }

    let captionTime;
    try {
      captionTime = captionRangeToTime(beat.captionRange, captions, durationSeconds);
    } catch (error) {
      problems.push(`${label} ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (beat.end <= beat.start) {
      problems.push(`${label} end must be after start`);
    }

    if (beat.start < -tolerance || beat.end - durationSeconds > tolerance) {
      problems.push(`${label} outside duration`);
    }

    if (beat.start < segment.start - tolerance || beat.end > segment.end + tolerance) {
      problems.push(`${label} crosses segment bounds ${segment.id}`);
    }

    if (Math.abs(beat.start - captionTime.start) > tolerance || Math.abs(beat.end - captionTime.end) > tolerance) {
      problems.push(`${label} does not match caption range`);
    }
  }

  for (let index = 1; index < beats.length; index += 1) {
    const previous = beats[index - 1];
    const current = beats[index];
    if (current.start < previous.end - tolerance) {
      problems.push(`visualBeats[${index}] ${current.id} overlaps previous beat`);
    }
  }

  return problems;
};
