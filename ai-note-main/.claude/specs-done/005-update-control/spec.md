# 005 - 应用更新管控 spec

> 基于 PRD 3.11 + prototype.html 编写，prototype 为 UI 唯一真相

---

## ① 用户旅程

### 旅程 A：管理员发布新版本

1. 使用 `/release` skill 构建安装包并上传到七牛云 CDN
2. 打开后台管理面板 `https://sspprriinngg.cn/admin?key=xxx`
3. 点击「同步 CDN 版本」按钮，系统从 CDN 拉取最新版本文件列表
4. 新版本自动出现在版本列表中，状态为「草稿」
5. 确认版本无误后，打开该版本的「发布开关」
6. 状态变为「已发布」，用户可以收到更新通知

### 旅程 B：用户自动收到更新

1. 用户正常使用 AI-Note 桌面端
2. 应用启动 2 分钟后，后台静默调用 `GET /api/updates/check`
3. 服务器返回有新版本（仅返回 `is_published=1` 的版本）
4. 右下角弹出通知条「发现新版本 vX.X.X — 包含 N 项更新，点击查看详情」
5. 用户点击「查看详情」→ 打开更新弹窗，显示版本号、更新说明、文件大小
6. 用户点击「立即更新」→ 从 CDN 下载安装包，弹窗显示进度条
7. 下载完成 → 提示「更新将在重启应用后生效」，可选择「立即重启」或「稍后重启」
8. 用户点击「忽略」→ 通知条关闭，本次启动不再提示

### 旅程 C：用户手动检查更新

1. 用户在设置/关于页面点击「检查更新」按钮
2. 弹窗显示「正在检查更新...」
3. 若有更新 → 进入旅程 B 步骤 5
4. 若无更新 → 弹窗提示「已是最新版本 — 当前版本 vX.X.X 已经是最新」
5. 若检查失败 → 弹窗提示「检查更新失败 — 无法连接到更新服务器，请检查网络后重试」，可重试

### 旅程 D：数据采集

1. 应用每次启动时，上报 `app_open` 事件（device_id, app_version, platform）
2. 应用退出/切到后台时，上报 `app_close` 事件，附带本次使用时长（duration 秒）
3. 管理员在后台面板查看汇总数据（UV/PV/时长）和趋势图

---

## ② 数据模型 + API

### 数据库变更

#### `analytics_events` 表 — 新增 `duration` 字段

```sql
ALTER TABLE analytics_events ADD COLUMN duration INTEGER DEFAULT NULL;
-- duration: 使用时长（秒），仅 app_close 事件有值
```

现有字段保持不变：`id, device_id, user_id, user_email, event, app_version, platform, created_at`

#### `releases` 表 — 无变更

已有字段满足需求：`id, version, platform, filename, original_name, file_size, release_notes, is_published, download_count, created_at, published_at`

### API 变更

#### 1. `POST /api/analytics/event` — 扩展请求体

**现有**，增加 `duration` 字段：

```typescript
// Request
{
  deviceId: string        // UUID, 首次启动生成并持久化
  userId?: string
  userEmail?: string
  event: 'app_open' | 'app_close'  // 新增 app_close
  appVersion?: string     // e.g. "0.3.0"
  platform?: string       // "darwin" | "win32" | "linux"
  duration?: number       // 秒，仅 app_close 时有值
}

// Response
{ success: true }
```

#### 2. `GET /api/admin/stats` — 扩展响应

**现有**，增加平均时长、每日趋势数据：

```typescript
// Request
GET /api/admin/stats?key=ADMIN_KEY&days=7

// Response
{
  todayUv: number          // 今日独立设备数
  todayPv: number          // 今日打开次数（app_open 事件数）
  avgDuration: number      // 近 N 天平均使用时长（分钟）
  totalUsers: number       // 累计独立设备数
  trend: [                 // 每日趋势
    { date: "2026-03-15", uv: 32, pv: 156, avgDuration: 23.5 }
  ]
  versionStats: [          // 每版本 UV/PV
    { version: "0.3.0", uv: 0, pv: 0 },
    { version: "0.2.0", uv: 18, pv: 89 }
  ]
}
```

#### 3. `POST /api/admin/releases/sync` — 新增：同步 CDN 版本

```typescript
// Request
POST /api/admin/releases/sync?key=ADMIN_KEY

// Response
{
  success: true,
  synced: number,     // 新同步的版本数
  total: number       // 总版本数
}
```

**逻辑**：
- 请求七牛云 CDN 的 `/releases/` 路径，解析 `latest-mac.yml` 和 `latest.yml`
- 从 YAML 中提取 version、filename、fileSize、path
- 对比数据库中已有 releases 记录（按 version + platform 唯一索引）
- 新版本插入数据库，默认 `is_published = 0`
- 已有版本不覆盖

