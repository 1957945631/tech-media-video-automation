# 一周科技大事自动化项目

本项目用于生产抖音竖屏栏目《一周科技大事》。栏目品牌暂定为“硅基打底”，目标是把复杂科技新闻整理成普通观众能听懂、能持续追更、视觉质量稳定的短视频。

频道不是“一周 AI 大事”。AI 是重要科技方向之一，但每期选题、口播和素材都应覆盖更广的科技产业：AI、芯片与半导体、消费电子、互联网平台、云计算与数据中心、开源安全、机器人、新能源与电力、航天、游戏与硬件。

## 本轮更新摘要

- 新增 `AGENTS.md`，给 Codex/协作者提供一页内快速上下文。
- 将 `scripts/visual_beat_plan.mjs` 改为通用分镜生成器，从当期筛选结果和口播稿派生 story plan、segment skeleton 和 visual beats。
- 素材采集改为读取/生成当期 visual beats，不再依赖静态分镜、固定来源池轮转或按库存硬补素材。
- 证据截图取消固定红框和 baked annotation；`annotation` 不再作为库存目标。
- 来源选择增加语义匹配、URL/域名复用限制、`matchReason` 和 `matchedKeywords` 记录。
- Episode 构建改为以最终 MP3/SRT 重新分配 visual beat 时间，避免草稿字幕编号污染成片。
- 成片侧过滤“抽象科技画面”素材，优先转成关键判断卡或结构拆解，避免内部工具名进入观众画面。
- `src/data/currentEpisode.ts` 调整为生成产物，加入 `.gitignore`，目录由 `src/data/.gitkeep` 保留。
- 补充防回归测试，覆盖旧热点污染、红框标注、来源复用、episode 生成和时间线校验。

## 生产流程

1. 每日新闻抓取：输出 `data/daily/` 和 `reports/`。
2. 五天新闻筛选：输出 `data/selected/` 和筛选报告。
3. 口播与分镜草稿：输出 `data/video-scripts/`，供配音平台使用。
4. 用户返回最终 MP3 与 SRT：复制到 `data/audio/`、`public/audio/`、`data/subtitles/`。
5. 素材研究：扩展当期真实来源候选池。
6. 素材采集：输出 `data/assets/YYYY-MM-DD/` 和 `public/assets/YYYY-MM-DD/`。
7. Episode 构建：从最终 SRT、音频、当期 visual beats 和素材 manifest 生成 `src/data/currentEpisode.ts`。
8. 时间线校验：先运行测试和 `validate:timeline`。
9. Remotion 渲染：先 still 预览，再按需完整 render。

最终 MP3 和 SRT 是后半段最高优先级。不要在配音完成前锁死视频时长，正式流程必须以最终 MP3/SRT 反推字幕、画面切换点、visual beats 和视频总时长。

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

渲染命令：

```bash
npm run remotion:still
npm run remotion:render
npm run validate:timeline:video
```

不要把“能渲染出文件”等同于成片合格。完整 render 后仍需检查时间线、字幕、素材贴合度和观众可见文案。

## 项目结构

```text
tech-news-automation/
  AGENTS.md              Codex/协作者快速上下文
  config/                新闻源、规则和视觉系统配置
  data/                  每期源数据、音频、字幕、素材和视频产物；大多为生成产物
  docs/                  流程、规范、质检和方法论文档
  prompts/               新闻聚合与 visual beat 规划提示词
  public/                Remotion 可读取的音频与素材；大多为生成产物
  reference/             参考资料
  reports/               日报、筛选报告和内部审查报告；平铺目录
  scripts/               命令入口、工具函数和测试
  scripts/pipeline/      新闻、素材、episode 构建和校验等流程脚本
  src/
    components/          Remotion 视觉组件库
    data/                当前可渲染 episode 生成目录，只保留 .gitkeep
    rendering/           时间线、素材选择和渲染调度逻辑
    types/               稳定类型定义
```

`src/data/currentEpisode.ts` 是 `npm run build:episode -- YYYY-MM-DD` 生成的运行时数据，不手写、不提交为固定模板。

## 素材原则

素材必须为内容服务，按功能获取，不按泛泛关键词堆图：

- 证据素材：官网、新闻、推文、财报、公告截图。
- 产品素材：App UI、网页界面、功能截图、开发者工具界面。
- 产业素材：数据中心、GPU、芯片、工厂、电力、供应链。
- 商业素材：广告后台、订阅、支付、企业会议、办公流程。
- 结构拆解：把技术、商业、产业链或政策逻辑拆成观众能看懂的画面。
- 关键判断卡：承接口播判断，不用内部制作语言。

素材获取阶段可以先调用 `news-aggregator-skill` 扩大候选池：

```bash
npm run news:aggregate:assets -- --date YYYY-MM-DD
npm run capture:daily-assets -- YYYY-MM-DD
```

`capture:daily-assets` 会读取当期 `data/selected/YYYY-MM-DD-selection.json`、`data/video-scripts/YYYY-MM-DD-voiceover.md` 和 `data/assets/YYYY-MM-DD/news-aggregator-research.json`，动态生成当期 visual beats 并选择贴合来源。

找不到贴合网页时，生成观众能理解的信息卡或结构拆解，不硬塞无关网页截图。同一 URL 和同一域名要限制复用，并在 manifest 中记录匹配原因。

## Visual Beat 管线

`scripts/visual_beat_plan.mjs` 是通用分镜生成器，不存放某一期静态分镜。

输入：

- `data/selected/YYYY-MM-DD-selection.json`
- `data/video-scripts/YYYY-MM-DD-voiceover.md`

输出：

- `storyPlan`
- `segmentBoundaries`
- `visualBeatPlan`

每条推荐新闻生成 evidence、explain、takeaway、impact 等通用 beat。不要把具体新闻、公司、旧热点写死进通用素材管线。

## Remotion 组件库

- `EvidenceCard`：证据截图，重点是来源和核心事实清晰。
- `BrollCard`：真实视频优先，缺视频时用真实图片做动态镜头。
- `ConceptCard`：仅作内部兼容；成片优先使用真实素材、结构拆解或关键判断卡。
- `DiagramCard`：商业逻辑、技术逻辑、产业链结构拆解。
- `KeywordPunch`：黄色大字关键判断卡。
- `HighlightEngine`：只用于明确请求的语义安全宽区域强调；禁止固定坐标箭头。
- `TransitionPreset`：白闪、glitch、推进、扫描线、硬切。

证据截图默认不烙入固定红框、固定箭头或固定坐标标注。未来如果需要标注，只能使用人工确认、语义安全的宽区域强调、裁切、下划线或局部放大。

内部 `risk`、审核提醒、素材缺口提示只允许出现在报告或日志中，不允许进入观众成片。

## 质量硬规则

- 同一视觉角色不能连续超过 2 次。
- 同一主体再次出现时，必须换表现方式。
- 每 15 秒左右至少出现一次真实世界素材。
- 每 20 秒左右至少出现一次结构拆解或关键判断卡。
- Logo 不能撑满超过 3 秒。
- 证据截图要能看清来源和核心事实，但不要求烙入红框。
- 禁止固定坐标红框、固定箭头、指向空白区域的放大镜。
- 不用“抽象科技画面”凑数，也不要把内部素材类型名显示给观众。
- 观众画面不能出现“审核提醒”、`risk` 或内部制作提示。
