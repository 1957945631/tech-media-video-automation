const tolerance = 0.04;
const visualRoles = new Set(['evidence', 'product_ui', 'person_or_company', 'broll', 'concept', 'diagram', 'keyword']);
const transitions = new Set(['cut', 'flash', 'glitch', 'zoom', 'scan']);
const realWorldRoles = new Set(['evidence', 'product_ui', 'person_or_company', 'broll']);
const explanatoryRoles = new Set(['diagram', 'keyword']);

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

    if (!beat.subject) {
      problems.push(`${label} missing subject`);
    }

    if (!beat.action) {
      problems.push(`${label} missing action`);
    }

    if (!beat.concept) {
      problems.push(`${label} missing concept`);
    }

    if (!visualRoles.has(beat.visualRole)) {
      problems.push(`${label} has invalid visualRole ${beat.visualRole ?? 'missing'}`);
    }

    if (!transitions.has(beat.transitionOut)) {
      problems.push(`${label} has invalid transitionOut ${beat.transitionOut ?? 'missing'}`);
    }

    if (beat.visualRole === 'evidence' && !beat.highlight && !beat.hasHighlight) {
      problems.push(`${label} evidence beat needs highlight metadata`);
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

  let sameRoleCount = 1;
  let conceptStart = null;
  let lastRealWorldStart = null;
  let lastExplanatoryStart = null;
  const sorted = [...beats].sort((a, b) => a.start - b.start);

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];

    if (previous && current.visualRole === previous.visualRole) {
      sameRoleCount += 1;
      if (sameRoleCount > 2) {
        problems.push(`visualBeats role repetition: ${current.visualRole} appears more than 2 times in a row near ${current.id}`);
      }
    } else {
      sameRoleCount = 1;
    }

    if (realWorldRoles.has(current.visualRole)) {
      if (lastRealWorldStart !== null && current.start - lastRealWorldStart > 15 + tolerance) {
        problems.push(`visualBeats real-world asset gap exceeds 15s before ${current.id}`);
      }
      lastRealWorldStart = current.start;
    }

    if (explanatoryRoles.has(current.visualRole)) {
      if (lastExplanatoryStart !== null && current.start - lastExplanatoryStart > 20 + tolerance) {
        problems.push(`visualBeats diagram/keyword gap exceeds 20s before ${current.id}`);
      }
      lastExplanatoryStart = current.start;
    }

    if (current.visualRole === 'concept') {
      conceptStart ??= current.start;
      if (current.end - conceptStart > 12 + tolerance) {
        problems.push(`visualBeats concept visuals continue over 12s near ${current.id}`);
      }
    } else {
      conceptStart = null;
    }
  }

  return problems;
};