#### 4. `GET /api/updates/check` — 现有，无变更

```typescript
// Request
GET /api/updates/check?version=0.2.0&platform=darwin

// Response (有更新)
{
  hasUpdate: true,
  version: "0.3.0",
  releaseNotes: "...",
  fileSize: 164626432,
  downloadUrl: "https://sspprriinngg.cn/releases/INote-0.3.0-arm64.dmg"
}

// Response (无更新)
{ hasUpdate: false }
```

#### 5. `PUT /api/admin/releases/:id/notes` — 新增：编辑更新说明

```typescript
// Request
PUT /api/admin/releases/:id/notes?key=ADMIN_KEY
{ releaseNotes: "- 新增画板保存优化\n- 修复 AI 模块问题" }

// Response
{ success: true }
```

---

## ③ UI 功能点

### Page 1：后台管理面板

#### [AdminHeader] 页面头部
- 标题：`AI-Note 管理后台`，#fff 20px font-weight:600
- 副标题：`版本管理 · 发布控制`，#999 13px
- 背景色：#1a1a2e

#### [StatsRow-1] 基础统计卡片（4 列 grid）
- 卡片：白色背景 #fff，圆角 10px，padding 20px，shadow `0 1px 3px rgba(0,0,0,0.08)`
- 标签：12px #999 uppercase letter-spacing:0.5px
- 数值：28px font-weight:700 #1a1a2e
- 副文本：12px #999
- 4 张卡片：
  - 「总版本数」— 数值 + "N 个平台"
  - 「已发布」— 数值绿色 #16a34a + "当前活跃版本"
  - 「总下载量」— 数值 + "所有版本累计"
  - 「最新版本」— 版本号 22px + 上传日期

#### [StatsRow-2] 使用统计卡片（4 列 grid）
- 样式同 StatsRow-1
- 4 张卡片：
  - 「今日 UV」— 数值 + 较昨日百分比（绿色 #16a34a）
  - 「今日 PV」— 数值 + 较昨日百分比
  - 「平均使用时长」— "XX min" 22px + "近 7 天均值"
  - 「累计用户」— 数值 + "独立设备总数"

#### [TrendChart] 使用趋势图
- 容器：白色圆角 10px 卡片，padding 20px 24px
- 标题：`使用趋势` 16px font-weight:600
- 时间切换按钮组：`7 天` / `30 天` / `90 天`
  - 默认态：#fff 背景，1px #e5e7eb 边框，#666 文字，12px，圆角 6px
  - 激活态：#6366f1 背景，白色文字
  - hover 非激活：#f9fafb 背景
- 图表区域：高 200px，左下边框 #e5e7eb
- Canvas 绘制三条线：
  - UV 线：#6366f1 实线 + 填充区域 rgba(99,102,241,0.08)
  - PV 线：#a5b4fc 实线
  - 平均时长线：#f59e0b 虚线 [4,3]
- 数据点 ≤14 天时显示圆点（半径 2.5px）
- Y 轴标签：左侧 10px #bbb
- X 轴标签：底部日期 10px #bbb
- 图例：居中，三项，圆点 10x10px + 文字 12px #666

#### [VersionTable] 版本列表
- 容器：白色圆角 10px 卡片
- 头部：padding 18px 24px，标题 `版本列表` 16px，右侧「同步 CDN 版本」按钮
  - 同步按钮：#f3f4f6 背景，#374151 文字，带刷新图标 SVG 14x14
  - 点击后从 CDN 拉取版本列表
- 表格 10 列，列宽配置：
  | 列 | 宽度 | 对齐 |
  |---|---|---|
  | 版本 | 70px | 左 |
  | 平台 | 80px | 左 |
  | 文件大小 | 80px | 左 |
  | 下载链接 | min 180px | 左 |
  | 状态 | 70px | 左 |
  | 发布开关 | 70px | 居中 |
  | 下载 | 50px | 右 |
  | UV/PV | 80px | 居中 |
  | 上传时间 | 140px | 左 |
  | 操作 | 60px | 左 |
- 表头：10px 14px padding，12px #999 uppercase，#fafafa 背景，nowrap
- 单元格：12px 14px padding，13px，nowrap，#f5f5f5 下边框
- hover 行：#fafafa 背景
- 版本号：**bold**
- 平台标签：
  - macOS：#ede9fe 背景 #7c3aed 文字
  - Windows：#dbeafe 背景 #2563eb 文字
  - Linux：#fef3c7 背景 #d97706 文字
  - 样式：2px 8px padding，圆角 4px，11px font-weight:500
