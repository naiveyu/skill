# ME-005 粘贴/拖拽插入图片 — spec.md

## ① 用户旅程

### 主流程 A：粘贴图片
1. 用户在 WYSIWYG 编辑器中编辑笔记，光标在某个位置
2. 用户截图或从网页复制图片到剪贴板
3. 用户按 `Cmd/Ctrl+V`
4. 编辑器在光标位置插入 loading 占位块
5. 主进程将图片保存到笔记同级 `assets/` 目录，命名 `paste-001.png`（递增）
6. 保存成功后，占位块替换为图片块，显示图片
7. 文件树中出现 `assets/` 目录和对应图片文件
8. 编辑器内容自动转换为 markdown：`![](assets/paste-001.png)`

### 主流程 B：拖拽图片
1. 用户从 Finder 拖拽一个或多个图片文件到编辑器区域
2. 编辑器显示拖拽覆盖层提示「释放以插入图片」
3. 用户释放鼠标
4. 后续同主流程 A 的步骤 4-8

### 异常流程
- 粘贴非图片内容（文本/文件路径）→ BlockNote 默认行为，不拦截
- 保存失败（磁盘满/权限问题）→ 移除占位块，不插入任何内容，console.error 记录
- 拖拽非图片文件（.pdf、.docx 等）→ 忽略，不处理

---

## ② 数据模型 + API

### IPC Channel（新增）

#### `file:save-image-from-clipboard`

从剪贴板读取图片并保存到指定目录。

```typescript
// Request
{
  channel: 'file:save-image-from-clipboard',
  args: [targetDir: string]  // 相对路径，如 "notes/assets"
}

// Response
string  // 保存后的相对路径，如 "notes/assets/paste-001.png"
//   如果剪贴板无图片，返回空字符串 ""
```

**命名逻辑**：
1. 读取 `targetDir` 下所有 `paste-*.png` 文件
2. 提取最大序号 N
3. 新文件命名 `paste-{(N+1).toString().padStart(3, '0')}.png`
4. 如果目录不存在，自动创建

#### `file:save-dropped-images`

保存拖拽的外部图片文件到指定目录。

```typescript
// Request
{
  channel: 'file:save-dropped-images',
  args: [absolutePaths: string[], targetDir: string]
}

// Response
string[]  // 保存后的相对路径数组
```

**命名逻辑**：同上递增序号规则。

### Preload API（新增）

```typescript
// preload/index.ts 新增
file: {
  // ...existing methods...
  saveImageFromClipboard(targetDir: string): Promise<string>
  saveDroppedImages(absolutePaths: string[], targetDir: string): Promise<string[]>
}
```

### BlockNote 配置变更

```typescript
// RichTextEditor.tsx — useCreateBlockNote 增加 uploadFile 选项
useCreateBlockNote({
  initialContent: undefined,
  trailingBlock: true,
  uploadFile: async (file: File) => {
    // 处理拖拽图片：将 File 写入 assets/ 目录，返回可访问的 URL
  }
})
```

### 文件存储

- 路径：`<笔记所在目录>/assets/paste-NNN.png`
- 格式：PNG（剪贴板图片统一 PNG；拖拽文件保留原格式但序号命名）
- 拖拽保留原扩展名：`paste-001.jpg`、`paste-002.webp`

---

## ③ UI 功能点

### [RichTextEditor] 粘贴图片

- F-01: WYSIWYG 模式下按 `Cmd/Ctrl+V`，如果剪贴板含图片数据，拦截默认粘贴行为
- F-02: 调用 `saveImageFromClipboard` 将图片保存到笔记同级 `assets/` 目录
- F-03: 保存成功后，在光标位置插入 BlockNote image block，`src` 为本地文件协议路径（`asset-protocol://` 或 `file://`）
- F-04: 编辑器 markdown 输出中生成相对路径：`![](assets/paste-001.png)`
- F-05: 如果剪贴板不含图片（纯文本/HTML），不拦截，走 BlockNote 默认粘贴

### [RichTextEditor] 拖拽图片

- F-06: 从 Finder/桌面拖拽图片文件到编辑器区域时，BlockNote 的 `uploadFile` 被触发
- F-07: `uploadFile` 内调用 `saveDroppedImages` 保存文件到 `assets/` 目录
- F-08: 返回本地文件 URL，BlockNote 自动插入 image block
- F-09: 仅处理图片文件类型（png/jpg/jpeg/gif/webp/bmp/avif），其他类型忽略

### [RichTextEditor] 图片块显示

- F-10: 图片块在编辑器中以 `max-width: 100%` 自适应显示
- F-11: 图片块 hover 时显示蓝色边框（`border: 2px solid #3b82f6`）— BlockNote 默认行为
- F-12: 图片块可被选中、删除（Backspace/Delete）— BlockNote 默认行为

### [文件树] assets 目录

- F-13: 图片保存后，文件树通过已有的 `chokidar` 监听自动刷新，显示 `assets/` 目录和新文件

---

## ④ 测试点

- [ ] T-01 在 WYSIWYG 编辑器中截图后按 Cmd+V → 光标位置出现图片块，`assets/` 目录下出现 `paste-001.png`
- [ ] T-02 连续粘贴两次截图 → `assets/` 目录下出现 `paste-001.png` 和 `paste-002.png`，编辑器中按顺序显示两个图片块
- [ ] T-03 粘贴普通文本（非图片）→ 正常粘贴文本，不触发图片保存逻辑
- [ ] T-04 从 Finder 拖拽一张 PNG 图片到编辑器 → 图片保存到 `assets/paste-001.png`，编辑器插入图片块
- [ ] T-05 从 Finder 拖拽一张 JPG 图片 → 保存为 `assets/paste-001.jpg`，保留原扩展名
- [ ] T-06 拖拽非图片文件（如 .pdf）到编辑器 → 不插入任何内容
- [ ] T-07 粘贴图片时 `assets/` 目录不存在 → 自动创建 `assets/` 目录后保存成功
- [ ] T-08 `assets/` 下已有 `paste-003.png` → 下次粘贴生成 `paste-004.png`（正确递增）
- [ ] T-09 图片保存后切换到源码模式 → markdown 中可见 `![](assets/paste-001.png)` 语法
- [ ] T-10 保存后的 markdown 文件重新打开 → 图片正常显示在 WYSIWYG 编辑器中
