# 一周科技大事自动化项目

`tech-news-automation` 用于生产竖屏短视频栏目《一周科技大事》/“硅基打底”。目标是把科技新闻整理成普通观众能听懂、来源清楚、视觉稳定且有变化的视频。栏目不是“一周 AI 大事”：选题和素材应覆盖 AI、芯片、消费电子、互联网平台、云与数据中心、开源安全、机器人、新能源、航天、游戏和硬件等科技产业。

## 流程

```bash
npm run news:daily -- --date YYYY-MM-DD          # data/daily + reports
npm run news:select -- --date YYYY-MM-DD         # data/selected
生成并确认 data/video-scripts/YYYY-MM-DD-voiceover.md
放入 data/audio、public/audio 和 data/subtitles 中的最终 MP3/SRT
npm run news:aggregate:assets -- --date YYYY-MM-DD
npm run capture:daily-assets -- YYYY-MM-DD       # data/assets + public/assets
npm run build:episode -- YYYY-MM-DD              # src/data/currentEpisode.ts
npm test
npm run validate:timeline
npm run remotion:still
npm run remotion:render
npm run validate:timeline:video
```

五日筛选后先给用户确认口播稿，再进入配音、SRT 和素材阶段。最终 MP3/SRT 是时间基准。不要用口播草稿锁定时长，也不要手写维护 `src/data/currentEpisode.ts`。

## 结构

```text
config/              新闻源、规则、视觉系统目标
data/                每期生成的日报、筛选、音频、字幕、素材、视频数据
docs/                详细规则、质检清单、方法论
prompts/             规划提示词
public/              Remotion 可读取的音频和素材
reports/             平铺报告输出；不要创建 reports/YYYY-MM-DD/
scripts/             命令、流水线脚本、测试
scripts/pipeline/    素材采集、episode 构建、校验
src/components/      Remotion 视觉组件
src/rendering/       观众文案、时间线、素材选择辅助逻辑
src/types/           共享 TypeScript 类型
```

## 质量规则

- 观众可见字段不得出现内部制作指令、审核/risk 信息、fallback/generated 状态或内部素材分类名。
- 证据截图必须清晰可读；默认禁止固定红框、箭头、坐标标注。
- 自制卡和图解卡不要再叠全局来源角标、关键词 chips 或重复正文。
- fallback 卡必须明确降级，不能冒充真实证据截图。
- Remotion 语义动画是内嵌组件素材，不要求存在独立 `.mp4` 文件。
- 同一视觉角色不要连续超过 2 次；避免同 URL/域名和生成卡重复使用。
- 能渲染不等于可交付。完整渲染后仍要检查时间线、字幕、素材贴合、布局遮挡和可见文案。

## 素材优先级

1. 官方/可信证据截图。
2. 产品 UI、演示页、App 页面、开发者工具界面。
3. 可追溯真实图片/视频 b-roll，允许 `.mp4`、`.webm`、`.mov`、`.m4v`。
4. Remotion 语义动画，用于机制、流程、依赖关系、风险扩散、抽象系统运行。
5. 静态生成 PNG 卡，仅用于解释、总结和节奏补充。

`remotion_motion_clip` 由 `src/components/VisualCards.tsx` 渲染，可以没有 `public/assets` 文件，必须使用观众安全的 title/body/keywords，不能使用内部 `intent`。

## 核心文件

- `scripts/visual_beat_plan.mjs`：通用 visual beat 规划器，不写死某期新闻。
- `scripts/pipeline/capture_daily_assets.mjs`：来源匹配、截图/下载、fallback 生成、组件渲染素材记录。
- `scripts/pipeline/build_episode_from_srt.mjs`：从最终 SRT/音频/素材重建 episode 数据。
- `scripts/pipeline/validate_timeline.mjs`：时间线和观众可见内容安全闸门。
- `src/components/VisualCards.tsx`：证据、产品、b-roll、图解、关键词卡、语义动画渲染。
- `docs/README.md`：文档入口和阅读顺序。
- `docs/production-workflow.md`：每期标准生产顺序。
- `docs/asset-quality-policy.md`：素材真实度、fallback、重复和 Remotion 动画策略。
- `docs/project-structure-and-content-rules.md`：详细结构、优先级、验收规则。
- `docs/production-quality-checklist.md`：渲染前后质检清单。
