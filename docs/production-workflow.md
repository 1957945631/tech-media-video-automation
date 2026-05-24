# 标准生产流程

这份文档是每期《一周科技大事》的主流程。除非明确做调试或补救，按这里的顺序执行。

## 1. 新闻抓取

```bash
npm run news:daily -- --date YYYY-MM-DD
```

输出：

- `data/daily/YYYY-MM-DD.json`
- `reports/YYYY-MM-DD.md`
- `data/daily/YYYY-MM-DD-news-aggregator-raw.json`

## 2. 五日筛选

```bash
npm run news:select -- --date YYYY-MM-DD
```

输出：

- `data/selected/YYYY-MM-DD-selection.json`
- `reports/YYYY-MM-DD-five-day-selection.md`

五日筛选决定本期讲哪几条新闻。后续口播稿、素材和画面节奏都必须围绕这份筛选结果。

## 3. 生成并确认口播稿

在五日筛选之后生成：

```text
data/video-scripts/YYYY-MM-DD-voiceover.md
```

口播稿必须包含：

- 配音用口播全文。
- 分段锚点表。
- MP3/SRT 交付说明。

这一步完成后，先交给用户确认，再进入配音和字幕。不要在口播稿确认前抓取正式视觉素材。

## 4. 生成最终 MP3 和 SRT

把最终配音放入：

```text
data/audio/YYYY-MM-DD-voiceover.mp3
public/audio/YYYY-MM-DD-voiceover.mp3
```

把最终音频识别或导出的字幕放入：

```text
data/subtitles/YYYY-MM-DD-aligned.srt
```

SRT 必须来自最终音频，不要用文字字数估算。

## 5. 资产聚合和素材捕获

最终口播稿确认后，再做素材研究：

```bash
npm run news:aggregate:assets -- --date YYYY-MM-DD
```

最终 MP3/SRT 放入后，再捕获素材：

```bash
npm run capture:daily-assets -- YYYY-MM-DD
```

输出：

- `data/assets/YYYY-MM-DD/news-aggregator-research.json`
- `data/assets/YYYY-MM-DD/visual-beats.json`
- `data/assets/YYYY-MM-DD/assets-manifest.json`
- `public/assets/YYYY-MM-DD/`

素材捕获必须遵守 `asset-quality-policy.md`：真实素材优先，fallback 明确降级，Remotion 动画作为内嵌组件素材。

## 6. 构建 episode

```bash
npm run build:episode -- YYYY-MM-DD
```

输出：

- `src/data/currentEpisode.ts`

该文件是生成物，不手写维护。它必须从最终 MP3、最终 SRT、筛选结果、口播稿和素材清单重建。

## 7. 渲染前验证

```bash
npm test
npm run validate:timeline
npm run remotion:still
```

still 预览必须抽查：

- 开头导览。
- 每条新闻开头。
- 至少一个 evidence、一个 fallback、一个 Remotion motion clip。
- 结尾总结。

## 8. 完整渲染和渲染后验证

```bash
npm run remotion:render
npm run validate:timeline:video
```

渲染成功不等于交付。仍需人工快速看过开头、每条新闻开头和结尾，确认没有遮挡、错位、素材重复疲劳、字幕漂移或内部文案泄漏。
