---
name: commit
description: 分析改动、更新技术文档、提交并推送代码
---

# 提交代码

分析本次改动、更新技术文档、提交并推送代码。

## 执行步骤

### 第 1 步：分析改动

运行以下命令了解本次改动全貌：

```bash
git status --short
git diff --stat HEAD
git diff HEAD
```

仔细阅读所有改动，归纳：
- 新增了哪些功能/模块
- 修改了哪些现有功能
- 新增/修改了哪些文件

### 第 2 步：更新 `docs/technical-design.md`

读取当前文档：
```bash
grep -n "^\*\*版本\*\*\|^## [0-9]" docs/technical-design.md
```

按以下规则更新文档：

**版本号**：patch 改动 +0.1，新功能 +0.1（小版本），架构级变更 +1.0
**状态行**：在括号内追加新功能名称（简短，用中文，4-8 字）
**新章节**：若本次有新功能模块，在文档末尾追加 `## N. 功能名` 章节，包含：
  - 功能概述（1-2 句话）
  - 架构/设计要点（用代码块或列表）
  - 新增/修改的关键文件

若仅为 bugfix 或小调整，不新增章节，只更新版本号和状态行即可。

### 第 3 步：生成 commit message

按 Conventional Commits 格式起草：
- `feat:` 新功能
- `fix:` 修复
- `refactor:` 重构
- `docs:` 仅文档

Message 结构：
```
<type>: <简短英文标题>（≤72字符）

- 要点1
- 要点2
- 要点3（如有）
```

### 第 4 步：暂存并提交

只暂存本次相关文件（不要 `git add .`，逐一列出），然后提交：

```bash
git add <file1> <file2> ...
git commit -m "$(cat <<'EOF'
<commit message>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 第 5 步：推送

```bash
git push
```

确认输出包含 `main -> main` 则成功。最后告知用户：提交的 commit hash、message 标题、推送结果。
