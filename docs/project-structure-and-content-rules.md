# 项目结构与内容规则

## 项目定位

《一周科技大事》面向普通科技新闻观众。成片要讲清一周科技事件背后的产品、产业、规则和普通用户影响，不是内部制作汇报，也不是单一 AI 周报。

## 分层职责

- `config/`：全局规则、新闻源、视觉系统和素材比例。素材多样性、视频素材策略、重复使用上限优先写在这里。
- `data/daily/`、`data/selected/`：采集和选题结果。这里可以保存内部判断，但不能把模板化制作话术当成观众文案。
- `scripts/daily_*`、`scripts/five_day_*`：新闻采集、筛选和选题报告。
- `scripts/visual_beat_plan.mjs`、`scripts/visual_beats_utils.mjs`：把选题和口播语义转成 visual beats。这里必须区分内部 `intent` 和 audience-safe 字段。
- `scripts/pipeline/capture_daily_assets.mjs`：素材获取和 fallback 卡生成。优先真实网页、产品界面、行业现场、图片和视频素材；当机制、流程、依赖关系难以找到真实素材时，可交给 Remotion 组件生成语义动画片段；最后才使用自制静态卡。
- `scripts/pipeline/build_episode_from_srt.mjs`：用最终 MP3/SRT 生成 Remotion 数据。`src/data/currentEpisode.ts` 是生成物，不手写维护。
- `src/components/`、`src/rendering/`：最终可见渲染层。观众能看到什么，必须在这里有最后防线。
- `scripts/*test.mjs`、`scripts/pipeline/validate_timeline.mjs`：质量闸门。内容安全、素材重复、真实素材比例、视频素材可用性和视觉节奏都要自动检查。
- `data/videos/`、`data/production/`、`reports/`、`logs/`：产物、预览、报告和日志，不作为逻辑源头。

## 优先级

- **P0 内容安全**：内部制作话术不得进入 `overlayTitle`、`concept`、`keywords`、卡片正文、chips、字幕等观众可见字段。
- **P0 自制卡遮挡**：`yellow_opinion_card`、`remotion_diagram` 和 fallback 卡只允许一个主体文字来源。PNG 已有主体内容时，Remotion 不再叠来源角标、chips 或重复正文。
- **P1 素材真实度**：降低纯自制 PNG 卡依赖，提高证据截图、产品 UI、真实 b-roll 和视频素材比例；抽象机制类内容优先使用 `remotion_motion_clip` 作为动态素材补位，而不是继续堆静态 PNG。
- **P1 素材去重**：限制同 URL、同域名、同文件和连续 beat 的重复使用。同一条新闻不能反复使用同一网页截图或泛素材。
- **P1 生产顺序**：五日筛选后先确认口播稿；最终 MP3/SRT 放入后再做资产聚合、素材捕获和 episode 构建。
- **P2 渲染表现**：按素材类型设计处理方式。证据截图要清晰可信，产品 UI 要局部推进，视频 b-roll 要动态铺底，结构拆解要信息明确，观点卡只作节奏点缀。
- **P2 转场动效**：转场应跟 visual role 相关，避免整期只有同一种 `cut/flash` 模板。
- **P3 质量报告**：每期输出真实素材比例、视频素材数量、fallback PNG 数量、重复 URL/域名和连续卡片时长。

## 观众可见禁区

以下内容只能出现在日志、报告或内部 JSON 中，不能进入成片画面：

- `审核提醒`
- `risk`
- `fallback`、`generated`、`制作意图` 等内部制作状态
- `用一个具体使用场景切入`
- `用一句判断收束`
- `用概念画面承接抽象机制`
- `避免长时间只看`
- `让观众记住`
- `段落转场`
- `Remotion 图解`、`抽象科技画面` 等内部素材类别名

## 素材规则

- 视频素材是一等资产，允许 `.mp4`、`.webm`、`.mov`、`.m4v` 进入素材池，只要语义贴合口播并且来源可追溯。
- Remotion 语义动画也是素材来源的一部分，适合机制、流程、依赖、风险扩散、系统运行等抽象内容。它由渲染层组件生成，不要求 `public/assets` 里存在对应文件，但必须使用观众安全字段，不能读取内部 `intent`。
- 自制 PNG 卡保留，但定位是解释、总结和节奏补充，不是默认主体画面。
- `yellow_opinion_card` 连续出现必须报错，需用真实素材、产品 UI 或证据截图打断。
- fallback 卡必须在内部 manifest 中保留 `generated-fallback` 状态，但成片画面不能显示该状态，也不能冒充真实证据截图。
- 证据截图默认不加固定红框、固定箭头或固定坐标标注。未来如需高亮，必须由 beat 明确提供语义安全高亮数据。

## 验收规则

正式成片前必须通过：

- `npm test`
- `npm run validate:timeline`
- still 预览抽查关键帧

详细执行顺序见 `docs/production-workflow.md`，素材质量规则见 `docs/asset-quality-policy.md`。

渲染成功不等于成片合格。只要出现内部提示词泄漏、重复叠字、连续自制卡、素材明显不贴合口播，均视为需要返修。
