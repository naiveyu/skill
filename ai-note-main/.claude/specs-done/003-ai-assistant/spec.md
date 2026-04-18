# 003 AI 助手模块 Spec

## 一、用户旅程

### 主流程：首次配置 + 对话

1. 用户点击右下角 AI 浮动按钮，打开 AI 面板
2. 面板显示「未配置」状态，引导用户配置 Token
3. 用户点击 header ⚙ 图标或引导区「配置 Token」按钮
4. 设置区展开，用户粘贴 `sk-ant-oat01-*` token，点击保存
5. 保存成功后，header 状态变为「就绪」，设置区显示已配置状态
6. 用户在输入框输入问题或点击快捷操作按钮
7. AI 流式返回内容，实时显示在面板中
8. 用户可复制结果或保存为本地文件

### 返回用户流程

1. 用户重新打开应用，打开 AI 面板
2. 系统从 config.json 加载已保存的 token
3. 自动显示「就绪」状态，可直接对话

## 二、数据模型 + API

### 配置存储

`ai.setupToken` 字段新增到 `AiConfig`：

```typescript
// packages/shared-types/src/models/config.ts
interface AiConfig {
  activeProvider: AiProvider
  activeModel: string
  providers: Partial<Record<AiProvider, AiProviderConfig>>
  setupToken?: string  // NEW: Claude setup token (sk-ant-oat01-*)
}
```

### IPC 通道

| 通道 | 方向 | 参数 | 返回 | 说明 |
|------|------|------|------|------|
| `ai:save-token` | renderer→main | `token: string` | `{ success: boolean }` | 验证并保存 token |
| `ai:get-token-status` | renderer→main | — | `{ configured: boolean, preview?: string }` | 获取 token 配置状态 |
| `ai:send` | renderer→main | `prompt: string` | `void` | 发送消息（保持原有） |
| `ai:cancel` | renderer→main | — | `void` | 取消生成（保持原有） |
| `ai:stream-chunk` | main→renderer | `{ content: string }` | — | 流式内容块（保持原有） |
| `ai:stream-end` | main→renderer | — | — | 流结束（保持原有） |
| `ai:stream-error` | main→renderer | `{ message: string }` | — | 流错误（保持原有） |

**移除的通道**：
| 通道 | 说明 |
|------|------|
| `ai:check-available` | 不再需要（不依赖 CLI） |

### Preload Bridge

```typescript
ai: {
  saveToken(token: string): Promise<{ success: boolean }>       // NEW
  getTokenStatus(): Promise<{ configured: boolean, preview?: string }>  // NEW
  send(prompt: string): Promise<void>                           // 保持
  cancel(): Promise<void>                                       // 保持
  onStreamChunk(cb): () => void                                 // 保持
  onStreamEnd(cb): () => void                                   // 保持
  onStreamError(cb): () => void                                 // 保持
}
```

## 三、UI 功能点

### [AI Panel / Header]

- [Header] 左侧：✦ 图标 + 「AI 助手」文字 + 状态标签
  - 未配置：红色背景标签 `bg-red-100 text-red-700`（暗色：`bg-red-900/30 text-red-400`），文字「未配置」
  - 已配置：绿色背景标签 `bg-green-100 text-green-700`（暗色：`bg-green-900/30 text-green-400`），文字「就绪」
- [Header] 右侧：「清空」文字按钮（有消息时显示）+ ⚙ 齿轮按钮 + ✕ 关闭按钮
- [Header] ⚙ 按钮点击：toggle 设置区展开/收起

### [AI Panel / Settings Area]

- [Settings] 位置：header 下方，消息区上方，border-bottom 分隔
- [Settings] 背景：`bg-[var(--color-bg-secondary)]`
- [Settings / 未配置态]：
  - 标签「Setup Token」，11px uppercase
  - 输入框：`type="password"`，placeholder「粘贴 sk-ant-oat01-...」
  - 保存按钮：accent 色，文字「保存 Token」
  - 提示文字：说明如何获取 token（运行 `claude setup-token`）
