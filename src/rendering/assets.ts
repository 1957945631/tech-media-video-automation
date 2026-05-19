import type {Segment, VisualBeat} from '../types/video';

export type ActiveBeat = VisualBeat | null;

export const isVideoAsset = (asset: string | null | undefined) => {
  return Boolean(asset && /\.(mp4|webm|mov)$/i.test(asset));
};

export const pickAsset = (segment: Segment, beat: ActiveBeat, second: number) => {
  const assets = beat?.assets?.length ? beat.assets : segment.assets ?? (segment.asset ? [segment.asset] : []);
  if (!assets.length) {
    return null;
  }

  const localSecond = Math.max(0, second - (beat?.start ?? segment.start));
  return assets[Math.floor(localSecond / 3.2) % assets.length];
};

export const visualLabel = (beat: ActiveBeat) => {
  switch (beat?.assetFunction) {
    case 'evidence_screenshot':
      return '证据截图';
    case 'product_ui':
      return '产品界面';
    case 'company_person':
      return '公司人物';
    case 'industry_broll':
      return '产业现场';
    case 'commercial_broll':
      return '商业场景';
    case 'real_broll':
      return '真实素材';
    case 'abstract_tech':
      return '趋势画面';
    case 'remotion_diagram':
      return '结构拆解';
    case 'yellow_opinion_card':
      return '关键判断';
    default:
      return '科技素材';
  }
};
