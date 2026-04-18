# 3.9 画板模块 — spec.md

## ① 用户旅程

### 主流程 A：插入画板

1. 用户在 WYSIWYG 编辑器中编辑笔记，光标在某个段落
2. 用户输入 `/drawing` 或 `/画板`（斜杠命令），或点击工具栏 ✏️ Drawing 按钮
3. 编辑器在光标下方插入一个画板 block（初始为空白画板）
4. 主进程在笔记同级 `assets/` 目录创建 `drawing-001.excalidraw`（JSON），序号自动递增
5. 画板 block 自动展开为 Excalidraw 编辑器，用户可以直接开始绘画
6. 编辑器 markdown 输出中生成 `![drawing](assets/drawing-001.excalidraw)`

### 主流程 B：编辑已有画板

1. 用户打开含画板的笔记，画板以 SVG 缩略图形式显示在文档流中
2. 用户单击缩略图
3. 画板 block 内联展开为 Excalidraw 编辑器，加载 `.excalidraw` JSON 数据
4. 用户使用工具栏绘制（选择/矩形/椭圆/菱形/箭头/线条/画笔/文本/橡皮擦）
5. 每次变更 debounce 1s 自动保存到 `.excalidraw` 文件，同步更新 `.excalidraw.svg` 缩略图
6. 用户点击画板外部区域或按 Escape 键，画板收起为缩略图模式

### 主流程 C：删除画板

1. 用户在缩略图模式下点击画板底部标签栏的 Delete 按钮
2. 弹出确认对话框："Delete this drawing? The .excalidraw file will also be removed."
3. 用户确认后，画板 block 从文档中移除，同时删除 `assets/drawing-NNN.excalidraw` 和 `.excalidraw.svg` 文件
4. markdown 中对应的 `![drawing](...)` 行被移除

### 异常流程

- 打开笔记时 `.excalidraw` 文件不存在 → 画板 block 显示错误占位："Drawing file not found"，不阻塞其他内容渲染
- `.excalidraw` JSON 解析失败 → 同上显示错误占位
- 保存失败（磁盘满/权限）→ 画板底部状态显示 "Save failed"（红色），console.error 记录，不丢失内存中数据
- `assets/` 目录不存在 → 自动创建

---

## ② 数据模型 + API

### Excalidraw 数据格式

`.excalidraw` 文件为标准 Excalidraw JSON 格式：

```typescript
interface ExcalidrawData {
  type: 'excalidraw'
  version: 2
  source: 'ai-note'
  elements: ExcalidrawElement[]  // Excalidraw 库提供的类型
  appState: {
    viewBackgroundColor: string
    gridSize: number | null
  }
  files: Record<string, BinaryFileData>  // 嵌入图片等二进制资源
}
```

初始空白画板 JSON：

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "ai-note",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "transparent",
    "gridSize": null
  },
  "files": {}
}
```

### 文件存储规范

```
notes/
  my-note.md                              ← 含 ![drawing](assets/drawing-001.excalidraw)
  assets/
    drawing-001.excalidraw                 ← Excalidraw JSON 数据
    drawing-001.excalidraw.svg             ← SVG 缩略图（自动生成）
    drawing-002.excalidraw                 ← 第二个画板
    drawing-002.excalidraw.svg
    paste-001.png                          ← 粘贴图片（已有功能）
```

**命名规则**：与粘贴图片一致，`drawing-{NNN}`，NNN 为三位递增序号。

### IPC Channel（新增）

#### `file:save-drawing`

保存画板数据到 `.excalidraw` 文件。

```typescript
// Request
{
  channel: 'file:save-drawing',
  args: [relativePath: string, data: string]
  // relativePath: 如 "notes/assets/drawing-001.excalidraw"
  // data: JSON.stringify(excalidrawData)
}

// Response
boolean  // true 成功，false 失败
```

#### `file:read-drawing`

读取画板数据。

```typescript
// Request
{
  channel: 'file:read-drawing',
  args: [relativePath: string]
}

