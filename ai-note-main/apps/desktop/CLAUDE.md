# INote Desktop

## 项目简介
INote 桌面应用，本地优先的笔记与文件管理工具，内置 Git 版本控制。

## 技术栈
- Electron 33 + electron-vite
- React 18 + TypeScript + Zustand
- Milkdown (WYSIWYG) + CodeMirror 6 (源码编辑)
- isomorphic-git + better-sqlite3 + FlexSearch
- Tailwind CSS 3

## 开发命令
```bash
pnpm dev              # 启动 Electron 开发模式（需 unset ELECTRON_RUN_AS_NODE）
pnpm build            # 构建应用
pnpm preview          # 预览构建结果
pnpm test             # 运行 Vitest 测试
pnpm rebuild          # 重新编译原生模块（better-sqlite3）
```

## 目录结构
```
src/
├── main/             # 主进程
│   ├── index.ts      # 入口（BrowserWindow + 生命周期）
│   ├── ipc/          # IPC handlers（file, git, search, tag, config, workspace）
│   ├── services/     # 服务层（FileService, GitService, SearchService, DbService 等）
│   └── utils/        # logger
├── preload/          # 预加载脚本（electronAPI 安全桥接）
├── renderer/         # React UI
│   └── src/
│       ├── components/  # layout, editor, file-tree, search, tags, git, common
│       ├── stores/      # Zustand stores（workspace, file, editor, search, tag, git, settings）
│       ├── i18n/        # 国际化（中文/英文）
│       └── styles/      # globals.css
└── shared/           # 跨进程共享（types/ipc.ts, constants.ts）
```

## 架构要点
- **进程模型**: Main (Node.js) ↔ Preload (桥接) ↔ Renderer (React)
- **安全**: contextIsolation + 白名单 IPC channel + 路径校验
- **版本控制**: `saveVersion()` 更新 front matter updated 时间戳确保每次提交有实际变更
- **原生模块**: `better-sqlite3` 需要 `electron-rebuild` 编译为 Electron Node 版本

## 踩坑记录

### BlockNote 自定义 Block
- `createReactBlockSpec()` 返回的是**工厂函数**，不是 BlockSpec 本身。在 `BlockNoteSchema.create({ blockSpecs })` 中必须调用它：`drawing: DrawingBlock()`，不能 `drawing: DrawingBlock`
- `SuggestionMenuController` 的 `getItems` prop 必须返回 `Promise<T[]>`（async 函数），不能返回同步数组
- 自定义 slash menu item 的 `group` 不要与默认 group 同名（如 "Media"），否则 React key 冲突

### Excalidraw 集成
- Excalidraw 是函数组件，不接受 ref。获取 API 需用 `excalidrawAPI` 回调 prop，不能用 `ref`
- 必须导入 `@excalidraw/excalidraw/index.css`，否则工具栏和画布布局完全失效
- CSP 需要允许：`font-src https:`（外部字体）、`connect-src https:`（网络请求）、`worker-src blob:`、`script-src blob:`

### 调试技巧
- `pnpm dev` 启动后 Vite HMR 自动热更新，修改渲染器代码后无需重启 Electron
- **复用已有 Electron 实例**：调试时如果已有 `pnpm dev` 在运行，直接修改文件让 HMR 生效即可，不要 kill 再重新启动。只有修改了主进程代码（`src/main/`）才需要重启

## 相关文档
- 产品需求：`docs/prd.md`
- 技术设计：`docs/technical-design.md`
