# 文档入口

本目录保存《一周科技大事》生产流水线的长期规则。优先阅读顺序如下：

1. `project-structure-and-content-rules.md`：项目分层、内容禁区、素材优先级和验收规则。
2. `production-workflow.md`：每期从新闻抓取到成片渲染的标准顺序。
3. `audio-video-sync-workflow.md`：口播、MP3、SRT 和画面时间轴的同步原则。
4. `asset-quality-policy.md`：素材真实度、fallback、重复使用和 Remotion 动画规则。
5. `production-quality-checklist.md`：渲染前后人工与自动质检清单。
6. `advanced-video-methodology.md`：visual beat 方法论和画面功能拆分。
7. `news-aggregator-skill.md`：news-aggregator-skill 在新闻和素材阶段的接入方式。

## 核心原则

- 五日筛选之后先生成并确认口播稿，再进入配音、SRT 和素材阶段。
- 最终 MP3/SRT 是时间基准；不要用口播文字估算成片时长。
- 素材捕获必须读取已确认口播稿，最好在最终 SRT 放入后执行。
- fallback 卡、图解卡和观点卡自行管理版面，不再叠全局来源角标、关键词 chips 或重复正文。
- Remotion 语义动画是内嵌组件素材，不需要额外生成独立视频文件。
