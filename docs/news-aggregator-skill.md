# news-aggregator-skill 接入说明

项目可以调用 `news-aggregator-skill` 做三件事：

1. 每日科技新闻候选池扫描。
2. 五天筛选时补齐或交叉核验热点。
3. 素材获取阶段寻找可截图页面、官方链接、项目仓库、论文、产品页和真实产业素材线索。

## 位置

- Skill 默认路径：`C:\Users\juccii\.codex\skills\news-aggregator-skill`
- 项目配置：`config/news-aggregator.json`
- 项目桥接脚本：`scripts/run_news_aggregator.mjs`
- 素材研究输出：`data/assets/YYYY-MM-DD/news-aggregator-research.json`

如果 skill 安装在其他路径，可以设置环境变量 `NEWS_AGGREGATOR_SKILL_DIR`。

## 常用命令

```bash
npm run news:aggregate:daily -- --date YYYY-MM-DD
npm run news:aggregate:select -- --date YYYY-MM-DD
npm run news:aggregate:assets -- --date YYYY-MM-DD
```

素材阶段可以按本期关键词加强搜索：

```bash
npm run news:aggregate:assets -- --date YYYY-MM-DD --keyword "台积电,GPU,数据中心,App Store,npm,机器人"
```

## 素材获取流程

推荐顺序：

1. 完成 `news:daily` 和 `news:select`。
2. 生成并确认 `data/video-scripts/YYYY-MM-DD-voiceover.md`。
3. 放入最终 MP3/SRT。
4. 运行 `npm run news:aggregate:assets -- --date YYYY-MM-DD`。
5. Skill 输出 `data/assets/YYYY-MM-DD/news-aggregator-research.json`。
6. 再运行 `npm run capture:daily-assets -- YYYY-MM-DD`。
7. `capture_daily_assets` 会自动读取口播稿和 skill 输出，并把候选链接并入素材 source pools。

Skill 输出只作为素材候选池，不直接替代事实核验。正式成片仍优先使用官方来源、可信新闻源、监管/论文/GitHub/开发者文档。

## 分类规则

`scripts/asset_research_sources.mjs` 会把 skill 输出转成素材候选源：

- GitHub、npm、开发者文档、API、SDK：优先进入 `product_ui`。
- Product Hunt、App、产品发布页：优先进入 `product_ui`。
- GPU、芯片、半导体、数据中心、工厂、电力、供应链：进入 `industry_broll`。
- 订阅、广告、支付、企业、定价、CRM：进入 `commercial_broll`。
- 其他新闻链接：进入 `evidence_screenshot`。

非证据类候选也会同时加入 `evidence_screenshot` 兜底，保证截图证据池足够。

## 边界

适合：

- 快速扩大素材候选池。
- 为 visual beats 寻找原始页面线索。
- 补充开源、产品、论文、社区讨论和中文科技热点。

不适合：

- 直接替代官方来源核验。
- 直接生成观众口播事实。
- 直接把内部报告内容显示在视频画面中。
