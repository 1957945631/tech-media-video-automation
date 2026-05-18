# 一周科技大事自动化项目

本项目用于生产抖音竖屏栏目《一周科技大事》。栏目品牌暂定为“硅基打底”，目标是把复杂科技新闻整理成普通人能听懂、能持续追更、视觉质量稳定的短视频。

频道不是“一周 AI 大事”。AI 是重要科技方向之一，但每期选题、口播和素材都应覆盖更广的科技产业：AI、芯片与半导体、消费电子、互联网平台、云计算与数据中心、开源安全、机器人、新能源与电力、航天、游戏与硬件。

## 生产流程

1. 每日新闻抓取：输出 `data/daily/` 和 `reports/`。
2. 五天新闻筛选：输出 `data/selected/` 和筛选报告。
3. 口播与分镜草稿：输出 `data/video-scripts/`，供配音平台使用。
4. 用户反馈最终 MP3 与 SRT：放入 `data/audio/`、`public/audio/`、`data/subtitles/`。
5. 素材采集：输出 `data/assets/YYYY-MM-DD/` 和 `public/assets/YYYY-MM-DD/`。
6. Episode 构建：从最终 SRT、音频、素材 manifest 生成 `src/data/currentEpisode.ts`。
7. Remotion 渲染：`src/TechNewsVideo.tsx` 负责总编排，视觉由组件库渲染。
8. 质量校验：先跑测试和时间线校验，再决定是否静帧或完整渲染。

最终配音和 SRT 是后半段最高优先级。不要在配音完成前锁死视频时长，正式流程必须以最终 MP3/SRT 反推字幕、画面切换点、visual beats 和视频总时长。

## 素材原则

素材按功能获取，不按泛泛关键词堆图：

- 证据素材：官网、新闻、推文、财报、公告截图。
- 产品素材：App UI、网页界面、功能截图、开发者工具界面。
- 产业素材：数据中心、GPU、芯片、工厂、电力、供应链。
- 商业素材：广告后台、订阅、支付、企业会议、办公流程。
- 抽象素材：AI 网络、未来城市、数字大脑、芯片结构。
- 图解素材：由 Remotion 组件动态生成。

素材获取阶段可以先调用 `news-aggregator-skill` 扩大候选池：

```bash
npm run news:aggregate:assets -- --date YYYY-MM-DD
npm run capture:daily-assets -- YYYY-MM-DD
```

`capture:daily-assets` 会自动读取 `data/assets/YYYY-MM-DD/news-aggregator-research.json`，把其中的 GitHub、Product Hunt、Hacker News、Hugging Face、中文科技新闻等链接并入证据截图、产品 UI 和真实 b-roll 候选池。

推荐画面节奏：证据截图 → 公司/人物 → 产品 UI → 科技 b-roll → 产业现实画面 → Remotion 图解 → 黄色关键词观点卡。这个节奏是优先模式，不是死模板；渲染器会根据 `assetFunction`、当前口播、最近画面历史和素材库存灵活选择。

## Remotion 组件库

视觉层拆成可组合组件：

- `EvidenceCard`：证据截图，必须配安全标注，优先高亮标题、来源或关键段落区域。
- `BrollCard`：真实视频优先，缺视频时用真实图片做动态镜头。
- `ConceptCard`：抽象科技画面。
- `DiagramCard`：商业逻辑、技术逻辑、产业链图解。
- `KeywordPunch`：黄色大字观点卡。
- `HighlightEngine`：安全红框、宽区域强调、放大镜和说明标签；禁止固定坐标箭头。
- `TransitionPreset`：白闪、glitch、推近、扫描线、硬切。

内部 `risk`、审核提醒、素材缺口提示只允许出现在报告或日志中，不允许进入观众成片。

## 项目结构

```text
tech-news-automation/
  config/                 新闻源、规则、视觉系统配置
  data/                   每期源数据、音频、字幕、素材、视频产物
  docs/                   流程、规范、质检文档
  prompts/                新闻聚合和 visual beat 规划提示词
  public/                 Remotion 可读取的音频与素材
  reports/                日报、筛选报告、内部审查报告
  scripts/                兼容入口、工具函数和测试
  scripts/pipeline/       新闻、素材、构建、校验等流程脚本
  src/
    components/           Remotion 视觉组件库
    data/                 当前可渲染 episode 数据
    rendering/            时间线、素材选择、调度逻辑
    types/                稳定类型定义
```

## 常用命令

```bash
npm test
npm run news:daily -- --date YYYY-MM-DD
npm run news:select -- --date YYYY-MM-DD
npm run news:aggregate:assets -- --date YYYY-MM-DD
npm run capture:daily-assets -- YYYY-MM-DD
npm run build:episode -- YYYY-MM-DD
npm run validate:timeline
```

完整渲染命令保留，但不要把“能渲染出文件”等同于成片合格：

```bash
npm run remotion:still
npm run remotion:render
npm run validate:timeline:video
```

## 质量硬规则

- 同一视觉角色不能连续超过 2 次。
- 同一主体再次出现时，必须换表现方式。
- 每 15 秒至少出现一次真实世界素材。
- 每 20 秒至少出现一次图解或观点卡。
- Logo 不能撑满超过 3 秒。
- 截图必须有安全标注，不能让红框、箭头或放大镜指向空白。
- 已经烙入标注的证据截图，Remotion 不再重复叠加第二层红框。
- AI/抽象画面不能连续超过 12 秒。
- 抽象画面后必须接现实素材或证据素材。
- 观众画面不能出现“审核提醒”、`risk` 或内部制作提示。
