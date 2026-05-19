# Codex 快速上下文

项目根目录是 `tech-news-automation`。这是《一周科技大事》短视频自动化项目，不是单纯的新闻抓取仓库。

## 正确入口

每日新闻抓取：

```bash
npm run news:daily -- --date YYYY-MM-DD
```

该命令会通过项目桥接脚本调用 `news-aggregator-skill`，并生成项目认可的日报产物：

- `data/daily/YYYY-MM-DD-news-aggregator-raw.json`
- `data/daily/YYYY-MM-DD.json`
- `reports/YYYY-MM-DD.md`
- `reports/YYYY-MM-DD-daily_collect-news-aggregator.md`

不要直接调用外部 `news-aggregator-skill` Python 脚本给本项目落盘。`reports/` 是平铺目录，不创建 `reports/YYYY-MM-DD/` 日期子目录。

## 后续流程

- 五天筛选：`npm run news:select -- --date YYYY-MM-DD`
- 素材研究：`npm run news:aggregate:assets -- --date YYYY-MM-DD`
- 素材采集：`npm run capture:daily-assets -- YYYY-MM-DD`
- Episode 构建：`npm run build:episode -- YYYY-MM-DD`
- 时间线校验：`npm run validate:timeline`
- Remotion 渲染：先 still 预览，再按需 render。

最终 MP3 和 SRT 是视频后半段的最高时间基准。不要用口播草稿估算成片时长，也不要手写维护 `src/data/currentEpisode.ts`。

## 素材管线约束

- `scripts/visual_beat_plan.mjs` 是通用分镜生成器，只能从当期 `selection` 和 `voiceover` 派生 plan。
- 不要把具体新闻、公司、旧热点写死进通用素材管线。
- `capture_daily_assets` 读取或生成当期 `visual-beats.json`，不导入静态当期分镜。
- 证据截图默认不烙入固定红框、固定箭头或固定坐标标注；`annotation` 不作为库存目标。
- 找不到贴合来源时，生成观众能看懂的信息卡或结构拆解，不硬塞无关网页截图。
- “Remotion 图解”“抽象科技画面”等内部工具/素材分类名不得进入观众可见内容。

## 新窗口使用方式

新窗口开始时先读 `AGENTS.md`，再按需查看 `README.md`、`config/news-aggregator.json` 和相关脚本。
