---
name: growth
description: 自动增长运营（小红书/Twitter/视频号）
---

请读取项目中的 `.claude/agents/growth-agent.md` 文件，然后严格按照其中描述的流程执行自动增长运营。

## 执行参数

用户提供的参数：$ARGUMENTS

### 参数格式

```
/growth <平台> [关键词]
```

**平台选项**：
- `xhs` — 小红书运营（搜索+评论）
- `twitter` — Twitter/X 运营（搜索+回复+发帖）
- `video` — 微信视频号（生成视频脚本）
- `all` — 依次执行所有平台

**示例**：
```
/growth xhs 笔记软件推荐
/growth twitter note taking app
/growth video
/growth all
```

### 执行流程

1. 读取 `.claude/agents/growth-agent.md` 获取完整运营策略
2. 启动 Chrome 浏览器（远程调试模式）
3. 检查目标平台登录状态
4. 按策略搜索目标内容并互动
5. 记录所有操作到 `docs/growth-log.csv`
6. 输出本次运营总结报告

### 重要提醒

- 每次操作前必须截图确认页面状态
- 严格遵守频率控制（小红书最多 5 条/次，Twitter 最多 4 条/次）
- 评论必须根据帖子内容定制，不发模板化内容
- 操作完成后关闭 Chrome 进程
