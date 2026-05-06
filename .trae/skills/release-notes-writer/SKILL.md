---
name: "release-notes-writer"
description: "将 PR/commit/issue 变更整理为结构化发布说明（Release Notes）。Invoke when 用户要发版公告、生成 release notes、或需要对外/对内汇总本次版本变更。"
---

# Release Notes Writer

## 适用场景（When to invoke）
- 用户希望把本次发版内容整理成对外公告或内部变更清单
- 需要按固定规范输出（如 Keep a Changelog / Added-Changed-Fixed）
- 需要从 PR/commit/issue 的零散信息中抽取要点并去重汇总

## 不适用（Out of scope）
- 没有任何变更输入（PR/commit/issue 为空）且无法获取仓库信息时
- 需要自动读取私有仓库数据但当前会话无法访问时

## 输入要求（Inputs）
- 版本信息：版本号（必填）、发布日期（可选）
- 变更来源（至少一个）：
  - PR 列表：标题、链接、简述、标签（feature/fix/breaking/security）
  - commit 列表：hash、message（可选：作者、范围）
  - issue 列表：标题、链接、状态（可选）
- 目标读者：外部用户 / 内部研发 / 双版本（默认：双版本）
- 风格偏好：简洁/详细（默认：简洁）
-（可选）发布规范：Keep a Changelog / Added-Changed-Fixed / 自定义小节顺序

## 工作流程（Workflow）
1. 归一化输入：把 PR/commit/issue 转成统一条目（标题、链接、类型、影响面）
2. 去重与合并：同一变更多处出现时合并，并保留最权威链接（优先 PR > issue > commit）
3. 分类：Added / Changed / Fixed / Deprecated / Removed / Security，并单独识别 Breaking Changes
4. 抽取 Highlights：挑 1-5 条对用户影响最大或最能代表版本价值的变更
5. 生成双版本文案：
   - 外部版：面向用户，可读性强，避免内部术语
   - 内部版：保留技术细节、链接与验证点
6. 自检：是否包含版本号、是否遗漏 breaking/security、是否存在未确认推断项并显式标注

## 输出格式（Outputs）
### 外部版（Public）
- `vX.Y.Z (YYYY-MM-DD)`
- Highlights
- Added / Changed / Fixed / Security（按需显示，没有则不输出该小节）
- Breaking Changes（没有则写 None）
- Known Issues（如有）

### 内部版（Internal）
- 与外部版同结构，但每条带链接（PR/issue/commit）与简短验证点（如适用）
- Contributors（可选）

## 示例（Examples）
### 示例 1：从 PR 列表生成
- 用户输入：
  - 版本号：v1.12.0
  - PR：
    - feat: add csv export (#123)
    - fix: avoid NPE in parser (#128)
    - breaking: rename config key `foo` -> `bar` (#130)
- 期望行为：
  - 生成 Added/Fixed/Breaking Changes 分类
  - Breaking Changes 给迁移说明与影响范围

### 示例 2：仅有 commit 列表（不确定项需标注）
- 用户输入：若干 commit message
- 期望行为：按 message 推断分类，并对推断项标注“待确认”