- [Settings / 保存中]：按钮文字变「保存中...」，disabled 状态
- [Settings / 保存成功]：显示绿色成功提示「Token 已保存！」，1.5s 后自动切换到已配置态
- [Settings / 已配置态]：
  - 状态行：绿色圆点 + 「已配置」+ 脱敏 token（`sk-ant-oat01-****...****`）+ 「重新设置」链接按钮
  - 点击「重新设置」→ 切换回输入态

### [AI Panel / Empty State]

- [Empty / 未配置] 居中显示：✦ 图标 28px + 「未配置 AI Token」+ 说明文字 + 「配置 Token」按钮
  - 「配置 Token」按钮点击：打开设置区
- [Empty / 已配置无消息] 显示快捷操作按钮（与现有逻辑一致）

### [AI Panel / Messages]

- 保持现有消息气泡样式不变
- 保持现有复制/保存本地操作不变
- 保持现有 loading dots 动画不变

### [AI Panel / Input Area]

- 未配置 token 时：输入框 disabled，placeholder「请先配置 Token...」，发送按钮 disabled
- 已配置 token 时：正常可用（与现有逻辑一致）

### [AI Floating Button]

- 保持现有浮动按钮不变

## 四、测试点

### 认证配置

- [ ] T-01 打开 AI 面板 → header 显示「未配置」红色标签
- [ ] T-02 未配置时 → 输入框 disabled，发送按钮 disabled，placeholder「请先配置 Token...」
- [ ] T-03 未配置时 → 消息区显示引导页，含「配置 Token」按钮
- [ ] T-04 点击引导页「配置 Token」按钮 → 设置区展开
- [ ] T-05 点击 header ⚙ 按钮 → 设置区展开/收起 toggle
- [ ] T-06 设置区输入 token，点击保存 → 按钮变「保存中...」
- [ ] T-07 保存成功 → 显示绿色成功提示，1.5s 后切换到已配置态
- [ ] T-08 保存成功 → header 状态变为「就绪」绿色标签
- [ ] T-09 已配置态 → 显示脱敏 token + 「重新设置」按钮
- [ ] T-10 点击「重新设置」→ 切换回 token 输入表单
- [ ] T-11 重启应用 → 自动加载已保存 token，显示「就绪」状态
- [ ] T-12 输入无效 token（不以 sk-ant-oat 开头）→ 仍可保存（不做前端校验，由 SDK 返回错误）

### AI 对话

- [ ] T-20 已配置后输入问题，点击发送 → 流式返回内容显示在助手气泡中
- [ ] T-21 生成中 → 显示 loading dots 动画，切换为取消按钮
- [ ] T-22 点击取消 → 中断流式响应，保留已生成内容
- [ ] T-23 生成完成 → 助手气泡底部显示「复制」「保存本地」按钮
- [ ] T-24 点击复制 → 内容复制到剪贴板，按钮变「已复制！」
- [ ] T-25 点击保存本地 → 生成 `*-ai01.md` 文件，按钮变「已保存！」

### 上下文附加

- [ ] T-30 打开 Markdown 笔记 → AI 发送时自动附加笔记全文作为上下文
- [ ] T-31 打开 PDF → AI 发送时自动附加 PDF 上下文（选中文字/页面文本）
- [ ] T-32 无打开文件 → AI 只发送用户输入，无附加上下文

### 快捷操作

- [ ] T-40 已配置 + 打开 Markdown 笔记 → 显示 6 个学习模式快捷按钮
- [ ] T-41 点击「总结要点」→ 自动发送预设 prompt + 笔记内容
- [ ] T-42 已配置 + 打开 PDF → 显示 4 个 PDF 快捷按钮
- [ ] T-43 点击「总结全文」→ 提取 PDF 全文并发送预设 prompt

### 错误处理

- [ ] T-50 Token 无效（SDK 认证失败）→ 助手气泡显示错误信息
- [ ] T-51 网络错误 → 助手气泡显示错误信息
- [ ] T-52 SDK 不可用 → 助手气泡显示错误信息
