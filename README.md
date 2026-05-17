# 一周科技大事自动化项目

本项目用于生产抖音竖屏栏目《一周科技大事》。栏目品牌暂定为“硅基打底”，目标是把复杂科技新闻整理成普通人能听懂、能持续追更、视觉质量稳定的短视频。

这不是一个单纯“抓新闻并渲染视频”的项目，而是一个分成前后两段的生产流水线。

## 项目理解

前半部分由两个 Codex 自动化任务完成，负责把科技新闻反馈到位：

- 每日科技新闻抓取：持续收集、归档当天科技新闻。
- 五天科技新闻筛选：从最近几天新闻里选出适合做成一期视频的主题。

前半部分的交付物是：

- 可读日报和筛选报告。
- 口播正文草稿。
- 分镜和视觉方向草稿。

后半部分从你反馈最终配音和 SRT 文件开始，负责真正成片：

- 以最终 MP3 和 SRT 为唯一时间基准。
- 根据口播和字幕逐句寻找或生成素材。
- 用 Remotion 渲染竖屏成片。
- 对成片做质量审查，避免排版、遮挡、乱码、不同步、素材错位等低级错误。
- 在基础合格后，再提升审美、节奏、转场、素材质感和整体视觉效果。

## 核心原则

最终配音和 SRT 是后半段的最高优先级。

不要在配音完成前锁死视频时长。正式流程必须先拿到最终配音和最终 SRT，再反推字幕、画面切换点、visual beats 和视频总时长。

渲染成功不等于成片合格。成片必须经过时间线校验和人工视觉审查，确认没有遮挡、乱码、错位、字幕错误、素材和口播不匹配等问题后，才能视为完成。

## 工作流

### 1. 每日新闻抓取

Codex 自动化任务：`每日科技新闻抓取`

输出：

- `data/daily/`：每日结构化新闻归档。
- `reports/`：人工可读日报。

目标：

- 抓取全球和中国科技新闻。
- 保留标题、来源、发布时间、链接、摘要、可信度备注。
- 优先关注 AI、芯片、消费电子、互联网平台、机器人、自动驾驶、科技监管。

### 2. 五天新闻筛选

Codex 自动化任务：`五天科技新闻筛选`

输出：

- `data/selected/`：筛选结果。
- `reports/`：筛选报告。

筛选标准：

- 重要性：是否影响行业、公司、政策或用户习惯。
- 可解释性：普通观众是否能听懂。
- 画面性：是否有官网、博客、新闻源、产品图或可截图页面。
- 风险控制：是否需要注明传闻、媒体报道、未正式确认。
- 内容平衡：避免一期全是同一类新闻。

### 3. 口播和分镜草稿

输出：

- `data/video-scripts/`：口播正文和分镜草稿。

要求：

- 输出完整口播正文，方便你复制到配音平台。
- 同时输出分镜草稿，说明每条新闻应该用什么素材表达。
- 分镜只作为视觉规划，不作为最终时间轴。

### 4. 你反馈最终配音和 SRT

你提供：

- 最终配音 MP3。
- 与最终配音对齐的 SRT。

项目内放置路径：

- `data/audio/YYYY-MM-DD-voiceover.mp3`
- `public/audio/YYYY-MM-DD-voiceover.mp3`
- `data/subtitles/YYYY-MM-DD-aligned.srt`

注意：

- 字幕必须来自最终配音，不能只用口播文本估算。
- 口播文本只用于理解语义和提取视觉关键词。
- 后续字幕和画面节奏都跟 SRT 走。

### 5. 句级 visual beats

后半段画面不能只按热点段轮播，而要按关键句生成 visual beats。
项目采用 `config/visual-system.json` 中定义的“口播语义驱动的视频视觉系统”，让每句话都分配明确的视觉角色和素材策略。

每个 visual beat 至少包含：

- `start/end`：来自 SRT 的真实时间。
- `captionRange`：绑定到字幕句。
- `intent`：这一句要表达什么。
- `subject/action/concept`：这一句讲谁、发生什么、背后概念是什么。
- `visualRole`：证据截图、产品 UI、人物/公司、真实 b-roll、概念画面、图解或关键词观点卡。
- `keywords`：素材检索和卡片生成关键词。
- `assetQuery`：按画面功能拆出的素材搜索词。
- `assets`：真实截图或自制信息卡。
- `overlayTitle`：素材卡内部标题。
- `transitionOut`：出场转场，保持硬切为主、少量白闪和 glitch。

规则：

- 时间以 SRT 为准。
- 短句可以合并成一个 beat。
- visual beat 不能跨热点。
- Remotion 当前画面优先使用 `visualBeats`，没有 beat 时才回退热点段素材。
- 同一种 `visualRole` 不能连续超过 2 次。
- 每 15 秒至少出现一次真实世界素材。
- 每 20 秒至少出现一次图解或观点卡。
- 证据截图必须有标注，否则观众不知道该看哪里。

### 6. 素材采集与生成

输出：

- `data/assets/YYYY-MM-DD/`：原始素材、素材清单、visual beats。
- `public/assets/YYYY-MM-DD/`：Remotion 可读取素材。

素材优先级：

