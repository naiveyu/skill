---
name: release
description: 构建桌面应用安装包并上传到七牛云分发服务器
---

# 发布桌面应用

构建桌面应用安装包并上传到七牛云分发服务器，使用户可通过应用内自动更新获取新版本。

## Usage
```
/release
/release mac
/release win
/release all
```

不带参数默认构建 macOS 版本。参数: $ARGUMENTS

## 执行步骤

### 第 1 步：预检查

1. 确认工作区干净（无未提交的改动），如有改动提醒用户先提交：
```bash
git status --short
```

2. 读取当前版本号：
```bash
node -e "console.log(require('./apps/desktop/package.json').version)"
```

3. 询问用户：是否需要升级版本号？
   - 如果需要，按用户指定的版本号更新 `apps/desktop/package.json` 中的 `version` 字段
   - 如果不需要，保持当前版本继续

### 第 2 步：清理旧产物

删除 dist 目录下不属于当前版本的旧文件，释放磁盘空间：
```bash
cd apps/desktop/dist && ls -lh
```
只保留当前版本的文件，删除旧版本的 .dmg、.zip、.exe、.blockmap 等。

### 第 3 步：构建安装包

根据参数执行构建（在项目根目录执行）：

- **mac**（默认）：`pnpm dist:mac`
- **win**：`pnpm dist:win`
- **all**：先 `pnpm dist:mac`，再 `pnpm dist:win`

构建耗时较长，耐心等待。完成后确认产物：
```bash
ls -lh apps/desktop/dist/*.{dmg,zip,exe,yml,blockmap} 2>/dev/null
```

向用户报告构建产物列表和文件大小。

### 第 4 步：上传到七牛云

使用七牛云凭证上传：
```bash
QINIU_ACCESS_KEY=RvXUn1uxPVethe4Wo3uwLk5BlXO_48OA-R3cpPK3 \
QINIU_SECRET_KEY=1fWi9gTzGsSDZGdv6NxwEMkCPECNti1k2KIVlXkT \
node scripts/upload-release.mjs
```

确认上传结果：所有文件 Failed: 0。

### 第 5 步：验证发布

验证更新元数据可访问：
```bash
curl -s http://releases.sspprriinngg.cn/latest-mac.yml | head -5
```

确认版本号与构建版本一致。

### 第 6 步：报告结果

向用户报告：
- 发布版本号
- 构建平台
- 上传文件列表
- 分发 URL：`http://releases.sspprriinngg.cn`
- 提示：用户可在应用内「检查更新」获取新版本

## Safety
- 构建前必须确认工作区干净
- 版本号变更需用户确认
- 上传失败时报告错误，不自动重试

## Working Directory
/Users/bytedance/self-project/ai-note
