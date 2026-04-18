---
name: xhs-publish
description: 将 Markdown 笔记发布到小红书创作者平台
---

# 小红书发布助手 (XHS Publish)

将一篇 Markdown 笔记发布到小红书创作者平台。使用视觉截图驱动浏览器，不依赖固定 CSS 选择器。

## 使用方式

```
/xhs-publish [markdown文件路径]
```

- **有参数**：`/xhs-publish docs/articles/my-article.md`
- **无参数**：自动检测 IDE 当前打开的 `.md` 文件

参数: $ARGUMENTS

---

## 执行流程

> 每一步都要：运行命令 → 读取截图（`/tmp/xhs-screen.png`）→ 目视确认状态 → 继续。
> 若截图与预期不符，先分析原因再决定下一步。

### 第 0 步：读取文章内容

**确定文件路径**：

- 若 `$ARGUMENTS` 非空，直接使用该路径
- 若 `$ARGUMENTS` 为空，检查会话上下文中 IDE 当前打开的文件（会话上下文中有 `ide_selection` 或当前正在查看的文件路径）；取出路径以 `.md` 结尾的文件
- 若仍无法确定，请用户提供文件路径后停止

**执行提取脚本**（将 `$FILE` 替换为实际路径）：

```bash
python3 << 'PYEOF'
import re, sys

FILE = "$FILE"  # 替换为实际路径

with open(FILE, 'r') as f:
    content = f.read()

lines = content.split('\n')
title = None
body_start_idx = None

i = 0
while i < len(lines):
    line = lines[i]
    if re.match(r'^#{1,6}\s*标题\s*$', line):
        j = i + 1
        while j < len(lines) and lines[j].strip() == '':
            j += 1
        if j < len(lines):
            title = lines[j].strip()[:20]
    if re.match(r'^#{1,6}\s*内容\s*$', line):
        body_start_idx = i + 1
        break
    i += 1

# Fallback: YAML front matter title
if not title:
    m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', content, re.MULTILINE)
    if m:
        title = m.group(1).strip()[:20]

# Fallback: filename
if not title:
    import os
    title = os.path.basename(FILE).replace('.md', '')[:20]

body = ''
if body_start_idx is not None:
    body_lines = lines[body_start_idx:]
    body = '\n'.join(body_lines)
    body = re.sub(r'^#{1,6}\s+', '', body, flags=re.MULTILINE)
    body = re.sub(r'```[\s\S]*?```', '', body)
    body = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', body)
    body = re.sub(r'\*\*(.+?)\*\*', r'\1', body)
    body = re.sub(r'\*(.+?)\*', r'\1', body)
    body = re.sub(r'~~(.+?)~~', r'\1', body)
    body = re.sub(r'^\|[-\s|:]+\|$', '', body, flags=re.MULTILINE)
    body = re.sub(r'\n{3,}', '\n\n', body)
    body = body.strip()[:990]

with open('/tmp/xhs-title.txt', 'w') as f:
    f.write(title or '')
with open('/tmp/xhs-body.txt', 'w') as f:
    f.write(body)

print(f"标题：{title}")
print(f"正文长度：{len(body)}")
print(f"正文前100字：\n{body[:100]}")
PYEOF
```

确认输出的标题和正文前 100 字符合预期后再继续。

### 第 1 步：打开发布页

```bash
node scripts/xhs-browser.mjs navigate "https://creator.xiaohongshu.com/publish/publish?from=menu&target=image"
```

读取 `/tmp/xhs-screen.png`，确认：
- 页面显示「上传图文」标签（已激活）
- 看到「上传图片（红色）」和「文字配图（白色）」两个按钮

若跳转到登录页 → **停止，提示用户先在 Chrome profile 里登录小红书**。

### 第 2 步：点击「文字配图」

```bash
node scripts/xhs-browser.mjs click-text "文字配图"
```

截图确认：进入了文字卡片编辑器（有文本输入区，占据页面中央）。

### 第 3 步：在卡片编辑器里输入标题

点击并聚焦编辑器：
```bash
node scripts/xhs-browser.mjs click-selector ".ProseMirror"
```

全选清空：
```bash
node scripts/xhs-browser.mjs select-all
node scripts/xhs-browser.mjs key "Backspace"
```

输入标题（从文件读取，避免 shell 转义问题）：
```bash
node scripts/xhs-browser.mjs type-file /tmp/xhs-title.txt
```

截图确认：卡片预览里显示了标题文字。

### 第 4 步：点击「生成图片」

```bash
node scripts/xhs-browser.mjs click-text "生成图片"
```

等待约 4 秒（AI 生成图片需要时间），然后截图。
截图确认：出现图片卡片预览，右侧有多种样式可选，底部有「下一步」按钮。

```bash
# 等待生成完成
sleep 4 && node scripts/xhs-browser.mjs screenshot
```

### 第 5 步：点击「下一步」

```bash
node scripts/xhs-browser.mjs click-text "下一步"
```

截图确认：进入最终发布页。页面包含：
- 左上角：已上传的图片缩略图
- 中间：「填写标题会有更多赞哦」输入框
- 下方：正文编辑区（预填了卡片文字）
- 右下角：「发布」红色按钮

### 第 6 步：填写最终标题

```bash
node scripts/xhs-browser.mjs click-selector "input[placeholder*='填写标题']"
node scripts/xhs-browser.mjs select-all
node scripts/xhs-browser.mjs key "Backspace"
node scripts/xhs-browser.mjs type-file /tmp/xhs-title.txt
```

