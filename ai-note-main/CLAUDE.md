# AI-Note Monorepo

## 项目简介

AI-Note 产品 monorepo，包含桌面应用、官网、移动端等子项目。

## 项目结构

```
ai-note/
├── apps/
│   ├── desktop/                ← Electron 桌面应用（React + TypeScript + Zustand）
│   │   └── src/
│   │       ├── main/           ← 主进程
│   │       │   ├── ipc/        ← IPC handlers（file, git, search, tag, config, workspace）
│   │       │   ├── services/   ← 服务层（FileService, GitService, SearchService, DbService…）
│   │       │   └── utils/      ← logger
│   │       ├── preload/        ← 预加载脚本（electronAPI 安全桥接）
│   │       ├── renderer/src/   ← React UI
│   │       │   ├── components/ ← ai, auth, editor, file-tree, git, layout, search, tags…
│   │       │   ├── stores/     ← Zustand stores
│   │       │   ├── i18n/       ← 国际化（中/英）
│   │       │   └── styles/     ← globals.css
│   │       └── shared/types/   ← 跨进程共享类型
│   ├── website/                ← 营销官网（Next.js 14 SSG + Tailwind + framer-motion）
│   │   └── src/
│   │       ├── app/            ← App Router 页面
│   │       ├── components/     ← sections, layout, ui, icons
│   │       ├── i18n/           ← 轻量 React Context 国际化
│   │       └── lib/            ← 工具函数
│   ├── mobile/                 ← Android 移动应用（Expo SDK 52 + React Native Paper + Zustand）
│   │   └── src/
│   │       ├── components/     ← auth, editor, file-tree, git, search, tags
│   │       ├── services/       ← 服务层（直接调用，无 IPC）
│   │       ├── stores/         ← Zustand stores（同 desktop 模式）
│   │       └── theme/          ← Material Design 3 主题
│   └── server/                 ← 认证服务器（Fastify 5 + sql.js + JWT）
│       └── src/
│           ├── routes/         ← API 路由
│           ├── services/       ← 业务逻辑
│           ├── db/             ← 数据库
│           └── plugins/        ← Fastify 插件
├── packages/
│   └── shared-types/           ← 共享类型和常量（跨平台复用）
│       └── src/models/
├── docs/                       ← 产品文档
│   ├── prd.md                  ← 产品需求文档（唯一需求来源）
│   ├── technical-design.md     ← 技术设计文档
│   ├── deploy-guide.md         ← 部署指南
│   └── ...
├── .claude/
│   ├── agents/                 ← Agent 定义（test, developer, growth）
│   ├── commands/               ← Skill 命令（/implement, /commit, /deploy…）
│   ├── hooks/                  ← 钩子脚本（安全检查）
│   ├── specs/                  ← 进行中的功能 spec
│   └── specs-done/             ← 已上线功能归档（只读）
├── deploy/                     ← 部署配置（nginx, PM2, setup 脚本）
├── scripts/                    ← 运营/调试脚本
└── .github/workflows/          ← CI/CD
```

## 开发命令

```bash
pnpm install          # 安装所有依赖
pnpm dev              # 启动桌面应用开发服务器
pnpm build            # 构建桌面应用
pnpm dev:website      # 启动官网开发（localhost:3001）
pnpm build:website    # 构建静态官网
pnpm dev:mobile       # 启动移动端 Expo 开发服务器
pnpm android          # 在 Android 设备/模拟器上运行
pnpm dev:server       # 启动 Auth 服务器开发模式（localhost:3456）
pnpm build:server     # 构建 Auth 服务器
pnpm start:server     # 启动 Auth 服务器（生产模式）
pnpm lint             # 全仓库 lint
pnpm test             # 全仓库测试
```

## 权限配置

- 允许在项目目录下执行所有 bash 命令
- 允许读写项目目录下的所有文件
- 允许执行 git 操作（add, commit, push, pull, branch, merge 等）
- 允许安装和管理 pnpm 依赖
- 允许启动开发服务器和构建项目
- 允许执行测试命令

## 开发规范

- 使用中文进行沟通和文档编写
- 代码注释使用英文
- Git commit message 使用英文
- 文件和目录命名使用 kebab-case
- **架构变更时必须同步更新 `docs/technical-design.md`**（包括目录结构、模块设计、依赖关系、构建配置等）

## 截图规则

- 所有浏览器截图分辨率不超过 1920x1080
- 截图后如果宽或高超过 2000px，先用 `sips --resampleWidth 1600 <file>` 或 `convert <file> -resize 1600x <file>` 压缩后再使用
- 尽量减少截图次数，避免触发多图片尺寸限制

## 环境要求

- Node.js >= 18
- pnpm >= 8
- VS Code 运行时需 `unset ELECTRON_RUN_AS_NODE`

## AI-Native 开发工作流

本仓库采用 **AI-Native 工程范式**：所有可复用的能力、流程约束和领域知识，均以 AI 可消费的形式沉淀。

产品需求见 `docs/prd.md`，功能细节见 `.claude/specs/`。

### 工作流程

```
需求讨论（Plan Mode）→ 更新 docs/prd.md → HTML 原型（确认交互）→ 补写 spec.md（功能点+测试用例）→ 等确认 → 写代码 → 测试 Agent 自动验收
```

### 阶段门控

每个阶段有明确退出标准，不能跳步：