- 下载链接：#6366f1 文字，12px，无下划线，hover 显示完整 URL（title 属性）
- 状态 badge：
  - 已发布：#dcfce7 背景 #16a34a 文字
  - 草稿：#f3f4f6 背景 #6b7280 文字
  - 样式：3px 10px padding，圆角 12px，12px font-weight:500
- 发布开关（Toggle Switch）：
  - 尺寸：40x22px
  - 关闭态：#e5e7eb 轨道
  - 开启态：#22c55e 轨道
  - 滑块：16x16px 白色圆形，过渡 0.3s
  - 切换时联动状态 badge（已发布 ↔ 草稿）
- UV/PV：格式 `UV / PV`，UV 色 #6366f1，PV 色 #a5b4fc
- 删除按钮：#fee2e2 背景 #dc2626 文字，hover #fecaca
- 同版本多平台行合并：版本列 rowspan，上传时间列 rowspan，操作列 rowspan

### Page 2：桌面端更新流程

#### [AppSidebar] 模拟侧边栏
- 宽 220px，背景 #16162a，左侧固定
- 文件列表项：13px #888，padding 6px 10px，圆角 4px
- 激活项：#2a2a3e 背景 #fff 文字

#### [AppContent] 模拟编辑区
- margin-left: 220px（避开侧边栏）
- 标题：18px #fff
- 编辑器：#2a2a3e 背景，圆角 8px，padding 20px，14px #888 行高 1.8

#### [Countdown] 倒计时提示
- 位置：fixed 右上角（top:60px right:24px）
- 样式：rgba(255,255,255,0.1) 背景，backdrop-filter:blur(10px)，圆角 8px
- 文字：12px #999，倒计时数字 14px #6366f1 bold
- 模拟原型中 5 秒倒计时（实际应用中为 2 分钟）

#### [UpdateToast] 更新通知条
- 位置：fixed 右下角（bottom:24px right:24px）
- 样式：白色背景，圆角 10px，shadow `0 8px 30px rgba(0,0,0,0.25)`，min-width:300px
- 入场动画：translateY(120px) opacity:0 → translateY(0) opacity:1，0.4s cubic-bezier(0.16,1,0.3,1)
- 左侧图标：36x36px #ede9fe 背景圆角 8px，内含 #6366f1 下载 SVG
- 标题：`发现新版本 vX.X.X` 13px bold #1a1a2e
- 描述：`包含 N 项更新，点击查看详情` 12px #999
- 两个按钮：
  - 「查看详情」：#6366f1 背景白色文字，hover #4f46e5
  - 「忽略」：#f3f4f6 背景 #666 文字，hover #e5e7eb
  - 样式：4px 12px padding，圆角 4px，12px
- 整个通知条可点击打开弹窗

#### [UpdateModal] 更新弹窗
- 遮罩：rgba(0,0,0,0.5)，居中弹窗
- 弹窗容器：白色背景，圆角 12px，宽 420px，shadow `0 20px 60px rgba(0,0,0,0.3)`
- 入场：scale(0.95) → scale(1)，0.3s
- 头部：`软件更新` 16px bold，右侧关闭按钮 28x28px #f3f4f6 圆角 6px

#### [UpdateModal] 状态：正在检查
- 居中 spinner：36x36px，3px 边框，顶部 #6366f1，其余 #e5e7eb，旋转 0.8s
- 文字：`正在检查更新...` 14px #666
- 底部：无按钮

#### [UpdateModal] 状态：发现新版本
- 版本 badge：`vX.X.X` #ede9fe 背景 #6366f1 文字，4px 12px padding，圆角 20px
- 标题：`发现新版本` 14px bold
- 当前版本：`当前版本: vX.X.X` 12px #999
- 更新说明：#f9fafb 背景圆角 8px，14px padding，13px #555 行高 1.6
  - 标题 `更新内容：` bold 12px #333
  - 列表 `<ul>` margin-left:18px
- 文件大小：`文件大小: XXX MB` 12px #999
- 底部按钮：「稍后再说」(secondary) + 「立即更新」(primary)

#### [UpdateModal] 状态：下载中
- 标题：`正在下载更新 vX.X.X` 14px bold
- 进度条：6px 高，#e5e7eb 背景，填充 linear-gradient(90deg, #6366f1, #818cf8)，圆角 3px
- 进度文字：左 `XX%`，右 `X.X MB/s`，12px #999
- 底部按钮：「后台下载」(secondary)

#### [UpdateModal] 状态：下载完成
- 绿色勾选图标：48x48px #dcfce7 背景圆形
- 标题：`下载完成` 14px bold
- 描述：`更新将在重启应用后生效` 13px #666
- 底部按钮：「稍后重启」(secondary) + 「立即重启」(primary)

