# 高级视频方法论

本项目的后半段不把视频理解成“背景图 + 字幕 + 标题栏”，而是采用“口播语义驱动的视觉系统”：

```text
口播语义 -> visual beat -> 视觉角色 -> 素材策略 -> 组件渲染 -> 动效和转场 -> 防重复检查
```

目标是：观众即使关闭声音，只看画面，也能大概理解视频在讲什么。

## Visual Beat 必填语义

每个正式 visual beat 除了时间和素材，还必须回答四个问题：

- `subject`：这句话说的是谁。
- `action`：正在发生什么。
- `concept`：背后的抽象概念是什么。
- `visualRole`：这句话需要证据、解释、情绪还是总结。

推荐结构：

```ts
type VisualBeat = {
  start: number;
  end: number;
  captionRange: [number, number];
  narration?: string;
  subject: string;
  action: string;
  concept: string;
  visualRole:
    | 'evidence'
    | 'product_ui'
    | 'person_or_company'
    | 'broll'
    | 'concept'
    | 'diagram'
    | 'keyword';
  assets: string[];
  assetQuery?: string[];
  overlayTitle: string;
  transitionOut: 'cut' | 'flash' | 'glitch' | 'zoom' | 'scan';
};
```

## 视觉角色

- `evidence`：新闻截图、官网公告、推文、财报、监管文件。重点是证明来源和核心事实，不默认烙入固定红框。
- `product_ui`：产品页面、App、功能截图、开发者工具。重点是让观众知道说的是哪个产品。
- `person_or_company`：人物、公司、机构、品牌。Logo 只能作为辅助，不能长时间撑满画面。
- `broll`：数据中心、工厂、机器人、芯片、会议、城市等真实场景。
- `concept`：内部规划占位。成片不得用“抽象科技画面”糊弄观众，应转成真实素材、结构拆解或关键判断卡。
- `diagram`：商业模式、技术路径、成本结构、因果关系和产业链，是提升信息密度的核心组件。
- `keyword`：黄色大字观点卡，每 20 到 30 秒出现一次，必须是短判断句。

## 素材策略

素材不要只按关键词搜索，而要按画面功能拆分：

- 证据素材：官方公告、原文报道、截图页面。
- 产品素材：官网、产品 UI、App 页面、演示视频。
- 商业素材：收入、成本、融资、股价、广告系统、供应链。
- 机制素材：流程图、因果图、技术路径、架构图。
- 补充素材：真实 b-roll、产品界面、产业现场或信息卡。

正式视频应混合使用官方截图、产品 UI、真实场景、结构拆解和关键词观点卡。不要把内部工具名或“抽象科技画面”放到观众可见内容里。

## 防重复规则

- 同一种 `visualRole` 不能连续超过 2 次。
- 同一主体连续出现时，必须换表现方式。
- 每 15 秒至少出现一次真实世界素材：`evidence`、`product_ui`、`person_or_company` 或 `broll`。
- 每 20 秒至少出现一次 `diagram` 或 `keyword`。
- Logo 只能作为过渡，不能撑满超过 3 秒。
- 证据截图可以有来源标签、裁切、下划线、局部放大或人工确认的宽区域强调。
- 禁止固定坐标红框、固定箭头和无法确认位置的标注。
- 抽象画面不能连续超过 12 秒，后面必须接现实素材或证据素材。
- 任何 10 秒内都要有至少一次信息变化。
- 同一素材不得在同一视频中过量重复使用；同一 URL 和同一域名也要限制复用。

## 项目落点

- 视觉系统配置：`config/visual-system.json`
- visual beat 规划提示词：`prompts/visual_beat_planning.md`
- visual beat 生成器：`scripts/visual_beat_plan.mjs`
- visual beat 校验：`scripts/visual_beats_utils.mjs`
- 生产质检清单：`docs/production-quality-checklist.md`

这套规则优先约束素材获取和 visual beat 规划；Remotion 组件后续应继续向 `EvidenceCard`、`BrollCard`、`ConceptCard`、`DiagramCard`、`KeywordPunch` 的组件库方向演进。
