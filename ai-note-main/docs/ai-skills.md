# AI Skill 体系设计文档

本文档描述 INote 项目中的 AI Skill 机制：设计原则、目录结构、加载流程、编写规范，以及未来 Sub-agent 扩展方向。

---

## 1. 设计目标

| 目标 | 说明 |
|------|------|
| **可维护** | Skill 逻辑集中在 `docs/` 目录，版本控制可追踪 |
| **可复用** | 任何支持 Bash + 图片读取的 AI（Claude、Gemini、GPT-4o 等）均可执行 |
| **视觉驱动** | 优先通过截图分析判断页面状态，而非依赖脆弱的 CSS 选择器 |
| **可扩展** | 支持 Sub-agent 拆分，复杂任务可分解为多个协作 Agent |

---

## 2. 目录结构

```
项目根目录/
├── .claude/
│   └── commands/          ← Claude Code slash command 入口（轻量，只做路由）
│       └── xhs-publish.md
│
├── docs/
│   ├── ai-skills.md       ← 本文档（体系设计）
│   └── xhs-publish.md     ← XHS 发布 Skill 完整定义
│
└── scripts/
    └── xhs-browser.mjs    ← 浏览器控制器（Skill 的工具层）
```

### 分层说明

```
┌─────────────────────────────────────────────────┐
│  .claude/commands/<skill>.md                    │  ← 入口层
│  仅 2-3 行：告诉 Claude 去读哪个 docs/ 文件      │
└───────────────────┬─────────────────────────────┘
                    │ 读取
┌───────────────────▼─────────────────────────────┐
│  docs/<skill>.md                                │  ← 定义层
│  完整的步骤描述、判断规则、错误处理              │
└───────────────────┬─────────────────────────────┘
                    │ 调用
┌───────────────────▼─────────────────────────────┐
│  scripts/<tool>.mjs                             │  ← 工具层
│  无状态的原子操作（导航、截图、点击、输入）      │
└─────────────────────────────────────────────────┘
```

---

## 3. 加载机制

### 3.1 Claude Code 加载方式

Claude Code 在项目根目录下自动识别 `.claude/commands/` 里的 `.md` 文件作为 slash command。

```
用户输入：/xhs-publish path/to/article.md
         ↓
Claude Code 读取：.claude/commands/xhs-publish.md
         ↓
该文件指示 Claude 读取：docs/xhs-publish.md
         ↓
Claude 按文档步骤执行，调用 scripts/ 里的工具脚本
```

入口文件格式（`/.claude/commands/<name>.md`）：
```markdown
请读取项目中的 `docs/<name>.md` 文件，然后严格按照其中描述的流程执行。

用户提供的参数：$ARGUMENTS
```

### 3.2 其他 AI 的加载方式

其他 AI 没有 `.claude/commands/` 的感知，直接告知即可：

```
"请读取 docs/xhs-publish.md，按照其中的流程把这篇文章发布到小红书：[文件路径]"
```

只要该 AI 支持：
- `Bash` 工具（执行 `node scripts/xhs-browser.mjs` 命令）
- `Read` 工具（读取截图 `/tmp/xhs-screen.png`）

就可以完整执行。

---

## 4. Skill 编写规范

### 4.1 文件结构

```markdown
# <Skill 名称>

<一句话描述>

## 使用方式
/skill-name <参数说明>

## 前置条件
- 依赖项列表

## 执行流程

### 第 N 步：<步骤名>
<操作描述>
\```bash
<具体命令>
\```
截图确认：<预期状态描述>

## 字段规则
<参数限制表>

## 常见问题处理
<异常处理表>

## 工具依赖
<依赖清单>
```

### 4.2 视觉验证原则

每个操作步骤后**必须截图确认**，不能假设操作成功：

```bash
# 执行操作
node scripts/xhs-browser.mjs click-text "文字配图"

# 立即截图确认
# 读取 /tmp/xhs-screen.png，分析是否进入了预期状态
```

### 4.3 工具脚本设计原则

工具脚本（`scripts/*.mjs`）遵循以下约定：

- **无状态**：每次调用独立，通过 remote-debugging-port 复用已有浏览器会话
- **JSON 输出**：`{ ok: boolean, screenshot?: string, url?: string, error?: string }`
- **原子操作**：每个命令只做一件事（navigate / click / type / screenshot）
- **截图跟随**：除 `close` 外，所有命令执行后自动截图

---

## 5. 现有 Skills

| Skill | 入口 | 文档 | 工具脚本 | 说明 |
|-------|------|------|---------|------|
| xhs-publish | `.claude/commands/xhs-publish.md` | `docs/xhs-publish.md` | `scripts/xhs-browser.mjs` | 发布文章到小红书 |

---

## 6. Sub-agent 设计（规划中）

当任务复杂度超过单个 Skill 的范围时，可以拆分为多个协作 Sub-agent。

### 6.1 设计思路

```
Orchestrator Agent（调度层）
    ├── Content Agent     ← 负责内容准备：提取标题、正文、格式转换
    ├── Publish Agent     ← 负责平台发布：驱动浏览器完成发布流程
    └── Verify Agent      ← 负责结果验证：确认发布成功、记录链接
```

### 6.2 文件组织（预留）

```
docs/
├── ai-skills.md                  ← 本文档
├── agents/
│   ├── content-agent.md          ← 内容处理 Agent 定义
│   ├── publish-agent.md          ← 发布 Agent 定义
│   └── verify-agent.md           ← 验证 Agent 定义
└── xhs-publish.md                ← 当前单 Agent 实现（可拆分为多 Agent）
```

### 6.3 Agent 间通信约定

Sub-agent 通过文件系统传递数据：

```
/tmp/agent-context/
├── input.json      ← Orchestrator 下发的任务参数
├── title.txt       ← Content Agent 输出的标题
├── body.txt        ← Content Agent 输出的正文
└── result.json     ← Publish Agent 输出的发布结果
```

### 6.4 触发方式（规划）

```bash
# 未来可能的 sub-agent 调用方式
node scripts/run-agent.mjs content-agent --input article.md
node scripts/run-agent.mjs publish-agent --platform xhs
```

---

## 7. 扩展新 Skill

### 步骤

1. **创建工具脚本**（如有需要）：`scripts/<platform>-browser.mjs`
2. **创建 Skill 文档**：`docs/<skill-name>.md`（按第 4 节规范）
3. **注册入口**：`.claude/commands/<skill-name>.md`（3 行模板，引用文档路径）
4. **更新本文档**：在第 5 节「现有 Skills」表格里添加记录

### 示例：新增微博发布 Skill

```bash
# 1. 创建工具脚本
touch scripts/weibo-browser.mjs

# 2. 创建文档
touch docs/weibo-publish.md

# 3. 注册入口
echo '请读取 `docs/weibo-publish.md` 并执行发布流程。参数：$ARGUMENTS' \
  > .claude/commands/weibo-publish.md
```

---

## 8. 注意事项

- **不要在 `.claude/commands/` 里写完整流程**：入口文件应保持 3 行以内，完整逻辑在 `docs/` 里维护
- **截图路径约定**：统一使用 `/tmp/<platform>-screen.png`，避免多个 Skill 同时运行时冲突
- **Chrome Profile 隔离**：每个平台使用独立的 Chrome profile 目录（`publish-profiles/<platform>/`）
- **发布前确认**：所有涉及不可撤销操作（如点击「发布」）的 Skill，必须在执行前展示截图请用户确认