#### [UpdateModal] 状态：已是最新
- 蓝色勾选图标：48x48px #f0f9ff 背景圆形
- 标题：`已是最新版本` 14px bold
- 描述：`当前版本 vX.X.X 已经是最新` 13px #666
- 底部按钮：「关闭」(secondary)

#### [UpdateModal] 状态：检查失败
- 红色感叹号图标：48x48px #fef2f2 背景圆形
- 标题：`检查更新失败` 14px bold
- 描述：`无法连接到更新服务器，请检查网络后重试` 13px #999
- 底部按钮：「关闭」(secondary) + 「重试」(primary)

---

## ④ 测试点

### 服务器 API

- [ ] T-01 `POST /api/analytics/event` 发送 `app_open` 事件（含 deviceId, appVersion, platform）→ 返回 `{ success: true }`，数据库新增记录
- [ ] T-02 `POST /api/analytics/event` 发送 `app_close` 事件（含 duration: 1200）→ 返回 `{ success: true }`，数据库记录包含 duration 值
- [ ] T-03 `POST /api/admin/releases/sync?key=ADMIN_KEY` → 返回 `{ success: true, synced: N }`，数据库新增 CDN 上存在但本地没有的版本
- [ ] T-04 同步后新版本 `is_published` 默认为 0（草稿）
- [ ] T-05 `PUT /api/admin/releases/:id/publish` 切换发布状态 → `is_published` 在 0/1 间切换，`published_at` 更新
- [ ] T-06 `GET /api/updates/check?version=0.2.0&platform=darwin` 当有已发布的更高版本时 → 返回 `{ hasUpdate: true, version, releaseNotes, ... }`
- [ ] T-07 `GET /api/updates/check` 当最高版本为草稿时 → 返回 `{ hasUpdate: false }`
- [ ] T-08 `GET /api/admin/stats?key=ADMIN_KEY&days=7` → 返回包含 `todayUv, todayPv, avgDuration, totalUsers, trend[], versionStats[]`
- [ ] T-09 `PUT /api/admin/releases/:id/notes?key=ADMIN_KEY` 更新 releaseNotes → 成功，后续 check 返回新说明
- [ ] T-10 `DELETE /api/admin/releases/:id?key=ADMIN_KEY` → 删除成功，列表中不再出现

### 桌面端更新检查

- [ ] T-11 应用启动后 2 分钟自动调用 `/api/updates/check` → 网络请求发出（可通过日志验证）
- [ ] T-12 服务器返回有更新 → 右下角弹出通知条，显示版本号和更新数量
- [ ] T-13 服务器返回无更新 → 不弹出任何通知，不打扰用户
- [ ] T-14 点击通知条「查看详情」→ 打开更新弹窗，显示版本号、更新说明、文件大小
- [ ] T-15 点击通知条「忽略」→ 通知条关闭，本次启动不再弹出
- [ ] T-16 更新弹窗点击「立即更新」→ 开始下载，显示进度条和下载速度
- [ ] T-17 下载完成 → 弹窗切换为「下载完成」状态，可选择「立即重启」或「稍后重启」
- [ ] T-18 点击「稍后再说」→ 弹窗关闭，不下载
- [ ] T-19 手动检查更新（设置页）→ 弹窗显示 spinner，然后显示结果（有更新/已最新/失败）
- [ ] T-20 网络错误时检查更新 → 弹窗显示「检查更新失败」，可重试

### 数据采集

- [ ] T-21 应用启动时上报 `app_open` 事件，包含正确的 device_id、app_version、platform
- [ ] T-22 device_id 首次生成后持久化，多次启动保持一致
- [ ] T-23 应用退出时上报 `app_close` 事件，duration 值 > 0（秒）
- [ ] T-24 应用切到后台（窗口 blur）时不上报（仅退出时上报）

### 后台管理面板

- [ ] T-25 打开后台页面 → 显示 8 张统计卡片（总版本数、已发布、总下载量、最新版本、今日 UV、今日 PV、平均时长、累计用户）
- [ ] T-26 趋势图默认显示 7 天数据 → 三条线（UV/PV/时长）正确渲染
- [ ] T-27 切换趋势图时间范围（7/30/90 天）→ 图表重新渲染对应数据
- [ ] T-28 版本列表显示所有版本 → 列包含：版本、平台、文件大小、下载链接、状态、发布开关、下载数、UV/PV、上传时间、操作
- [ ] T-29 切换发布开关 → 状态 badge 在「已发布」↔「草稿」间切换，调用 API 更新数据库
- [ ] T-30 点击删除按钮 → 确认后删除版本记录，从列表中消失
- [ ] T-31 点击「同步 CDN 版本」→ 调用 sync API，新版本出现在列表中（草稿状态）
- [ ] T-32 同版本多平台（如 0.1.0 有 macOS + Windows）→ 版本列、上传时间列、操作列合并显示（rowspan）
