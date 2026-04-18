const zh = {
  // Header
  'nav.features': '功能特性',
  'nav.comparison': '产品对比',
  'nav.download': '下载',
  'nav.github': 'GitHub',

  // Hero
  'hero.title': '本地优先的',
  'hero.titleHighlight': 'Markdown 笔记应用',
  'hero.subtitle':
    '100% 本地存储，自动版本管理，双编辑模式，全文搜索。你的笔记，永远属于你。',
  'hero.cta': '免费下载',
  'hero.ctaSecondary': '查看源码',

  // Features Grid
  'features.title': '为什么选择 AI-Note',
  'features.subtitle': '专为重视隐私和数据安全的知识工作者设计',
  'features.localFirst.title': '本地优先',
  'features.localFirst.desc':
    '所有笔记保存在你自己的电脑上，不依赖任何云服务，不担心隐私泄露。你的数据永远在你手中。',
  'features.git.title': '自动版本管理',
  'features.git.desc':
    '每次编辑自动保存历史，随时查看修改记录，一键恢复到之前的任意版本。再也不怕误操作。',
  'features.dualEdit.title': '双编辑模式',
  'features.dualEdit.desc':
    '所见即所得编辑器 + 源码模式，快捷键一键无缝切换，内容零丢失。',
  'features.search.title': '极速全文搜索',
  'features.search.desc': '万级文件毫秒响应，完美支持中文搜索，快速找到你需要的笔记。',
  'features.organize.title': '智能组织',
  'features.organize.desc': '文件夹 + 标签双重管理，多标签页编辑，拖拽排序，高效管理知识。',
  'features.crossPlatform.title': '跨平台支持',
  'features.crossPlatform.desc': 'macOS、Windows、Linux 全平台原生支持，体验一致。',

  // Feature Deep Dive
  'deepDive.git.title': '每次编辑，都有版本保障',
  'deepDive.git.desc':
    '自动记录每一次修改历史。随时查看笔记的所有版本、对比前后变化、一键恢复到之前的任意时刻，让你的笔记永不丢失。',
  'deepDive.dualEdit.title': '两种编辑模式，自由切换',
  'deepDive.dualEdit.desc':
    '所见即所得模式适合快速记录，源码模式提供完全掌控。快捷键一键切换，光标位置和滚动状态完美保持。',
  'deepDive.search.title': '闪电般的全文搜索',
  'deepDive.search.desc':
    '上万篇笔记也能毫秒级找到结果，完美支持中文搜索，搜索结果带上下文预览，快速定位你需要的内容。',

  // Comparison
  'comparison.title': '产品对比',
  'comparison.subtitle': '看看 AI-Note 与主流笔记应用的差异',
  'comparison.feature': '功能',
  'comparison.localFirst': '本地优先',
  'comparison.builtInGit': '自动版本管理',
  'comparison.zeroCloud': '零云端依赖',
  'comparison.standardMd': '通用文件格式',
  'comparison.dualEdit': '双编辑模式',
  'comparison.versionDiff': '版本对比',
  'comparison.free': '完全免费',
  'comparison.yes': '支持',
  'comparison.no': '不支持',
  'comparison.exceptSync': '(同步除外)',
  'comparison.sourceOnly': '(仅源码)',
  'comparison.wysiwygOnly': '(仅富文本)',
  'comparison.limited': '有限',
  'comparison.basic': '基础',
  'comparison.proprietary': '私有格式',

  // Tech Stack
  'techStack.title': '现代技术栈',
  'techStack.subtitle': '基于成熟的开源技术构建，性能卓越，安全可靠',

  // Download
  'download.title': '开始使用 AI-Note',
  'download.subtitle': '完全免费，开源，无需注册',
  'download.macos': 'macOS',
  'download.windows': 'Windows',
  'download.linux': 'Linux',

  // Footer
  'footer.description': '本地优先的 Markdown 笔记应用',
  'footer.slogan': '你的笔记，你做主',
  'footer.product': '产品',
  'footer.resources': '资源',
  'footer.docs': '文档',
  'footer.changelog': '更新日志',
  'footer.roadmap': '路线图',
  'footer.copyright': '版权所有',
} as const

export type TranslationKey = keyof typeof zh
export default zh
