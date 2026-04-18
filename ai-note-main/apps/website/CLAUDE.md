# AI-Note Website

## 项目简介
AI-Note 营销官网，单页落地页，面向潜在用户展示产品特性和下载链接。

## 技术栈
- Next.js 14 (App Router) + 静态导出 (`output: 'export'`)
- React 18 + TypeScript
- Tailwind CSS 3 + CSS 变量主题（暗色/亮色）
- framer-motion 滚动动画
- 轻量 React Context i18n（中文优先 + 英文）

## 开发命令
```bash
pnpm dev              # 启动开发服务器 localhost:3001
pnpm build            # 静态构建到 out/
pnpm lint             # ESLint 检查
```

## 目录结构
```
src/
├── app/              # Next.js App Router（layout + page + globals.css）
├── providers/        # ThemeProvider, I18nProvider
├── hooks/            # useTheme
├── i18n/             # 翻译文件（zh.ts, en.ts）
├── lib/              # 常量配置（下载链接、技术栈数据）
└── components/
    ├── layout/       # Header, Footer
    ├── ui/           # ThemeToggle, LangToggle, SectionWrapper, FeatureCard
    ├── icons/        # SVG 图标组件
    └── sections/     # 6 个页面区块（Hero, Features, DeepDive, Comparison, TechStack, Download）
```

## 落地页结构
Header → Hero → Features Grid → Feature Deep Dive → Comparison Table → Tech Stack → Download CTA → Footer

## 关键设计决策
- **静态导出**: `next.config.mjs` 中 `output: 'export'`，零服务器依赖
- **暗色模式**: CSS 变量 (`:root` + `.dark`) + `darkMode: 'class'`，内联脚本防 FOUC
- **i18n**: 客户端切换，localStorage 持久化，不使用路由分隔
- **主题色**: Indigo/Violet 渐变，与桌面应用保持一致

## 相关文档
- 产品需求：`docs/prd.md`
- 技术设计：`docs/technical-design.md`（Section 2.3 + 7.5）
