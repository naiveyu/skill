# AI-Note 项目 URL 汇总

## 官网

| URL | 说明 |
|-----|------|
| `https://sspprriinngg.cn` | AI-Note 官网（营销落地页） |

## 生产环境

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `https://sspprriinngg.cn` | 主域名（官网 + API + 管理后台） | `apps/website/src/lib/constants.ts`, `deploy/nginx.conf` |
| `https://sspprriinngg.cn/api/` | API 前缀（反向代理到 localhost:3456） | `deploy/nginx.conf` |
| `https://sspprriinngg.cn/api/health` | 健康检查端点 | `docs/deploy-guide.md` |
| `https://sspprriinngg.cn/admin` | 管理后台（需 `?key=YOUR_ADMIN_KEY`） | `deploy/nginx.conf` |

## 下载 & 发布

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `https://sspprriinngg.cn/ainote/releases/INote-0.3.0-arm64.dmg` | macOS ARM64 安装包 | `apps/website/src/lib/constants.ts` |
| `http://releases.sspprriinngg.cn` | electron-builder 发布服务器 | `apps/desktop/package.json` |

## GitHub

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `https://github.com/this-spring/ai-note` | 项目仓库 | `apps/website/src/lib/constants.ts`, `README.md` |

## 本地开发

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `http://localhost:3456` | Auth 服务器（开发） | `apps/desktop/src/main/services/auth-service.ts` |
| `http://localhost:5173` | Electron 渲染进程 Vite 开发服务器 | `docs/technical-design.md` |
| `http://localhost:3001` | 官网开发服务器 | `CLAUDE.md` |
| `http://10.0.2.2:3456` | Android 模拟器桥接到宿主机 Auth 服务器 | `apps/mobile/src/services/auth-service.ts` |

## 发布平台

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `https://mp.weixin.qq.com` | 微信公众号平台 | `apps/desktop/src/main/services/publish/publishers/wechat-publisher.ts` |
| `https://creator.xiaohongshu.com` | 小红书创作者平台 | `apps/desktop/src/main/services/publish/publishers/xhs-publisher.ts` |
| `https://www.xiaohongshu.com` | 小红书主站（增长自动化） | `scripts/growth-browser.mjs` |
| `https://channels.weixin.qq.com` | 微信视频号平台 | `scripts/growth-browser.mjs` |
| `https://x.com` | Twitter/X 平台 | `apps/desktop/src/main/services/publish/publishers/twitter-publisher.ts` |

## 部署

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `root@sspprriinngg.cn` | 服务器 SSH 地址 | `deploy/setup-server.sh`, `docs/deploy-guide.md` |

## 外部参考（投稿目标）

| URL | 说明 | 来源文件 |
|-----|------|----------|
| `https://github.com/sindresorhus/awesome-electron` | awesome-electron 列表 | `docs/operation-guide.md` |
| `https://github.com/awesome-selfhosted/awesome-selfhosted` | awesome-selfhosted 列表 | `docs/operation-guide.md` |
