---
name: deploy
description: 部署当前分支到生产环境
---

# Deploy to Production

部署当前分支到生产环境。

## Usage
```
/deploy
```

## Behavior
1. 确认当前分支已通过测试（spec.md 测试点全部 PASS）
2. 运行 `./deploy.sh` 构建并部署
3. 执行 health check（website + API）
4. 向用户报告部署结果
5. 等待用户确认后再合并到 main

## Safety
- 不自动合并到 main
- 用户必须验证后明确批准
- Health check 必须通过

## 部署后
- 功能上线后，将 `.claude/specs/NNN-功能名/` 移到 `.claude/specs-done/`

## Working Directory
/Users/bytedance/self-project/ai-note
