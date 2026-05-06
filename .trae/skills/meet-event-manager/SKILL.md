---
name: "meet-event-manager"
description: "梳理与实现见面会活动管理规则：创建/切换/修改/加入/退出/转交管理员，并覆盖查重与权限边界。Invoke when 需要设计或实现见面会活动管理逻辑，或排查相关权限/边界 bug。"
---

# Meet Event Manager

## 适用场景（When to invoke）
- 需要把“见面会活动”的业务规则整理成清晰的接口与行为约定
- 需要实现活动创建/加入/退出/管理员转交等逻辑，并覆盖边界条件
- 线上出现“重复活动/权限错乱/管理员无法退出”等问题，需要复盘与修复建议

## 输入要求（Inputs）
- 当前用户：`user.id`、`user.nickname`
- 当前数据：`meets[]`、`currentMeetId`（可选）、参与者列表 `participants[]`
- 操作意图（任选其一）：
  - 创建活动：name、location、figures、time
  - 切换活动：meetId
  - 修改活动：meetId + updates
  - 加入/退出：meetId
  - 转交管理员：meetId + fromUserId + toUserId

## 工作流程（Workflow）
1. 明确对象与权限：活动是否存在、当前用户是否有管理权限
2. 定义查重规则：创建活动时按 `name` 查重，命中则复用而非新建
3. 统一状态写入：更新 `currentMeetId`、`adminId`、`participants` 后持久化
4. 覆盖关键边界：
   - 加入活动：已加入则拒绝
   - 退出活动：管理员退出前必须先转交（除非仅剩自己或没有其他参与者）
   - 修改活动：仅管理员可改；若历史数据无 `adminId`，则补齐为当前操作者
   - 转交管理员：目标必须已加入活动
5. 输出固定结构：成功/失败 + message + 必要的变更结果

## 输出格式（Outputs）
- `success: boolean`
- `message?: string`（失败原因或提示）
- `data?: object`（如：meet、currentMeetId、newAdminName 等）

## 示例（Examples）
### 示例 1：创建活动（按 name 查重）
- 用户输入：
  - 操作：创建活动
  - name: "上海见面会"
  - user: { id: "u1", nickname: "Alice" }
- 期望行为：
  - 若不存在同名活动：新建活动，`adminId = u1`，`participants` 默认包含创建者，并切换为当前活动
  - 若已存在同名活动：返回已有活动并切换为当前活动（不重复创建）

### 示例 2：修改活动（仅管理员）
- 用户输入：
  - 操作：修改活动
  - meetId: "meet_100"
  - updates: { location: "梅奔" }
  - user: { id: "u2", nickname: "Bob" }
- 期望行为：
  - 若 `adminId` 存在且不等于 `u2`：失败并提示无权限
  - 若历史数据缺 `adminId`：补齐 `adminId = u2` 后再更新

### 示例 3：管理员退出（需先转交）
- 用户输入：
  - 操作：退出活动
  - meetId: "meet_100"
  - userId: "u1"（管理员）
  - participants: [u1, u2]
- 期望行为：失败并提示先转交管理员身份

## 参考实现（Source）
- 该示例的规则抽取自 meet 项目的业务模块：`D:\meet\src\skill\index.js` 中的 `createMeet / updateMeet / joinMeet / leaveMeet / transferAdmin`

