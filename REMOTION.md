# Remotion 视频工程说明

本项目使用 Remotion 生成「一周科技大事」竖屏视频。

## 入口文件

- `src/index.ts`：注册 Remotion 根组件。
- `src/Root.tsx`：定义 composition，当前 id 为 `TechNewsEpisode`。
- `src/TechNewsVideo.tsx`：视频画面模板。
- `src/videoData.ts`：当前待渲染的一期视频数据。

## 常用命令

预览：

```bash
npm run remotion:preview
```

渲染静帧：

```bash
npm run remotion:still
```

渲染完整视频：

```bash
npm run remotion:render
```

时间轴校验：

```bash
npm run validate:timeline
```

完整视频校验：

```bash
npm run validate:timeline:video
```

## 正式生产注意事项

- 配音完成前，不要锁死视频时长。
- `src/videoData.ts` 中的 `durationSeconds` 必须来自最终配音真实时长。
- `captions` 应来自最终配音识别出的字幕。
- `segments` 应从字幕锚点生成，而不是手工估算。
- 渲染前必须运行 `npm run validate:timeline`。
- 渲染后必须运行 `npm run validate:timeline:video`。

## 素材路径

Remotion 只能直接读取 `public/` 下的静态文件。

- 配音放在 `public/audio/`
- 渲染用截图放在 `public/assets/YYYY-MM-DD/`
- `src/videoData.ts` 中的素材路径应写成相对 `public/` 的路径

示例：

```text
audio/YYYY-MM-DD-voiceover.mp3
assets/YYYY-MM-DD/news-01-viewport.png
```