// Response
string  // JSON 字符串，文件不存在时返回空字符串 ""
```

#### `file:create-drawing`

创建新画板文件，自动分配递增序号。

```typescript
// Request
{
  channel: 'file:create-drawing',
  args: [assetsDir: string]
  // assetsDir: 笔记同级 assets 目录的相对路径，如 "notes/assets"
}

// Response
string  // 创建后的相对路径，如 "notes/assets/drawing-001.excalidraw"
```

**命名逻辑**：
1. 读取 `assetsDir` 下所有 `drawing-*.excalidraw` 文件
2. 提取最大序号 N
3. 新文件命名 `drawing-{(N+1).toString().padStart(3, '0')}.excalidraw`
4. 写入初始空白 JSON
5. 如果目录不存在，自动创建

#### `file:delete-drawing`

删除画板文件及其缩略图。

```typescript
// Request
{
  channel: 'file:delete-drawing',
  args: [relativePath: string]
  // relativePath: 如 "notes/assets/drawing-001.excalidraw"
}

// Response
boolean  // true 成功
```

**删除逻辑**：同时删除 `.excalidraw` 和 `.excalidraw.svg` 两个文件。

#### `file:save-drawing-thumbnail`

保存画板 SVG 缩略图。

```typescript
// Request
{
  channel: 'file:save-drawing-thumbnail',
  args: [relativePath: string, svgString: string]
  // relativePath: 如 "notes/assets/drawing-001.excalidraw"（自动追加 .svg）
}

// Response
boolean
```

### Preload API（新增）

```typescript
// preload/index.ts 新增
file: {
  // ...existing methods...
  createDrawing(assetsDir: string): Promise<string>
  readDrawing(relativePath: string): Promise<string>
  saveDrawing(relativePath: string, data: string): Promise<boolean>
  deleteDrawing(relativePath: string): Promise<boolean>
  saveDrawingThumbnail(relativePath: string, svgString: string): Promise<boolean>
}
```

### BlockNote 自定义 Block Schema

```typescript
import { createReactBlockSpec } from '@blocknote/react'

const DrawingBlock = createReactBlockSpec(
  {
    type: 'drawing',
    propSchema: {
      src: { default: '' },  // 相对路径，如 "assets/drawing-001.excalidraw"
    },
    content: 'none',
  },
  {
    render: (props) => <DrawingBlockComponent {...props} />,
  }
)
```

注册到编辑器：

```typescript
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core'

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    drawing: DrawingBlock,
  },
})

const editor = useCreateBlockNote({ schema, ... })
```

### Markdown 序列化

**BlockNote → Markdown**：`drawing` block 序列化为 `![drawing](assets/drawing-NNN.excalidraw)`

**Markdown → BlockNote**：解析到 `![drawing](*.excalidraw)` 时，创建 `drawing` block，`src` 设为相对路径

需要自定义 `blocksToMarkdownLossy` 和 `tryParseMarkdownToBlocks` 的行为，或在转换前后做字符串替换。

---

## ③ UI 功能点

### [Toolbar] 画板插入按钮

- F-01: 编辑器工具栏最右侧（分隔线后）显示 ✏️ 画板按钮，文字标签 "Drawing"，蓝色边框样式（`color: #3b82f6, border: 1px solid #3b82f6`）
- F-02: 点击按钮 → 在光标当前 block 下方插入 `drawing` block，调用 `file:create-drawing` 创建文件，自动展开为编辑模式

### [SlashMenu] 斜杠命令

- F-03: 输入 `/` 触发斜杠菜单时，菜单中包含 "Drawing Board" 项，icon 为 ✏️，描述 "Insert an interactive drawing canvas"，分组归入 "Media"
- F-04: 选中该项 → 行为同 F-02

### [DrawingBlock] 缩略图模式（默认）

