---
name: test-feature
description: 运行测试 Agent 对当前功能进行自动验收
---

# Test Feature

运行测试 Agent 对当前功能进行自动验收。

## Usage
```
/test-feature [spec-path]
```

## Input
Spec 路径: $ARGUMENTS (可选，默认搜索 `.claude/specs/` 下最新的 spec.md)

## Behavior
1. 读取 `.claude/agents/test-agent.md` 获取测试流程
2. 定位对应的 spec.md 文件
3. 提取 spec.md 中的「④ 测试点」部分
4. 执行静态检查（TypeScript、Build）
5. 逐条执行测试用例
6. 输出结构化测试报告

## Working Directory
/Users/bytedance/self-project/ai-note
