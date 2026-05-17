# 每日科技新闻抓取 Prompt

抓取并整理当天的全球+中国科技新闻，面向“普通人看懂的一周科技大事”抖音账号。

要求：
- 使用最新网络信息。
- 优先调用已安装的 `news-aggregator-skill` 做全网前置扫描：
  - 项目命令：`npm run news:aggregate:daily -- --date YYYY-MM-DD`
  - 读取原始结果：`data/daily/YYYY-MM-DD-news-aggregator-raw.json`
  - 将结果去重、翻译、事实核验后再写入本项目的正式日报结构。
- 优先参考 `config/sources.json` 中的可靠来源，并用搜索补充核验。
- 覆盖 AI/大模型、消费电子、互联网公司、芯片/硬科技、新产品、政策监管、融资并购。
- 输出中文日报。

每条新闻包含：
- 标题
- 发布时间
- 来源名称
- 原文链接
- 中文摘要
- 分类
- 初步重要性评分
- 是否需要后续关注
- 事实核验备注

使用 `news-aggregator-skill` 的注意事项：
- 只把 skill 输出当作候选新闻池，不直接当作最终事实。
- 对重要新闻至少补一个官方源、原始公告、论文、GitHub 仓库或可信媒体链接。
- 若 skill 结果少于 5 条，扩大关键词或改用 `five_day_supplement` 配置补齐，并在备注中标记补充来源。
- 保留适合后续素材获取的页面链接，例如官网、产品页、论文页、GitHub、监管公告或媒体原文。

产物：
- 结构化 JSON 保存到 `data/daily/YYYY-MM-DD.json`。
- 可读 Markdown 报告保存到 `reports/YYYY-MM-DD-daily-news.md`。
