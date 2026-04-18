---
name: implement
description: 按照 AI-Native 工作流实现新功能
---

# Implement Feature

按照 AI-Native 工作流实现新功能。

## Usage
```
/implement <功能描述>
```

## Input
功能描述: $ARGUMENTS

## 工作流程

严格按照 CLAUDE.md 中定义的阶段门控执行，**不能跳步**：

### 阶段 1: Plan Mode — 需求讨论
1. 读取 `CLAUDE.md`、`docs/prd.md`、`docs/technical-design.md`
2. 分析用户需求，明确做什么、**不做什么**
3. 有歧义的地方必须问清楚
4. 更新 `docs/prd.md`，追加新功能到对应模块
5. **退出标准**: docs/prd.md 更新完毕，无待确认问题

### 阶段 2: HTML 原型
1. 在 `.claude/specs/NNN-功能名/` 下创建 `prototype.html`
2. 原型必须是可交互的单文件 HTML（含内联 CSS/JS）
3. 走完所有页面跳转、操作流程、边界状态（空态/loading态/错误态）
4. 请用户在浏览器中打开验证
5. **退出标准**: 用户确认原型没问题

### 阶段 3: 补写 spec.md
1. 在同目录下创建 `spec.md`，包含四个必要部分：
   - ① 用户旅程 — 主流程步骤序列
   - ② 数据模型 + API — 字段定义、接口 request/response
   - ③ UI 功能点 — 基于 prototype.html 逐页、逐组件展开（含样式规格）
   - ④ 测试点 — 基于 UI 功能点一一对应，格式：`- [ ] [T-XX] 操作 → 预期结果`
2. **退出标准**: 用户确认 spec.md 没问题

### 阶段 4: 写代码
1. 创建 feature 分支: `git checkout -b feat/<kebab-case-name>`
2. **严格对照 spec.md 的 UI 功能点逐条实现**，不得自行发挥，不得遗漏
3. 遵循项目开发规范（见 CLAUDE.md 开发规范）
4. 编码中发现需求不清 → **停下来问，不自行假设**

### 阶段 5: 本机测试
编码完成后必须在本机实际测试：
1. **UI 视觉验证** — 截图检查布局、状态显示
2. **点击功能测试** — 模拟用户操作按钮、表单等
3. **数据验证** — 检查数据库、API 返回值是否正确

### 阶段 6: 测试 Agent 自动验收
1. 读取 `.claude/agents/test-agent.md`，按照其流程执行
2. 逐条执行 spec.md 中的测试点
3. 全部通过后提交代码

## 原则
- **docs/prd.md 是唯一需求来源** — 有歧义改 PRD，不直接改代码或原型
- **prototype.html 是 UI 唯一真相** — spec.md 必须完整提取自原型
- **测试点是验收唯一标准** — 全部通过才算完成
- 原型发现问题 → 改 PRD，不直接改原型
- 需求变了先改 PRD，再同步 spec，最后改代码

## Notes
- 使用中文与用户沟通
- 功能上线后将 spec 目录移到 `.claude/specs-done/`