截图确认：标题输入框里显示文章标题（≤20字，计数器不显示红色溢出）。

### 第 7 步：清空并填写正文

XHS 会把卡片文字预填到正文区，**必须先清空再写入正文**。

```bash
node scripts/xhs-browser.mjs click-selector "[contenteditable='true']"
node scripts/xhs-browser.mjs select-all
node scripts/xhs-browser.mjs key "Backspace"
node scripts/xhs-browser.mjs type-file /tmp/xhs-body.txt
```

截图确认：正文区显示了文章内容，字数计数器显示合理数值（≤1000）。

### 第 8 步：选择群聊（选第一个）

向下滚动到「内容设置」区域：
```bash
node scripts/xhs-browser.mjs scroll 400
```

点击「选择群聊」下拉框触发器（注意：需点击 `.d-select-main` 而非文字本身）：
```bash
node scripts/xhs-browser.mjs click-selector ".group-card-select .d-select-main"
```

截图确认弹出了群聊列表，然后用 evaluate 精确点击第一项（必须限定在含群聊内容的 `.d-popover` 内，避免误点导航）：
```bash
node scripts/xhs-browser.mjs evaluate "() => { const p = Array.from(document.querySelectorAll('.d-popover')).find(p => p.textContent && p.textContent.includes('人')); const item = p && p.querySelector('.item.custom-option'); if (item) { item.click(); return 'ok:' + item.textContent.trim().substring(0,20) } return 'not found' }"
```

截图确认已选中一个群聊（下拉框不再显示「选择群聊」占位文字）。

### 第 9 步：选话题（选第一个）

点击「选话题」按钮（位于「添加组件」区域）：
```bash
node scripts/xhs-browser.mjs click-text "选话题"
```

截图确认弹出了话题选择面板，然后点击第一个可选话题：
```bash
node scripts/xhs-browser.mjs click-first-visible "li[class*='item'], [class*='topic']:not([disabled]), [class*='recommend'] li, [class*='list'] li, [class*='option']:not([disabled])"
```

截图确认已选中一个话题（「选话题」按钮区域显示了话题名称，或话题列表消失）。

若弹出的是搜索框而非列表，直接点击搜索结果中的第一项即可。若话题面板有「确认」按钮，则点击确认：
```bash
node scripts/xhs-browser.mjs click-text "确认"
```

### 第 10 步：将可见性设为「仅自己可见」

向下滚动到「更多设置」区域并截图：
```bash
node scripts/xhs-browser.mjs scroll 300
node scripts/xhs-browser.mjs screenshot
```

点击「公开可见」下拉框展开选项（必须用 `.permission-card-select` 精确定位，`click-text` 会误触其他下拉）：
```bash
node scripts/xhs-browser.mjs click-selector ".permission-card-select .d-select-main"
```

截图确认弹出了可见性下拉列表，然后点击「仅自己可见」选项：
```bash
node scripts/xhs-browser.mjs click-text "仅自己可见"
```

若 `click-text` 找不到，则尝试点击列表中第三个或最后一个选项（「仅自己可见」通常排在末尾）：
```bash
node scripts/xhs-browser.mjs click-last-visible "li[class*='item'], [class*='option']:not([disabled]), [class*='list'] li, [class*='dropdown'] li"
```

截图确认下拉框显示「仅自己可见」。

### 第 11 步：发布

```bash
node scripts/xhs-browser.mjs click-text "发布"
```

等待 3 秒后截图。
截图确认：出现发布成功提示 / 跳转到内容管理页。

---

## 字段规则

| 字段 | 来源 | 限制 |
|------|------|------|
| 卡片文字（Step 3） | `# 标题` 节下第一行文字 → front matter `title:` → 文件名 | 建议 ≤ 15 字，让卡片好看 |
| 最终标题（Step 6） | 同上 | **最多 20 字**，超出 XHS 拒绝 |
| 正文（Step 7） | `# 内容` 节下的全部文字（清理 Markdown 标记后） | **最多 990 字符** |

---

## 常见问题处理

| 现象 | 处理方式 |
|------|---------|
| Step 1 跳转到登录页 | 停止，告知用户 `node scripts/xhs-debug.mjs` 可检查登录状态 |
| Step 2「文字配图」找不到 | 截图分析页面，尝试 `click-selector "[class*='text']"` 或重新 navigate |
| Step 4 图片生成超时 | 再等 4 秒后截图，若仍未出现「下一步」则报告用户 |
| Step 7 正文没有被清空 | 在 type-file 前多执行一次 select-all + Backspace |
| Step 8 群聊选项点不到 | 截图分析弹出的列表结构，换用 `click-text "<群名>"` 点击具体群名 |
| Step 9 公开可见已正确无需操作 | 截图确认是「公开可见」则跳过，直接 Step 10 |
| 任意步骤出现弹窗 | 截图分析弹窗内容，通常用 `click-text "我知道了"` 或 `key "Escape"` 关闭 |

---

## 工具依赖

- `puppeteer-core`（已在项目 `package.json` 中）
- Google Chrome（macOS 默认路径）
- XHS Chrome profile 位于 `~/Library/Application Support/@ai-note/desktop/publish-profiles/xhs`

---

> 本 skill 设计为与视觉 AI 配合使用。AI 在每步截图后目视判断状态，避免依赖易变的 DOM 选择器。
> 其他支持 Bash + 图片读取的 AI 助手（如 Gemini、GPT-4o）同样可以按此流程执行。
