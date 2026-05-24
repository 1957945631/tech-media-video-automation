# Codex 快速上下文

仓库根目录：`tech-news-automation`。本项目用于生产竖屏短视频栏目《一周科技大事》/“硅基打底”，是完整的新闻到视频流水线，不是单纯新闻抓取器。

## 执行顺序

```bash
npm run news:daily -- --date YYYY-MM-DD
npm run news:select -- --date YYYY-MM-DD
生成并确认 data/video-scripts/YYYY-MM-DD-voiceover.md
放入最终 MP3/SRT：
  data/audio/YYYY-MM-DD-voiceover.mp3
  public/audio/YYYY-MM-DD-voiceover.mp3
  data/subtitles/YYYY-MM-DD-aligned.srt
npm run news:aggregate:assets -- --date YYYY-MM-DD
npm run capture:daily-assets -- YYYY-MM-DD
npm run build:episode -- YYYY-MM-DD
npm test
npm run validate:timeline
npm run remotion:still
# still 和校验通过后再 npm run remotion:render
```

五日筛选后先提交口播稿给用户确认。最终 MP3/SRT 是时间基准。不要用口播草稿估算成片时长；不要手写 `src/data/currentEpisode.ts`，需要重建。

## 硬规则

- 观众可见文案不得包含内部制作指令、审核/risk 信息、fallback/generated 状态，或 `Remotion 图解`、`抽象科技画面` 等工具/分类名。
- 自制卡和图解卡自行管理布局。不要在已有文字主体上再叠全局来源角标、关键词 chips 或重复正文。
- fallback 卡必须明确降级，不能冒充真实证据截图；生成卡不再叠外层来源角标或关键词 chips。
- 证据截图默认保持干净：不加固定红框、固定箭头、固定坐标标注。只有显式语义安全高亮才允许渲染。
- `scripts/visual_beat_plan.mjs` 是通用分镜生成器，不要把某一期新闻、公司或热点写死进共享管线。
- `capture_daily_assets` 只能派生或读取当期 visual beats，不依赖静态当期分镜代码。

## 素材优先级

1. 官方/可信证据截图。
2. 产品 UI、演示页、App 页面、开发者工具界面。
3. 可追溯真实图片/视频 b-roll，允许 `.mp4`、`.webm`、`.mov`、`.m4v`。
4. Remotion 语义动画，用于机制、流程、依赖关系、风险扩散、抽象系统运行。
5. 静态生成 PNG 卡，仅用于解释、总结和节奏补充。

`remotion_motion_clip` 由 `src/components/VisualCards.tsx` 组件渲染，不需要 `public/assets` 中有文件；它必须使用观众安全的 title/body/keywords，不能使用内部 `intent`。

## 参考文档

- 结构与验收规则：`docs/project-structure-and-content-rules.md`
- 标准生产流程：`docs/production-workflow.md`
- 素材质量策略：`docs/asset-quality-policy.md`
- 生产质检清单：`docs/production-quality-checklist.md`
- 视觉系统配置：`config/visual-system.json`
