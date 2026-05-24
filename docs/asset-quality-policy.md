# 素材质量策略

本项目的素材不是“有图就行”。每个 visual beat 的画面必须服务当前口播句，并且不能把内部制作状态显示给观众。

## 素材类型

- `captured`：真实网页截图、产品页截图、直接下载的图片或视频素材。
- `component-rendered`：由 Remotion 组件在最终视频中内嵌渲染的语义动画，例如 `remotion_motion_clip`。
- `generated-fallback`：抓取失败或素材不足时生成的解释卡、图解卡或观点卡。

## 显示规则

- `captured` 可以显示轻量来源标签，但不能遮挡页面标题和主体内容。
- `component-rendered` 自己管理标题、节点、路径和关键词，不叠外层来源角标或 chips。
- `generated-fallback` 不叠外层来源角标、关键词 chips 或重复正文。
- `yellow_opinion_card`、`remotion_diagram`、fallback 卡都只允许一个主体文字来源。

## 证据素材

- evidence beat 优先使用该新闻的原始来源 URL。
- 原始来源抓取失败时，必须在 manifest 中记录错误，例如 `HTTP 403`。
- 抓取失败后可以生成 fallback 卡，但不能把它伪装成真实证据截图。
- 证据截图默认不加固定红框、固定箭头或固定坐标标注。

## 重复使用

- 同一非 evidence URL 默认最多使用 1 次。
- 同一原始证据 URL 可以用于 evidence 和紧邻解释段，但不应在整条新闻内反复撑满画面。
- 同一域名连续出现时，要切换表现方式：网页截图、产品 UI、Remotion 动画、真实 b-roll 或干净 fallback。
- 弱语义匹配不能算真实素材。匹配不足时宁可用干净 fallback 或 Remotion 机制动画。

## Remotion 动画

- `remotion_motion_clip` 是内嵌动画素材，不需要 `public/assets` 中存在文件。
- 每期至少 4 个 motion clip，推荐 intro 或每条主新闻的 concept beat 使用。
- motion clip 适合机制、流程、系统运行、依赖关系、风险扩散、企业部署、供应链和政策影响。
- motion clip 必须使用观众安全的 title/body/keywords，不能读取内部 `intent`。

## 质量报告

每期 `assets-manifest.json` 至少应能看出：

- 真实素材数量。
- fallback 数量。
- Remotion component 数量。
- 重复 URL/域名。
- 抓取失败原因。
- 每个素材的 `matchReason`。

如果素材不足，报告要诚实暴露问题，不要让 fallback 卡伪装成真实截图。
