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
  risk?: string;
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
  visualRole: 'evidence' | 'product_ui' | 'person_or_company' | 'broll' | 'concept' | 'diagram' | 'keyword';
  keywords: string[];
  assetQuery?: string[];
  overlayTitle: string;
  transitionOut: 'cut' | 'flash' | 'glitch' | 'zoom' | 'scan';
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

const fps = 30;

export const videoData: VideoData = {
  fps,
  durationInFrames: 1,
  title: '一周科技大事',
  subtitle: '硅基打底',
  date: '',
  voiceover: undefined,
  captions: [],
  segments: [
    {
      id: 'empty',
      start: 0,
      end: 1 / fps,
      kicker: '等待正式内容',
      title: '请先生成本期数据',
      body: '提供最终配音和 SRT 后，运行素材采集与 build:episode 生成正式视频数据。',
      ribbon: '当前没有可渲染的正式 episode',
      accent: '#f5b400',
      assets: []
    }
  ],
  visualBeats: []
};
