# INote 多 Agent 自动化开发流水线 — 技术设计文档

**版本**: v1.0
**日期**: 2026-02-20
**状态**: 设计阶段（待实施）

---

## 1. 背景与目标

### 1.1 问题

INote 是一个包含 4 个子应用的 monorepo（desktop/website/mobile/server），目前所有开发、测试、部署全为手动操作：
- 没有 CI/CD
- 没有测试文件（vitest/jest 已安装但未配置）
- 没有 lint/format 自动化
- 部署依赖手动执行 `deploy.sh`

每次迭代需要开发者：手动编码 → 手动测试 → 手动部署，耗时且容易遗漏步骤。

### 1.2 目标

**用户输入一句功能描述，系统自动完成开发、测试、部署，无需人工干预。**

```
输入：claude --agent orchestrator "在官网 footer 添加用户反馈表单"

自动执行：
  1. 创建 feature 分支
  2. 实现功能代码
  3. 运行类型检查 + 构建 + 测试
  4. 测试失败 → 自动修复 → 重新测试
  5. 合并到 main → 部署到生产 → 健康检查 → 打 tag

输出：功能上线报告
```

---

## 2. 整体架构

### 2.1 技术选型

基于 **Claude Code Custom Subagents**（`.claude/agents/*.md`）实现。每个 Agent 是一个 Markdown 文件，包含：
- YAML frontmatter：模型选择、权限配置、工具限制、hooks 定义
- 系统提示：Agent 的职责、规范、输出格式

Agent 之间通过 Orchestrator 的 `Task` 工具串联，形成流水线。

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                    用户入口（CLI）                    │
│  claude --agent orchestrator "功能描述"              │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│                   Orchestrator Agent                 │
│                                                     │
│  职责：解析需求 → 创建分支 → 调度 → 收集结果 → 报告  │
│  模型：Opus                                          │
│  工具：Task, Read, Grep, Glob, Bash                  │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
       │ Task("developer")    │ Task("tester")  Task("releaser")
       │                      │
       ▼                      ▼
┌─────────────┐    ┌─────────────────┐    ┌───────────────┐
│  Developer  │    │     Tester      │    │   Releaser    │
│   Agent     │◄───│     Agent       │    │    Agent      │
│             │    │                 │    │               │
│ 实现功能代码 │    │ 类型检查+构建   │    │ 合并+部署+tag │
│ 更新文档    │    │ 编写+运行测试   │    │ 健康检查      │
│ 提交代码    │    │ 返回结构化结果  │    │ 推送到远程    │
│             │    │                 │    │               │
│ 模型：Opus  │    │ 模型：Opus      │    │ 模型：Opus    │
└─────────────┘    └─────────────────┘    └───────────────┘
       ▲                      │
       │   fail（最多3轮）    │
       └──────────────────────┘
```

### 2.3 控制流详述

```
START
  │
  ├─ Orchestrator 读取 CLAUDE.md + technical-design.md
  ├─ 解析需求 → 确定涉及的 apps（desktop/website/server/mobile）
  ├─ git checkout -b feat/<slug>
  │
  ├─ [循环 retry_count=0..3]
  │    ├─ Task("developer")  → 实现功能，返回 { files_changed, commits }
  │    ├─ Task("tester")     → 验证，返回 { status, errors }
  │    ├─ IF status == "pass" → BREAK
  │    └─ IF status == "fail" AND retry < 3 → retry_count++, 继续循环
  │
  ├─ IF retry_count == 3 AND still failing → ABORT，输出失败报告
  │
  ├─ Task("releaser") → 合并+部署+健康检查，返回 { deployments, tag }
  │
  └─ 输出最终报告给用户
END
```

---

## 3. Agent 详细设计

### 3.1 Orchestrator Agent

**文件路径**: `.claude/agents/orchestrator.md`

**模型**: `claude-opus-4-6`
**权限**: `bypassPermissions`
**可用工具**: `Task`, `Read`, `Grep`, `Glob`, `Bash`

**系统提示核心逻辑**:

```markdown
你是 INote 项目的开发流水线编排器。

收到功能描述后，按以下步骤执行：

1. 读取 CLAUDE.md 和 docs/technical-design.md 了解项目全貌
2. 分析功能描述，判断涉及哪些 apps：
   - desktop（Electron）、website（Next.js）、server（Fastify）、mobile（Expo）
   - shared-types（类型变更时）