| 阶段       | 做什么                                                                                                                                                                                                                                                        | 退出标准                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Plan Mode  | 把想法聊清楚，重点是把「不做什么」说清楚，防止范围蔓延                                                                                                                                                                                                        | docs/prd.md 更新完毕，无待确认问题 |
| HTML 原型  | 交互验证，走完所有页面跳转、操作流程、边界状态                                                                                                                                                                                                                | 用户确认原型没问题                 |
| spec.md    | **基于已确认的原型**，补写：数据模型+API、UI 功能点逐条（含样式规格）、测试用例逐条                                                                                                                                                                           | 用户确认 spec.md 没问题            |
| 写代码     | **严格对照 spec.md 的 UI 功能点逐条实现**，不得自行发挥，不得遗漏                                                                                                                                                                                             | 测试用例全部通过                   |
| 本机测试   | **编码完成后必须在本机实际测试**，能自动化测试的必须自己测（Puppeteer 截图 + 点击），不能只靠编译通过或 API curl。测试必须包含：① UI 视觉验证（截图检查布局、状态显示）② 点击功能测试（模拟用户操作按钮、表单等）③ 数据验证（检查数据库、API 返回值是否正确） | 三项全部通过                       |
| 测试 Agent | 自动运行 `.claude/agents/test-agent.md`，逐条执行测试用例                                                                                                                                                                                                     | 测试报告全部通过                   |

### spec.md 必须包含的四个部分

**① 用户旅程** — 主流程的步骤序列

**② 数据模型 + API** — 字段定义、接口 request/response

**③ UI 功能点**（来自 prototype.html，逐页、逐组件展开）

每条格式：

```
- [组件/页面] 描述：具体交互或样式规格
  示例：- [Nav] Logo：`AI-Note` 主色 #3b82f6，Inter 18px
```

规格要写到可以直接写代码的粒度：

- 颜色用 hex 或 CSS 变量名 / Tailwind class
- 尺寸写 px 或 Tailwind class
- 交互写触发条件 + 结果（如：点击展开 → border 变 accent-border）
- 状态枚举写全（默认态/激活态/禁用态/loading态/空态）

**④ 测试点**（基于 UI 功能点一一对应）

每条格式：

```
- [ ] [测试点 ID] 操作描述 → 预期结果
  示例：- [ ] T-01 点击「新建笔记」按钮 → 文件树出现新条目，编辑器打开空白笔记
```

### 文件组织

```
.claude/
├── agents/
│   ├── test-agent.md         ← 测试 Agent（开发完成后自动执行）
│   ├── developer-agent.md    ← 开发者 Agent（编码阶段）
│   └── growth-agent.md       ← 增长运营 Agent
├── commands/
│   ├── implement.md          ← /implement 触发完整工作流
│   ├── test-feature.md       ← /test-feature 执行测试
│   ├── commit.md             ← /commit 提交代码
│   ├── deploy.md             ← /deploy 部署到生产
│   ├── growth.md             ← /growth 自动增长运营
│   └── xhs-publish.md        ← /xhs-publish 小红书发布
├── hooks/
│   ├── developer-stop-check.sh
│   ├── releaser-bash-guard.sh
│   └── tester-stop-check.sh
├── specs/                    ← 进行中的功能 spec
│   └── NNN-功能名/
│       ├── spec.md           ← 四个部分：用户旅程、数据模型+API、UI功能点、测试点
│       └── prototype.html    ← 可交互原型（UI功能点的来源）
└── specs-done/               ← 已上线功能归档（只读，完成后从 specs/ 移入）
```

### Agent 行为规则

1. **不能跳步** — 新功能必须先进 Plan Mode 讨论，不能直接写代码
2. **不能自行假设需求** — 需求不清时必须停下来问用户，不能猜
3. **不能绕过 PRD** — 任何产品决策的变更都要先更新 docs/prd.md
4. **prototype.html 是 UI 唯一真相** — spec.md UI 功能点必须完整提取自原型，不得遗漏，不得自行发挥
5. **spec.md 写完必须人工确认** — 四个部分写完后，等用户确认再开始写代码
6. **测试点是验收唯一标准** — 开发完成后必须逐条执行，全部通过才算完成
7. **完成归档** — 功能上线后，将 spec 目录移到 `.claude/specs-done/`
8. **踩坑即记录** — 遇到问题及时更新本文件的「踩坑记录」
9. **需求变了先改 PRD，再同步 spec，最后改代码**
10. **AI 能做的全部 AI 做** — 测试阶段能自动化的必须自己跑（启动应用、截图、验证文件），实在做不了才求助用户

### 原则

- **docs/prd.md 是唯一需求来源** — 有歧义改 PRD，不直接改代码或原型
- **prototype.html 是 UI 唯一真相** — spec.md UI 功能点必须完整提取自原型，不得遗漏
- **测试点是验收唯一标准** — 开发完成后必须逐条执行，全部通过才算完成
- 原型发现问题 → 改 PRD，不直接改原型
- 写代码时发现需求不清 → 停下来问，不自行假设
- 需求变了先改 PRD，再同步 spec，最后改代码

## 踩坑记录

### 原型文件路径
- 给用户原型文件时，必须使用**绝对路径**，方便直接在浏览器打开
- 格式示例：`/Users/bytedance/self-project/ai-note/.claude/specs/NNN-功能名/prototype.html`
