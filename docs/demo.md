# Demo Assets

<p>
   <a href="#english">English</a> · <a href="#zh-cn">简体中文</a>
</p>

<a id="english"></a>

OpenMark's demo assets are meant to show the real editor experience first: local Markdown writing, split preview, command palette actions, exports, appearance settings, and packaged-app update checks.

## Screenshots

Use these screenshots in release notes, social posts, README sections, and store listings. Each screenshot should be captured from the live app, cropped to the actual application viewport, and saved at 1600x900 so GitHub, package pages, and social previews display the interface instead of an empty outer canvas.

| Asset | Size | Purpose |
| --- | --- | --- |
| [`openmark-screenshot.png`](assets/openmark-screenshot.png) | 1600x900 | Primary workspace screenshot for the README hero. |
| [`openmark-demo-command-palette.png`](assets/openmark-demo-command-palette.png) | 1600x900 | Shows keyboard-first command discovery across copy, export, file, edit, view, workspace, and update actions. |
| [`openmark-demo-appearance-settings.png`](assets/openmark-demo-appearance-settings.png) | 1600x900 | Shows theme, language, editor font size, export style presets, and update settings inside the desktop-like workspace. |

### Command Palette

![OpenMark command palette demo](assets/openmark-demo-command-palette.png)

### Appearance Settings

![OpenMark appearance settings demo](assets/openmark-demo-appearance-settings.png)

## Short Video Script

Target length: 45-60 seconds.

1. Open with the split workspace and a real Markdown document.
   Narration: "OpenMark is a local-first Markdown editor focused on a calm writing loop."
2. Type or select a small Markdown section while the preview updates.
   Narration: "Write Markdown on the left and keep a safe live preview on the right."
3. Open the command palette and search for `preview`.
   Narration: "Use the command palette for fast access to file, editor, clipboard, and export actions."
4. Show table formatting and image insertion from the toolbar.
   Narration: "Common Markdown actions stay close without turning the editor into a heavy word processor."
5. Open appearance settings, switch theme, adjust editor font size, and choose an export style.
   Narration: "Tune the workspace and exported documents with theme, language, font size, and export style settings."
6. End on export preview, copy Markdown, copy HTML, HTML export, PDF export, and recent files.
   Narration: "Save locally, reopen recent files, preview the final document, copy what you need, and export polished HTML or PDF when you are ready to share."

## Capture Checklist

- Use a 1600x900 viewport for screenshots and the video recording.
- If the capture environment uses a high-DPI or constrained browser viewport, crop to the rendered app viewport before resizing to 1600x900.
- Use split mode so editor and preview are both visible.
- Keep the document title as `openmark-demo.md`.
- Include headings, a table, blockquote, checklist-like bullets, recent files, and copy/export-related text.
- Capture the command palette on a light workspace with enough commands visible to show file, edit, view, workspace, help, and export flows.
- Capture export preview with the current export style visible before recording HTML/PDF export actions.
- Capture appearance settings on a dark workspace with theme, language, font size, export style, and update controls visible.
- Keep desktop notifications, browser UI, and unrelated local paths out of frame.
- Verify `npm run lint` and `npm run build` before recording a release video.

## Suggested Posting Copy

OpenMark is a local-first Markdown editor for focused writing: CodeMirror editing, safe preview, native desktop file dialogs, recent files, command palette, local image handling, Markdown/HTML clipboard copy, shared export style presets, export preview, share-friendly export metadata, HTML/PDF export, and appearance settings.

<a id="zh-cn"></a>

## 简体中文

OpenMark 的演示资产应优先展示真实编辑器体验：本地 Markdown 写作、分屏预览、命令面板、导出、外观设置，以及打包应用的更新检查。

### 截图规范

- 截图应来自真实应用界面，并裁切到实际应用视口。
- 最终 PNG 保存为 1600x900，避免出现外层尺寸正确但画面只集中在左上角的问题。
- README 中的两张功能图应分别展示命令面板和外观设置，并保证工具栏、编辑区、预览区和弹窗都清晰可见。
- 如果截图环境存在高 DPI 或浏览器可视区受限，应先裁掉空白画布，再缩放到 1600x900。

### 推荐展示内容

- 使用分屏模式，同时展示编辑器和预览。
- 文档标题保持为 `openmark-demo.md`。
- 文档中包含标题、表格、引用、清单、最近文件和复制/导出相关内容。
- 命令面板截图使用浅色工作区，展示预览导出、复制、导出、文件、编辑、视图、工作区和帮助流程。
- 外观设置截图使用深色工作区，展示主题、语言、字号、导出样式和更新控件。
- 录制 HTML/PDF 导出操作前，先展示导出预览，并确保当前导出样式清晰可见。

### 推荐发布文案

OpenMark 是一个本地优先的 Markdown 编辑器，适合专注写作：CodeMirror 编辑、安全预览、原生桌面文件对话框、最近文件、命令面板、本地图片处理、Markdown/HTML 剪贴板复制、共享导出样式预设、导出预览、分享友好的导出元数据、HTML/PDF 导出和外观设置。