3. 生成 feature slug（英文小写中划线，如 "website-feedback-form"）
4. 执行 `git checkout -b feat/<slug>`
5. 调用 Developer Agent（Task），传入完整的功能规格
6. 调用 Tester Agent（Task），传入变更文件列表和涉及的 apps
7. 若 Tester 返回 fail：
   - retry_count < 3：调用 Developer Agent 传入失败详情修复，再次测试
   - retry_count >= 3：输出失败报告，保留 feature 分支等待人工介入
8. 若 Tester 返回 pass：调用 Releaser Agent
9. 汇总所有结果，输出最终报告
```

**输出格式（最终报告）**：
```
## 功能实现完成

**功能**: <功能名称>
**分支**: feat/<slug>
**耗时**: <开始到结束>

### 开发
- 新增文件: N 个
- 修改文件: N 个
- 提交记录: <commit hashes>

### 测试
- TypeScript 类型检查: ✓ 通过
- 构建验证: ✓ 通过（website, server）
- 单元测试: ✓ 12/12 通过（新增 3 个测试文件）

### 部署
- Website: ✓ https://sspprriinngg.cn（200 OK）
- Server:  ✓ https://sspprriinngg.cn/api/health（200 OK）
- Git Tag: v0.2.0

**状态: 全部完成，功能已上线**
```

---

### 3.2 Developer Agent

**文件路径**: `.claude/agents/developer.md`

**模型**: `claude-opus-4-6`
**权限**: `bypassPermissions`
**可用工具**: `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`

**Hooks**:
- `Stop` hook → `developer-stop-check.sh`：检查 git 工作区是否干净，有未提交代码则阻止结束

**开发规范（写入系统提示）**:

```markdown
实现功能前，必须先读取以下文件：
- CLAUDE.md（项目规范）
- docs/technical-design.md（架构）
- 涉及 app 的 apps/*/CLAUDE.md

代码规范：
- 文件命名：kebab-case
- 代码注释：英文
- Commit message：英文，conventional commits 格式

Desktop 开发模式（必须遵守）：
- 新功能需要：① IPC Handler 文件 → ② Service 文件 → ③ Preload 暴露 → ④ Store → ⑤ 组件
- IPC handlers 在 apps/desktop/src/main/ipc/ 下注册
- Store 使用 Zustand + immer 模式

架构变更要求：
- 若功能涉及新的模块/服务/IPC通道，必须同步更新 docs/technical-design.md
- 若功能有新的共享类型，更新 packages/shared-types/src/

完成后执行：
- git add <相关文件>
- git commit -m "feat: <英文描述>"

返回 JSON 结果：
{
  "files_changed": ["apps/server/src/routes/feedback.ts", ...],
  "commits": ["abc1234 feat: add feedback endpoint"],
  "apps_affected": ["server", "website"],
  "arch_changed": false
}
```

---

### 3.3 Tester Agent

**文件路径**: `.claude/agents/tester.md`

**模型**: `claude-opus-4-6`
**权限**: `bypassPermissions`
**可用工具**: `Read`, `Write`, `Edit`, `Bash`, `Grep`, `Glob`

**Hooks**:
- `Stop` hook → `tester-stop-check.sh`：若新代码未编写测试则阻止结束

**验证流程（写入系统提示）**:

```markdown
按以下顺序验证，任何步骤失败立即记录并继续（不提前退出，收集完整错误）：

步骤 1：TypeScript 类型检查
  对每个涉及的 app 运行：
  - apps/desktop: cd apps/desktop && npx tsc --noEmit
  - apps/server:  cd apps/server  && npx tsc --noEmit
  - apps/website: cd apps/website && npx tsc --noEmit

步骤 2：构建验证
  - website: pnpm build:website
  - server:  pnpm build:server
  - desktop: pnpm build（注意：需要在非 VS Code 环境，先 unset ELECTRON_RUN_AS_NODE）

步骤 3：编写单元测试
  对每个新增/修改的 service 或 store 文件，在对应的 __tests__/ 目录下创建测试文件。
  - 测试必须有实际意义，覆盖核心逻辑和边界情况
  - 不允许写 `expect(true).toBe(true)` 的占位测试
  - 测试文件路径规范：
    - Desktop service: apps/desktop/src/main/services/__tests__/<name>.test.ts
    - Desktop store:   apps/desktop/src/renderer/src/stores/__tests__/<name>.test.ts
    - Server route:    apps/server/src/__tests__/<name>.test.ts
    - Server service:  apps/server/src/services/__tests__/<name>.test.ts

步骤 4：运行所有测试
  pnpm test（从项目根目录，cascade 到所有 workspace）

返回 JSON 结果：
{
  "status": "pass",
  "type_check": { "status": "pass", "errors": [] },
  "build": { "status": "pass", "apps": ["website", "server"] },
  "tests": { "total": 12, "passed": 12, "failed": 0, "errors": [] },
  "new_test_files": ["apps/server/src/__tests__/feedback.test.ts"]
}
```

---

### 3.4 Releaser Agent

**文件路径**: `.claude/agents/releaser.md`

**模型**: `claude-opus-4-6`
**权限**: `bypassPermissions`
**可用工具**: `Bash`, `Read`, `Grep`, `Glob`

**Hooks**:
- `PreToolUse` hook → `releaser-bash-guard.sh`：阻止 `rm -rf`、`git push --force`、`git reset --hard`

**发布流程（写入系统提示）**:

```markdown
按以下顺序执行：

步骤 1：合并 feature 分支
  git checkout main
  git merge --no-ff feat/<slug> -m "feat: <功能描述>"

步骤 2：条件部署
  IF apps_affected 包含 "website" OR "server":
    执行 ./deploy.sh
    （自动构建 website + server，rsync 到 sspprriinngg.cn，PM2 重启）

  IF apps_affected 包含 "desktop":
    执行 pnpm dist:mac（生成 DMG 安装包到 apps/desktop/dist/）
    注意：Windows 版本需要在 Windows 机器上单独构建

步骤 3：健康检查
  IF website/server 已部署：
    curl -s -o /dev/null -w "%{http_code}" https://sspprriinngg.cn
    curl -s https://sspprriinngg.cn/api/health
    均需返回 200 才算部署成功

步骤 4：版本 tag
  读取 package.json 中的 version
  git tag -a v<version> -m "release: <功能描述>"

步骤 5：推送
  git push origin main --tags

返回 JSON 结果：
{
  "status": "success",
  "merged_branch": "feat/website-feedback-form",
  "deployments": {
    "website": { "deployed": true, "health": "200", "url": "https://sspprriinngg.cn" },
    "server":  { "deployed": true, "health": "200", "url": "https://sspprriinngg.cn/api/health" },
    "desktop": { "built": false, "reason": "not affected" }
  },
  "tag": "v0.2.0",
  "pushed": true
}
```

---

## 4. Hooks 设计

所有 hook 脚本位于 `.claude/hooks/`，通过 stdin 接收 JSON 数据，通过 stdout 返回控制信号。

### 4.1 `developer-stop-check.sh`

触发时机：Developer Agent 结束前

```bash
#!/bin/bash
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')

# 防止无限循环
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

cd "$(dirname "$0")/../.."

# 检查 git 工作区
UNCOMMITTED=$(git status --porcelain)
if [ -n "$UNCOMMITTED" ]; then
  echo '{"decision":"block","reason":"有未提交的代码变更，请先 git add 和 git commit 所有变更：\n'"$UNCOMMITTED"'"}'
  exit 0
fi

exit 0
```

**效果**：Developer Agent 若忘记提交代码，会被阻止退出，必须完成提交。

### 4.2 `tester-stop-check.sh`

触发时机：Tester Agent 结束前

```bash
#!/bin/bash
INPUT=$(cat)
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')

if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

cd "$(dirname "$0")/../.."

# 检查本次是否新增了测试文件
NEW_TESTS=$(git diff --name-only main | grep -cE '\.test\.|__tests__' || true)

if [ "$NEW_TESTS" -eq 0 ]; then
  LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""')
  if echo "$LAST_MSG" | grep -q '"status".*"pass"'; then
    echo '{"decision":"block","reason":"没有为新代码编写测试文件。必须在 __tests__/ 目录下为新增/修改的 service 或 store 创建单元测试。"}'
    exit 0
  fi
fi

exit 0
```

**效果**：Tester Agent 若未编写测试就声称通过，会被阻止。

### 4.3 `releaser-bash-guard.sh`

触发时机：Releaser Agent 执行任意 Bash 命令前

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# 阻止破坏性命令
if echo "$COMMAND" | grep -qE '(rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|git\s+clean\s+-f|drop\s+table)'; then
  echo '{"decision":"block","reason":"自动化发布中禁止执行破坏性命令：'"$COMMAND"'"}'
  exit 0
fi

exit 0
```

**效果**：防止发布过程中因 AI 误判执行删除数据库、强制推送等危险操作。

---

## 5. 前置基础设施

Agent 流水线依赖以下基础设施，需在实施 Agent 前先搭建。

### 5.1 Vitest 测试配置

目前 vitest 已安装在 desktop，但没有配置文件和测试文件。

**Desktop** — 新建 `apps/desktop/vitest.config.ts`：
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
```

**Server** — 新建 `apps/server/vitest.config.ts` + 安装依赖：
```bash
pnpm --filter @ai-note/server add -D vitest
```

更新 `apps/server/package.json`：
```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

**Seed 测试示例**（建立代码模式供 Tester Agent 参考）：

`apps/server/src/__tests__/health.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'

describe('Health endpoint', () => {
  it('should return 200 with status ok', async () => {
    const app = Fastify()
    app.get('/api/health', () => ({ status: 'ok' }))
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).status).toBe('ok')
  })
})
```

### 5.2 ESLint + Prettier 配置

根目录新建 `eslint.config.js`（ESLint 9 flat config）：
```js
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

export default [
  { ignores: ['**/dist/**', '**/out/**', '**/.next/**', '**/node_modules/**'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
```

根目录新建 `.prettierrc`：
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 5.3 GitHub Actions CI

**`.github/workflows/ci.yml`** — 第二道防线，推送到 main 时独立验证：

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript check (server)
        run: cd apps/server && npx tsc --noEmit

      - name: TypeScript check (website)
        run: cd apps/website && npx tsc --noEmit

      - name: Build website
        run: pnpm build:website

      - name: Build server
        run: pnpm build:server

      - name: Run tests
        run: pnpm test
```

---

## 6. 使用方式

### 6.1 完整流水线（最常用）

```bash
# 基本用法
claude --agent orchestrator "在官网 footer 添加用户反馈表单，发送到 server 的 /api/feedback"

# 复杂功能
claude --agent orchestrator "给 desktop 添加 AI 摘要功能：选中文本后右键，调用 AI 生成摘要插入到笔记末尾"

# 仅涉及 server
claude --agent orchestrator "给认证 server 添加密码重置功能，发送邮件验证码"
```

### 6.2 单独调用某个 Agent

```bash
# 只开发，不测试不部署（适合探索性开发）
claude --agent developer "在 apps/server/src/routes/ 下添加 /api/stats 路由，返回注册用户数量"

# 只测试当前分支（适合开发完后手动触发测试）
claude --agent tester "验证 feat/ai-summary 分支的所有变更"

# 只部署（适合修复 bug 后快速上线）
claude --agent releaser "将 main 分支的 website 和 server 部署到生产环境"
```

### 6.3 期望的输出示例

```
🚀 开始执行：在官网 footer 添加用户反馈表单

📋 需求分析
  涉及 apps：website, server
  Feature 分支：feat/website-feedback-form

🔨 [1/3] Developer Agent 开始工作...
  ✓ 读取架构文档
  ✓ 创建 apps/server/src/routes/feedback.ts（POST /api/feedback）
  ✓ 创建 apps/website/src/components/sections/FeedbackForm.tsx
  ✓ 修改 apps/website/src/app/page.tsx（引入组件）
  ✓ 更新 docs/technical-design.md
  ✓ git commit: "feat: add feedback form and server endpoint"

🧪 [2/3] Tester Agent 开始验证...
  ✓ TypeScript 类型检查（website, server）
  ✓ 构建验证（website: 2.3s, server: 0.8s）
  ✓ 编写测试：apps/server/src/__tests__/feedback.test.ts（5 cases）
  ✓ 编写测试：apps/website/src/__tests__/FeedbackForm.test.tsx（3 cases）
  ✓ 运行测试：8/8 通过

🚀 [3/3] Releaser Agent 开始发布...
  ✓ 合并 feat/website-feedback-form → main
  ✓ 构建并上传 website（rsync 到 sspprriinngg.cn）
  ✓ 构建并上传 server（PM2 重启完成）
  ✓ 健康检查：website 200 ✓, API 200 ✓
  ✓ 创建 tag: v0.2.0
  ✓ git push origin main --tags

✅ 完成！
  功能"官网反馈表单"已上线：https://sspprriinngg.cn
  新增代码：4 个文件，2 个测试文件，8 个测试用例全通过
```

---

## 7. 约束与已知限制

| 限制 | 说明 | 缓解措施 |
|------|------|----------|
| Desktop 构建 | Electron 需要 macOS/Windows 本机构建，不能在 CI Linux 环境中构建 | CI 仅做类型检查，分发包在本机用 `pnpm dist:mac` 构建 |
| Mobile 测试 | Expo 需要 Android 模拟器，Agent 无法启动 | 仅做 TypeScript 检查，跳过运行时测试 |
| SSH 访问 | `deploy.sh` 需要 SSH 密钥访问 `root@sspprriinngg.cn` | 运行 Agent 的机器需配置好 SSH 密钥 |
| 子 Agent 不能嵌套 | Claude Code subagent 不能再 spawn subagent | 已在设计中规避，Orchestrator 是唯一调度方 |
| 并行限制 | Agent 链是串行的（dev → test → release） | 本项目流程本身就是串行依赖，无需并行 |
| 费用 | 全 Opus 每次完整流水线约消耗大量 token | 可后期按功能复杂度选择 Opus/Sonnet |

---

## 8. 实施计划

### Phase 0：基础设施（优先实施，Agent 依赖此步）

- [ ] 配置 `apps/desktop/vitest.config.ts`
- [ ] 配置 `apps/server/vitest.config.ts` + 安装 vitest
- [ ] 编写 2-3 个 seed 测试建立代码模式
- [ ] 确认 `pnpm test` 在根目录可运行
- [ ] 创建根目录 `eslint.config.js` + `.prettierrc`
- [ ] 确认 `pnpm lint` 在根目录可运行
- [ ] 创建 `.github/workflows/ci.yml`

### Phase 1：Agent 定义

- [ ] 创建 `.claude/agents/developer.md`
- [ ] 创建 `.claude/agents/tester.md`
- [ ] 创建 `.claude/agents/releaser.md`
- [ ] 创建 `.claude/agents/orchestrator.md`

### Phase 2：Hooks

- [ ] 创建 `.claude/hooks/developer-stop-check.sh`
- [ ] 创建 `.claude/hooks/tester-stop-check.sh`
- [ ] 创建 `.claude/hooks/releaser-bash-guard.sh`
- [ ] 确保 hook 脚本有执行权限（`chmod +x`）

### Phase 3：端到端验证

用一个小功能验证整个流水线：
```bash
claude --agent orchestrator "给 server 添加 GET /api/version 接口，返回 package.json 中的版本号"
```

验证检查点：
1. ✓ feature 分支被创建
2. ✓ 代码被正确实现并提交
3. ✓ 类型检查和构建通过
4. ✓ 有新测试文件，测试通过
5. ✓ 分支合并到 main
6. ✓ `curl https://sspprriinngg.cn/api/version` 返回正确版本号
7. ✓ 全程无人工干预

---

## 9. 新增文件清单

```
.claude/
├── agents/
│   ├── orchestrator.md           # 新建
│   ├── developer.md              # 新建
│   ├── tester.md                 # 新建
│   └── releaser.md               # 新建
├── hooks/
│   ├── developer-stop-check.sh   # 新建
│   ├── tester-stop-check.sh      # 新建
│   └── releaser-bash-guard.sh    # 新建
└── settings.json                 # 更新（暂无变更，hooks 在 agent frontmatter 中）

.github/
└── workflows/
    └── ci.yml                    # 新建

apps/desktop/
└── vitest.config.ts              # 新建

apps/server/
└── vitest.config.ts              # 新建

eslint.config.js                  # 新建（根目录）
.prettierrc                       # 新建（根目录）
.prettierignore                   # 新建（根目录）
```

**修改的现有文件**：
- `apps/server/package.json` — 添加 vitest devDependency + test 脚本
- `docs/technical-design.md` — 添加 Agent 流水线章节（实施后同步更新）
- `CLAUDE.md` — 添加 Agent 使用说明（实施后同步更新）
