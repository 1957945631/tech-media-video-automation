# 句级 Visual Beat 规划 Prompt

输入：

- 最终 SRT：`data/subtitles/YYYY-MM-DD-aligned.srt`
- 口播或分镜草稿：`data/video-scripts/`
- 已筛选新闻：`data/selected/`
- 视觉系统配置：`config/visual-system.json`

任务：

将口播拆成 40 到 80 个句级 visual beats。每个 beat 必须由口播语义驱动，而不是按热点段机械轮播素材。

每个 beat 必填：

- `id`
- `segmentId`
- `captionRange`
- `intent`
- `subject`
- `action`
- `concept`
- `visualRole`
- `keywords`
- `assetQuery`
- `overlayTitle`
- `transitionOut`

视觉角色只能使用：

- `evidence`
- `product_ui`
- `person_or_company`
- `broll`
- `concept`
- `diagram`
- `keyword`

规划规则：

- 时间以 SRT 为准，不能自行估算字幕。
- 一句话或相邻短句可以合并成一个 beat，但不能跨热点。
- 同一种 `visualRole` 不能连续超过 2 次。
- 每 15 秒至少安排一次真实世界素材：`evidence`、`product_ui`、`person_or_company` 或 `broll`。
- 每 20 秒至少安排一次 `diagram` 或 `keyword`。
- `evidence` 必须规划标注方式，例如红框、箭头、下划线或局部放大。
- `keyword` 必须是 8 到 16 个字的判断句，不能只是普通名词。
- `concept` 不能连续超过 12 秒，后面必须接现实素材或证据素材。
- 转场比例大致遵循：70% `cut`，15% `flash`，10% `glitch`，少量 `zoom` 和 `scan`。

输出：

- 更新 `scripts/visual_beat_plan.mjs` 中的 `visualBeatPlan`。
- 如果素材尚未抓取，`assets` 可为空，但必须提供 `assetQuery`。
- 输出前先用 `config/visual-system.json` 做自检，确保没有角色重复和信息密度不足。
