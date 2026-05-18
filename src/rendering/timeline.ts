export const byTime = <T extends {start: number; end: number}>(items: T[], second: number): T => {
  return items.find((item) => second >= item.start && second < item.end) ?? items[items.length - 1];
};

export const activeByTime = <T extends {start: number; end: number}>(items: T[], second: number): T | null => {
  return items.find((item) => second >= item.start && second < item.end) ?? null;
};

export const segmentProgress = (segment: {start: number; end: number}, second: number) => {
  const duration = segment.end - segment.start;
  return Math.max(0, Math.min(1, (second - segment.start) / duration));
};

export const localProgress = (range: {start: number; end: number}, second: number) => {
  const duration = range.end - range.start;
  return Math.max(0, Math.min(1, (second - range.start) / duration));
};
