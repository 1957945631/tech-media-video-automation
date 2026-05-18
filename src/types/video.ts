export type AssetFunction =
  | 'evidence_screenshot'
  | 'company_person'
  | 'product_ui'
  | 'real_broll'
  | 'industry_broll'
  | 'commercial_broll'
  | 'abstract_tech'
  | 'remotion_diagram'
  | 'yellow_opinion_card';

export type VisualRole = 'evidence' | 'product_ui' | 'person_or_company' | 'broll' | 'concept' | 'diagram' | 'keyword';

export type TransitionName = 'cut' | 'flash' | 'glitch' | 'zoom' | 'scan';

export type Segment = {
  id: string;
  start: number;
  end: number;
  kicker: string;
  title: string;
  body: string;
  accent: string;
  ribbon: string;
  asset?: string;
  assets?: string[];
  sourceName?: string;
};

export type Caption = {
  start: number;
  end: number;
  text: string;
};

export type VisualBeat = {
  id: string;
  segmentId: string;
  start: number;
  end: number;
  captionRange: [number, number];
  intent: string;
  subject: string;
  action: string;
  concept: string;
  visualRole: VisualRole;
  assetFunction: AssetFunction;
  keywords: string[];
  assetQuery?: string[];
  overlayTitle: string;
  transitionOut: TransitionName;
  highlight?: unknown;
  hasHighlight?: boolean;
  assets: string[];
};

export type VideoData = {
  fps: number;
  durationInFrames: number;
  title: string;
  subtitle: string;
  date: string;
  voiceover?: string;
  captions: Caption[];
  segments: Segment[];
  visualBeats: VisualBeat[];
};
