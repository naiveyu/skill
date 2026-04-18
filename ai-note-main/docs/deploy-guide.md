# INote 发布手册

## 架构概览

```
用户浏览器 / 桌面端
        │
        ▼
   Nginx (:443 SSL)  ─── sspprriinngg.cn
        │
        ├── /            → 静态文件 /opt/inote/website/  (官网)
        ├── /api/*       → proxy → Node.js :3456         (API 服务)
        └── /admin*      → proxy → Node.js :3456         (管理后台)

PM2 管理 Node.js 进程（自动重启 + 开机自启）
```

| 组件 | 技术栈 | 部署方式 |
|------|--------|---------|
| 官网 | Next.js SSG | Nginx 静态文件 |
| API 服务 | Fastify + SQLite | PM2 进程管理 |
| 管理后台 | 内嵌 HTML | 随 API 服务提供 |

---

## 一、首次部署

### 1.1 服务器环境要求

- 腾讯云 CentOS 7/8 服务器
- 域名 `sspprriinngg.cn` 已完成 ICP 备案
- DNS A 记录指向服务器公网 IP
- 开放端口：80、443

### 1.2 上传部署文件到服务器

```bash
# 在本地项目根目录执行
scp -r deploy/ root@sspprriinngg.cn:/opt/inote/deploy/
```

### 1.3 服务器初始化

SSH 登录服务器，执行初始化脚本：

```bash
ssh root@sspprriinngg.cn
bash /opt/inote/deploy/setup-server.sh
```

脚本自动完成：
- 安装 Node.js 20
- 安装 PM2（进程管理）+ 配置开机自启
- 安装 Nginx + 配置反向代理
- 安装 certbot + 申请 SSL 证书

### 1.4 修改 ADMIN_KEY

**重要：** 修改管理后台密钥（默认 `inote-admin-2024`）：

```bash
# 在服务器上
vim /opt/inote/deploy/ecosystem.config.cjs
# 修改 ADMIN_KEY 为你自己的密钥
```

### 1.5 首次部署应用

回到本地机器执行：

```bash
./deploy.sh
```

### 1.6 使用 PM2 配置启动

```bash
# 在服务器上
cd /opt/inote
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

### 1.7 验证

- 官网：`https://sspprriinngg.cn`
- API 健康检查：`https://sspprriinngg.cn/api/health`
- 管理后台：`https://sspprriinngg.cn/admin?key=YOUR_ADMIN_KEY`

---

## 二、日常更新

### 2.1 更新官网 + 服务端（完整部署）

```bash
# 本地执行，一键构建+上传+重启
./deploy.sh
```

### 2.2 仅更新官网

```bash
pnpm build:website
rsync -avz --delete apps/website/out/ root@sspprriinngg.cn:/opt/inote/website/
```

### 2.3 仅更新服务端

```bash
pnpm build:server
rsync -avz --delete apps/server/dist/ root@sspprriinngg.cn:/opt/inote/server/dist/
rsync -avz apps/server/public/ root@sspprriinngg.cn:/opt/inote/server/public/
ssh root@sspprriinngg.cn "pm2 restart inote-server"
```

---

## 三、发布桌面端新版本

### 3.1 构建桌面端安装包

```bash
pnpm build
```

构建产物路径：`apps/desktop/dist/` (dmg/exe/AppImage)

### 3.2 上传到管理后台

1. 打开 `https://sspprriinngg.cn/admin?key=YOUR_ADMIN_KEY`
2. 滚动到"版本管理"区块
3. 填写版本号（如 `1.0.0`）
4. 选择平台（macOS / Windows / Linux）
5. 填写更新说明
6. 选择安装包文件
7. 点击"上传"

### 3.3 发布版本

- 上传成功后，版本状态为"草稿"
- 点击"发布"按钮，状态变为"已发布"
- 用户启动桌面端后会自动收到更新提示

### 3.4 回滚

如需撤回某个版本：
- 点击该版本的"取消发布"按钮
- 或直接"删除"该版本

---

## 四、运维操作

### 4.1 查看日志

```bash
# PM2 日志
pm2 logs inote-server

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 4.2 服务管理

```bash
# 重启服务
pm2 restart inote-server

# 停止服务
pm2 stop inote-server

# 查看状态
pm2 status

# 监控（CPU/内存）
pm2 monit
```

### 4.3 SSL 证书续期

certbot 会自动续期。手动续期：

```bash
certbot renew
systemctl reload nginx
```

### 4.4 数据备份

服务端数据存储在 `/opt/inote/server/data/`：

```bash
# 备份
tar czf inote-backup-$(date +%Y%m%d).tar.gz /opt/inote/server/data/

# 恢复
tar xzf inote-backup-YYYYMMDD.tar.gz -C /
pm2 restart inote-server
```

数据文件说明：
| 文件 | 内容 |
|------|------|
| `data/inote-auth.sqlite` | 用户账号、反馈、分析数据、版本信息 |
| `data/secret.key` | JWT 签名密钥 |
| `data/releases/` | 上传的桌面端安装包 |

---

## 五、目录结构（服务器端）

```
/opt/inote/
├── website/              # 官网静态文件 (Next.js out/)
│   ├── index.html
│   ├── _next/
│   └── images/
├── server/               # API 服务
│   ├── dist/             # 编译后的 JS
│   ├── public/           # admin.html 等
│   ├── data/             # 数据库 + 上传文件 (需持久化)
│   │   ├── inote-auth.sqlite
│   │   ├── secret.key
│   │   └── releases/
│   ├── logs/             # PM2 日志
│   ├── node_modules/
│   └── package.json
└── deploy/               # 部署配置
    ├── nginx.conf
    ├── ecosystem.config.cjs
    └── setup-server.sh
```

---

## 六、注意事项

1. **ADMIN_KEY 安全**：务必修改默认密钥，不要使用简单密码
2. **数据目录**：`/opt/inote/server/data/` 不会被 deploy.sh 覆盖，确保不手动删除
3. **端口冲突**：API 服务默认占用 3456 端口，确保不与其他服务冲突
4. **防火墙**：腾讯云安全组需开放 80 和 443 端口
5. **备份**：定期备份 `data/` 目录，特别是在更新服务端前