1. 公司官网、官方博客、产品页、公告页。
2. 可信新闻源页面。
3. 监管机构、交易所、论文、GitHub、开发者文档。
4. 抓不到真实素材时，生成统一风格的暗黑科技信息卡。

素材要求：

- 素材必须服务当前口播句，而不是只服务当前热点。
- 自制卡不是普通占位图，要有来源、关键词、主题标题和统一视觉风格。
- 不允许外层装饰文字遮挡素材正文。

### 7. Remotion 渲染

当前 Remotion 入口：

- `src/index.ts`
- `src/Root.tsx`
- `src/TechNewsVideo.tsx`
- `src/videoData.ts`

当前 composition id：

- `TechNewsEpisode`

字幕风格：

- 无背景板。
- 大号白字。
- 黑色描边或投影。
- 居中偏下。
- 不遮挡主体内容。

### 8. 质量审查

成片必须经过两类审查：

- 自动审查：测试、类型检查、时间线校验、视频时长校验。
- 人工审查：抽帧和快速看成片，检查排版、遮挡、乱码、字幕、素材语义和整体观感。

详细清单见：

- `docs/production-quality-checklist.md`

最低要求：

- 音频、SRT、segments、visualBeats、视频时长不越界。
- 字幕和配音对齐。
- 当前画面和当前口播句对齐。
- 不出现低级视觉错误，包括遮挡、乱码、文字溢出、字幕背景板误用、素材主体被装饰盖住。
- 成片审查发现问题时，必须修复后重新渲染并再次校验。

## 常用命令

安装依赖：

```bash
npm install
```

生成素材：

```bash
npm run capture:daily-assets
```

运行全网新闻聚合候选池：

```bash
npm run news:aggregate:daily -- --date YYYY-MM-DD
npm run news:aggregate:select -- --date YYYY-MM-DD
npm run news:aggregate:assets -- --date YYYY-MM-DD
```

新闻聚合 skill 的项目接入说明见：

- `docs/news-aggregator-skill.md`

用最终 SRT 和素材生成本期 `videoData.ts`：

```bash
npm run build:episode
```

测试：

```bash
npm test
```

渲染前时间线校验：

```bash
npm run validate:timeline
```

渲染静帧：

```bash
npm run remotion:still
```

渲染完整视频：

```bash
npm run remotion:render
```

渲染后校验：

```bash
npm run validate:timeline:video
```

推荐完整顺序：

```bash
npm test
npm run capture:daily-assets
npm run build:episode
npm run validate:timeline
npm run remotion:still
npm run remotion:render
npm run validate:timeline:video
```

## 项目结构

```text
tech-news-automation/
  config/                 新闻源、规则、筛选配置
    visual-system.json    视频高级感、视觉角色和防重复规则
  data/
    assets/               原始素材、visual-beats.json
    audio/                最终配音
    daily/                每日新闻归档
    production/           静帧、预览图、审查截图
    selected/             五天筛选结果
    subtitles/            与最终配音对齐的 SRT
    video-scripts/        口播正文、分镜草稿
    videos/               导出视频
  docs/                   生产流程和质检文档
  logs/                   自动化运行日志
  prompts/                Codex 自动化提示词
    visual_beat_planning.md  句级 visual beat 规划提示词
  public/
    assets/               Remotion 渲染用素材
    audio/                Remotion 渲染用配音
  reference/              同类视频、视觉风格参考
  reports/                日报和筛选报告
  scripts/                抓素材、构建视频数据、校验时间线脚本
  src/                    Remotion 视频工程
```

## 当前关键脚本

- `scripts/srt_utils.mjs`：解析和校验 SRT。
- `scripts/visual_beats_utils.mjs`：校验 visual beats 时间合法性。
- `config/visual-system.json`：定义视觉角色、转场比例、全局视觉参数和防重复规则。
- `docs/advanced-video-methodology.md`：沉淀口播类科技视频高级感方法论。
- `scripts/visual_beat_plan.mjs`：当前测试期的 beat 规划。
- `scripts/capture_daily_assets.mjs`：按 beat 抓取真实素材或生成信息卡。
- `scripts/build_episode_from_srt.mjs`：从最终 SRT、音频和素材生成 `src/videoData.ts`。
- `scripts/validate_timeline.mjs`：校验音频、字幕、segments、visualBeats 和成片时长。

## 这次测试沉淀出的项目规则

- 后半段必须从你给的 MP3 和 SRT 开始，不再由 Codex 自行口播或估算字幕。
- SRT 解决字幕对齐，visual beats 解决画面和口播句对齐。
- 素材层级要克制，任何覆盖素材正文的外层标题都应该删除。
- 字幕不能使用背景板，应保持参考截图式白字黑描边。
- 每次完整渲染后必须人工抽查，而不是只看命令是否成功。
- 发现遮挡、乱码、排版错误这类低级问题时，优先修复质量问题，再谈审美提升。

## 后续优化方向

- 将每期数据从 `src/videoData.ts` 抽离为 `episodes/YYYY-MM-DD.json`。
- 将 visual beat 规划从手工文件升级为从 SRT 和分镜草稿半自动生成。
- 增加抽帧审查脚本，自动按 visual beat 中点导出审核图。
- 增加视觉安全区规则，自动避免外层装饰压到素材正文和字幕。
- 增加更多转场和素材动效模板，但所有动效都必须服从信息可读性。