- F-05: 画板 block 外框为 `border: 1px solid var(--border)`，`border-radius: 8px`，`overflow: hidden`
- F-06: 内容区域显示 SVG 缩略图（从 `.excalidraw.svg` 加载），默认高度 300px，背景 `#1a1a2e`（深色）/ `#f8f9fa`（浅色）
- F-07: 如果是新建的空白画板，缩略图区域显示占位：居中 ✏️ 图标（48px，opacity 0.3）+ 文字 "Empty drawing — click to start"
- F-08: hover 时外框变为 `border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6`
- F-09: hover 时缩略图上方浮现半透明遮罩层（`rgba(0,0,0,0.3)`），居中显示蓝色按钮 "Click to edit"（`bg: #3b82f6, color: white, padding: 8px 20px, border-radius: 6px`）
- F-10: 缩略图下方显示标签栏：左侧 `✏️ drawing-NNN.excalidraw` + 保存状态（绿色 "Saved"），右侧操作按钮 `[SVG] [PNG] [Delete]`
- F-11: `.excalidraw` 文件不存在时，缩略图区域显示错误占位："Drawing file not found"（红色文字）

### [DrawingBlock] 展开编辑模式

- F-12: 单击缩略图 → block 展开，缩略图隐藏，显示 Excalidraw 编辑器，高度 450px
- F-13: 展开后外框变为 `border-color: #3b82f6; box-shadow: 0 0 0 2px #3b82f6`
- F-14: 顶部工具栏（Excalidraw 自带）：选择🔲 / 矩形▭ / 椭圆⬭ / 菱形◇ / 箭头→ / 线条╱ / 画笔✏️ / 文本T / 橡皮擦🧹，分隔线后接颜色选择器（6色：#3b82f6, #22c55e, #ef4444, #eab308, #a855f7, #cdd6f4）
- F-15: 选中工具高亮为蓝色背景（`bg: #3b82f6, color: white`），其他工具 hover `bg: var(--surface)`
- F-16: 画布区域占满剩余空间，白色/深色背景跟随应用主题
- F-17: 画布右上角浮动操作按钮：`[⛶ Fullscreen] [✕ Close]`，样式 `border: 1px solid var(--border), bg: var(--bg-secondary), border-radius: 4px, font-size: 12px`
- F-18: Excalidraw 编辑器的快捷键（画图相关）在展开时生效，不与编辑器主快捷键冲突
- F-19: `Cmd/Ctrl+Z` 在画板展开时触发画板内撤销，`Cmd/Ctrl+Shift+Z` 触发重做

### [DrawingBlock] 收起与保存

- F-20: 点击画板 block 外部区域 → 画板收起为缩略图模式，触发保存
- F-21: 按 Escape 键 → 同 F-20
- F-22: 点击 Close 按钮 → 同 F-20
- F-23: 保存时标签栏状态文字变为黄色 "Saving..."，保存完成后变为绿色 "Saved"
- F-24: 保存流程：1) 调用 `Excalidraw.exportToSvg()` 生成 SVG → `file:save-drawing-thumbnail`；2) 序列化 Excalidraw 数据为 JSON → `file:save-drawing`
- F-25: 编辑中每次变更 debounce 1s 自动保存（同 F-24 流程）

### [DrawingBlock] 删除

- F-26: 缩略图标签栏 Delete 按钮，红色文字
- F-27: 点击 Delete → `window.confirm("Delete this drawing? The .excalidraw file will also be removed.")` 确认对话框
- F-28: 确认后：1) 调用 `file:delete-drawing` 删除文件；2) 从编辑器移除该 block；3) block 消失动画（opacity 0 + scaleY 0，300ms transition）

### [DrawingBlock] 导出

- F-29: 标签栏 SVG 按钮 → 调用 `Excalidraw.exportToSvg()` 导出，通过 Electron 保存对话框选择保存位置
- F-30: 标签栏 PNG 按钮 → 调用 `Excalidraw.exportToBlob()` 导出 PNG，同上

### [DrawingBlock] Markdown 互转

- F-31: 画板 block 在 `blocksToMarkdownLossy` 时输出为 `![drawing](assets/drawing-NNN.excalidraw)\n\n`
- F-32: `tryParseMarkdownToBlocks` 解析 markdown 时，匹配 `![drawing](*.excalidraw)` 并创建 `drawing` block（`src` = 路径）
- F-33: 源码模式下可见 `![drawing](assets/drawing-001.excalidraw)` 文本

