# News Aggregator Skill Integration

本项目已接入 `news-aggregator-skill`，用于每日新闻采集、五天筛选补齐，以及素材获取阶段的外部线索搜索。

## 安装位置

- Codex skill: `C:\Users\juccii\.codex\skills\news-aggregator-skill`
- 项目配置: `config/news-aggregator.json`
- 项目桥接脚本: `scripts/run_news_aggregator.mjs`

如需换成别的安装路径，设置环境变量 `NEWS_AGGREGATOR_SKILL_DIR`。

部分来源说明：

- 普通网络沙箱可能让抓取结果为空；真实自动化运行需要允许联网。
- Hugging Face Papers 和 Ben's Bites 依赖 Python 版 Playwright。未安装时，其它来源仍可使用，但这些子源会跳过或报出可诊断信息。
- Windows 下桥接脚本会强制 `PYTHONIOENCODING=utf-8`，避免新闻标题中的特殊字符触发 GBK 输出错误。

## 常用命令

```bash
npm run news:aggregate:daily -- --date YYYY-MM-DD
npm run news:aggregate:select -- --date YYYY-MM-DD
npm run news:aggregate:assets -- --date YYYY-MM-DD --keyword "OpenAI,机器人,芯片"
```

输出位置：

- 每日抓取候选池：`data/daily/YYYY-MM-DD-news-aggregator-raw.json`
- 五天筛选补充池：`data/selected/YYYY-MM-DD-news-aggregator-supplement.json`
- 素材研究线索：`data/assets/YYYY-MM-DD/news-aggregator-research.json`
- 运行摘要：`reports/YYYY-MM-DD-<profile>-news-aggregator.md`

## 工作流约定

1. 每日新闻自动化先运行 `news:aggregate:daily`，再根据 `prompts/daily_collect.md` 生成正式 `data/daily/YYYY-MM-DD.json` 和日报。
2. 五天筛选自动化仅在本地归档不足、热点需要补齐或交叉核验时运行 `news:aggregate:select`。
3. 素材获取阶段可运行 `news:aggregate:assets`，用 GitHub、Product Hunt、Hacker News、Hugging Face 和 AI newsletter 结果寻找官网、仓库、论文、产品页和可截图页面。
4. Skill 输出只能作为候选池。正式报告仍需按项目规则完成去重、中文摘要、来源可信度备注和事实核验。

## 适用边界

适合：

- 快速扩大全网候选新闻池。
- 补充开源、AI 论文、产品发布、社区讨论和中文热点。
- 为 visual beats 或素材截图寻找原始页面线索。

不适合：

- 直接替代正式日报结构。
- 直接替代官方源核验。
- 直接作为视频口播事实依据。
