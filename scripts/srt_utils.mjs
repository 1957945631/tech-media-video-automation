const tsPattern = /^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/;

export const parseTimestamp = (value) => {
  const match = value.trim().match(tsPattern);
  if (!match) {
    throw new Error(`Invalid SRT timestamp: ${value}`);
  }

  const [, hh, mm, ss, ms] = match;
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
};

export const secondsToTsLiteral = (seconds) => {
  if (!Number.isFinite(seconds)) {
    throw new Error(`Invalid seconds: ${seconds}`);
  }

  const rounded = Math.round(seconds * 1000) / 1000;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/0+$/, '').replace(/\.$/, '');
};

export const parseSrt = (source) => {
  const blocks = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const captions = blocks.map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const timeLineIndex = lines.findIndex((line) => line.includes('-->'));

    if (timeLineIndex === -1) {
      throw new Error(`Caption ${index + 1} is missing time range`);
    }

    const [startRaw, endRaw] = lines[timeLineIndex].split('-->').map((part) => part.trim());
    const start = parseTimestamp(startRaw);
    const end = parseTimestamp(endRaw);
    const text = lines.slice(timeLineIndex + 1).join(' ').replace(/\s+/g, ' ').trim();

    if (!text) {
      throw new Error(`Caption ${index + 1} is missing text`);
    }

    if (end <= start) {
      throw new Error(`Caption ${index + 1} end must be after start`);
    }

    return {start, end, text};
  });

  for (let index = 1; index < captions.length; index += 1) {
    if (captions[index].start < captions[index - 1].end - 0.001) {
      throw new Error(`Caption ${index + 1} overlaps previous caption`);
    }
  }

  return captions;
};
