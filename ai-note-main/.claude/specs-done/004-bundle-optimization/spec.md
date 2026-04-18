# 004 - 桌面应用包体积优化与启动加速

## 背景

当前桌面应用打包后体积 **658MB**（dmg ~216MB），其中 app.asar 386MB，node_modules 占 450MB。大量未使用或非必要的依赖被完整打包进应用，导致安装包过大、启动速度慢。

### 当前体积分布

| 部分 | 大小 |
|------|------|
| Electron Framework | 232MB（固定，不可优化） |
| app.asar | 386MB（node_modules 450MB） |
| **总计** | **658MB** |

### app.asar 中 Top 依赖

| 包 | 大小 | 类型 |
|----|------|------|
| react-icons | 80MB | 可替换 |
| @excalidraw | 45MB | 可懒加载 |
| pdfjs-dist | 35MB | 可懒加载 |
| @blocknote | 28MB | 核心依赖 |
| @emoji-mart | 27MB | 可精简 |
| @napi-rs | 25MB | 原生模块 |
| mermaid | 24MB | 可懒加载 |
| @mantine | 19MB | UI 库 |
| puppeteer-core + chromium-bidi | 19MB | 应排除 |
| better-sqlite3 | 12MB | 核心依赖 |

---

## 用户旅程

1. 用户下载安装包（目标：dmg < 120MB）
2. 用户启动应用，快速看到文件树 + 编辑器（目标：首屏 < 2s）
3. 用户按需使用画板/PDF/图表等高级功能时，对应模块才加载

---

## 优化方案

### Phase 1：依赖瘦身（减小安装包体积）

#### 1.1 替换 react-icons → lucide-react

- **收益**：80MB → ~2MB（节省 ~78MB）
- **做法**：
  - 全局搜索 `react-icons` 的 import，逐个替换为 `lucide-react` 对应图标
  - 如果 lucide-react 缺少某个图标，用内联 SVG 组件替代
  - 删除 `react-icons` 依赖

#### 1.2 排除 puppeteer-core + chromium-bidi

- **收益**：~19MB
- **做法**：
  - electron-builder 配置 `files` 中排除 `puppeteer-core` 和 `chromium-bidi`
  - 或将发布功能的依赖移到 `devDependencies`
  - 发布功能后续迁移为 Claude Code Skill（已在 MEMORY 中记录）

#### 1.3 electron-builder files 排除无用文件

- **收益**：预估 ~10-20MB
- **做法**：
  - 排除 `**/*.md`、`**/*.map`、`**/test/**`、`**/tests/**`、`**/__tests__/**`
  - 排除各包中的 `docs/`、`example/`、`examples/`

#### 1.4 @emoji-mart/data 精简

- **收益**：~20MB
- **做法**：
  - 使用自定义数据集，只保留常用表情分类
  - 或替换为更轻量的表情方案

### Phase 2：启动速度优化（懒加载大型模块）

#### 2.1 Excalidraw 画板懒加载

- **做法**：`React.lazy(() => import('@excalidraw/excalidraw'))` + `Suspense`
- 用户打开画板时才加载，首屏不加载

#### 2.2 pdfjs-dist 懒加载

- **做法**：PDF 预览组件改为 `React.lazy` 动态导入
- 用户打开 PDF 文件时才加载

#### 2.3 mermaid 懒加载

- **做法**：mermaid 渲染改为动态 `import('mermaid')`
- 编辑器遇到 mermaid 代码块时才加载

#### 2.4 首屏渲染优化

- 首屏只渲染：文件树 + 编辑器核心
- 延迟初始化：AI 面板、搜索、标签管理、设置

### Phase 3：进阶优化（可选）

#### 3.1 @mantine 按需引入

- 检查是否可以只引入使用到的组件，而非整个库

#### 3.2 @blocknote 评估替代方案

- 28MB 较大，评估是否有更轻量的编辑器可用（但涉及核心功能，谨慎评估）

---

## 测试点

### Phase 1 测试

- [ ] T-01 替换 react-icons 后，所有页面图标正常显示，无缺失或错位
- [ ] T-02 应用正常启动，无 Module not found 错误
- [ ] T-03 app.asar 体积 < 300MB
- [ ] T-04 dmg 安装包体积 < 150MB
- [ ] T-05 发布功能（如仍保留入口）在缺少 puppeteer-core 时给出友好提示而非崩溃

### Phase 2 测试

- [ ] T-06 应用启动后 2s 内显示文件树 + 编辑器（冷启动）
- [ ] T-07 打开画板功能，Excalidraw 正常加载和使用
- [ ] T-08 打开 PDF 文件，PDF 正常渲染
- [ ] T-09 编辑器中 mermaid 代码块正常渲染图表
- [ ] T-10 懒加载模块加载期间显示 loading 状态，无白屏

### 回归测试

- [ ] T-11 编辑器核心功能正常（创建/编辑/保存笔记）
- [ ] T-12 Git 功能正常（提交/推送/拉取）
- [ ] T-13 AI 助手功能正常
- [ ] T-14 搜索功能正常
- [ ] T-15 标签管理功能正常

---

## 预期收益

| 指标 | 当前 | Phase 1 后 | Phase 2 后 |
|------|------|-----------|-----------|
| app 体积 | 658MB | ~500MB | ~500MB（体积不变，加载更快） |
| app.asar | 386MB | ~260MB | ~260MB |
| dmg 大小 | 216MB | ~140MB | ~140MB |
| 首屏时间 | 未测量 | 不变 | < 2s |