---

## ④ 测试点

### 创建与插入

- [ ] T-01 点击工具栏 ✏️ Drawing 按钮 → 光标下方插入画板 block，`assets/` 目录下出现 `drawing-001.excalidraw`，画板自动展开为编辑模式
- [ ] T-02 输入 `/drawing` 选择斜杠命令 → 同 T-01 效果
- [ ] T-03 已有 `drawing-002.excalidraw` 时再插入 → 新建 `drawing-003.excalidraw`（正确递增）
- [ ] T-04 `assets/` 目录不存在时插入画板 → 自动创建 `assets/` 目录后成功

### 缩略图模式

- [ ] T-05 打开含画板的笔记 → 画板以 SVG 缩略图显示，高度 300px，底部标签栏显示文件名和 "Saved"
- [ ] T-06 空白画板的缩略图 → 显示 ✏️ 图标 + "Empty drawing — click to start" 占位
- [ ] T-07 hover 画板 block → 蓝色边框 + 遮罩层 + "Click to edit" 按钮
- [ ] T-08 `.excalidraw` 文件被手动删除后打开笔记 → 显示 "Drawing file not found" 错误占位

### 展开编辑

- [ ] T-09 单击缩略图 → 画板展开为 Excalidraw 编辑器（450px 高），工具栏显示所有绘图工具
- [ ] T-10 在展开的画板中绘制矩形 → 矩形显示在画布上，工具栏矩形按钮高亮
- [ ] T-11 使用画笔工具自由绘制 → 笔迹实时显示
- [ ] T-12 添加文本框 → 可输入文字
- [ ] T-13 选择元素后拖拽 → 元素跟随移动
- [ ] T-14 `Cmd/Ctrl+Z` → 撤销上一步操作；`Cmd/Ctrl+Shift+Z` → 重做
- [ ] T-15 切换颜色后绘制 → 新元素使用选中颜色

### 收起与保存

- [ ] T-16 点击画板外部区域 → 画板收起为缩略图，缩略图反映最新绘制内容
- [ ] T-17 按 Escape 键 → 同 T-16
- [ ] T-18 点击 Close 按钮 → 同 T-16
- [ ] T-19 绘制内容后等待 1.5s → 标签栏状态从 "Saving..." 变为 "Saved"，`.excalidraw` 文件已更新
- [ ] T-20 收起后重新展开 → 之前绘制的内容完整保留

### 删除

- [ ] T-21 点击 Delete 按钮 → 弹出确认对话框
- [ ] T-22 确认删除 → 画板 block 从文档移除（带消失动画），`assets/` 下 `.excalidraw` 和 `.excalidraw.svg` 文件被删除
- [ ] T-23 取消删除 → 画板保持不变

### 导出

- [ ] T-24 点击 SVG 导出按钮 → 弹出保存对话框，保存后得到有效的 SVG 文件
- [ ] T-25 点击 PNG 导出按钮 → 弹出保存对话框，保存后得到有效的 PNG 文件

### Markdown 互转

- [ ] T-26 插入画板后切换到源码模式 → 可见 `![drawing](assets/drawing-001.excalidraw)` 文本
- [ ] T-27 源码模式手动写入 `![drawing](assets/drawing-001.excalidraw)`，切换到 WYSIWYG → 显示画板 block（需文件存在）
- [ ] T-28 含画板的笔记关闭后重新打开 → 画板 block 正常显示缩略图，点击可编辑
- [ ] T-29 删除画板后切换源码模式 → markdown 中对应 `![drawing](...)` 行已被移除

### 多画板

- [ ] T-30 一篇笔记中插入两个画板 → 两个画板独立显示，各自有独立文件（drawing-001、drawing-002）
- [ ] T-31 同时只能展开一个画板 → 展开第二个画板时，第一个自动收起并保存
