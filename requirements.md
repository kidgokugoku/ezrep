# Requirements Specification - Request Repeater

## 用户需求确认 ✅

### 1. URL绑定逻辑
- ✅ **路径匹配** - 支持通配符 (如 `https://example.com/users/*`)

### 2. 列表排序
- ✅ **按上次执行时间排序** - 最近执行的在前

### 3. Cookie替换策略
- ✅ **每个请求独立配置** - 每个请求可以指定不同的cookie替换项
- ✅ **留空即为全部** - Cookie Replace List为空时，使用当前页面的所有cookie
- ✅ **指定项替换** - 填写cookie名称时，仅替换指定的cookie项，保留curl中其他cookie

### 4. UI交互方式
- ✅ **Tampermonkey菜单项** - 点击TM图标显示脚本菜单
- ✅ **菜单样式** - 原生TM菜单样式（无法自定义）
- ⚠️ **设计变更** - 不需要浮动按钮/侧边栏，简化为菜单驱动

### 5. 响应显示
- ✅ **通知方式** - 5秒后自动消失的通知
- 显示内容：状态码、响应时间、简要结果

### 6. 管理页面
- ✅ **入口** - 通过脚本菜单打开
- ✅ **功能**:
  - 查看所有绑定的请求（URL+curl命令）
  - 编辑/删除请求
  - 导入/导出配置（备份/分享）
  - 统计信息（执行次数/成功率）

### 7. Curl支持范围
- ✅ **完整支持** - 所有curl参数（GET/POST/PUT/DELETE, Headers, Body, Auth等）

### 8. 存储方案
- ✅ **最佳实践** - 使用 GM_setValue/GM_getValue（支持云同步）

### 9. 高级功能
- ✅ **批量执行** - 一次执行多个请求
- ✅ **统计信息** - 执行次数、成功率、平均响应时间

---

## 架构调整

### UI设计变更（重要）

#### 原计划（废弃）
- ❌ 浮动按钮 + 侧边栏
- ❌ 复杂的自定义UI

#### 新方案（确认）
- ✅ **菜单驱动模式**
  - 主菜单：`GM_registerMenuCommand("Request Repeater")`
  - 子菜单项：
    1. "执行当前页面请求" - 弹出当前URL匹配的请求列表
    2. "添加新请求" - 弹出添加表单
    3. "管理所有请求" - 打开管理页面
    4. "设置" - 全局配置

- ✅ **弹窗UI**
  - Modal对话框（覆盖层 + 居中窗口）
  - 简洁样式（不需要复杂动画）
  - Shadow DOM隔离

- ✅ **通知系统**
  - 使用GM_notification或自定义toast
  - 5秒自动消失
  - 显示：状态码、响应时间、成功/失败

---

## 数据结构（更新）

```javascript
{
  "requests": [
    {
      "id": "uuid-v4",
      "name": "Get User Info",
      "urlPattern": "https://example.com/users/*",  // 路径匹配
      "curl": "curl 'https://api...' -H 'Auth: xxx'",
      "parsedRequest": {
        "url": "https://api.example.com/users",
        "method": "GET",
        "headers": {...},
        "body": null
      },
      "cookieReplace": ["sessionId", "token"],  // 独立配置
      "createdAt": 1736745230000,
      "lastExecuted": 1736745230000,
      "statistics": {
        "executionCount": 42,
        "successCount": 40,
        "failureCount": 2,
        "avgResponseTime": 235  // ms
      }
    }
  ],
  "globalConfig": {
    "defaultCookieReplace": ["sessionId"],
    "notificationDuration": 5000,
    "enableBatchExecution": true
  }
}
```

---

## 功能清单（最终版）

### 核心功能
- [x] 添加curl命令并绑定到URL模式
- [x] 路径匹配（通配符支持）
- [x] 执行请求（cookie替换）
- [x] 删除请求
- [x] 编辑请求
- [x] 按上次执行时间排序

### 响应处理
- [x] 5秒通知（状态码、响应时间）
- [x] 成功/失败提示

### 管理页面
- [x] 查看所有请求（URL+curl）
- [x] 编辑/删除
- [x] 导入/导出配置
- [x] 统计信息（执行次数、成功率、平均响应时间）

### 高级功能
- [x] 批量执行
- [x] 完整curl语法支持
- [x] 每个请求独立配置cookie替换项
- [x] 云同步（GM_setValue自带）

---

## 实现优先级

### P0 - 核心功能（必须）
1. StorageAdapter - 数据持久化
2. CurlParser - curl解析
3. RequestExecutor - 请求执行 + cookie替换
4. RequestManager - CRUD操作
5. 基础菜单 + 弹窗UI

### P1 - 重要功能
6. 管理页面
7. 通知系统
8. 统计信息

### P2 - 增强功能
9. 批量执行
10. 导入/导出
11. 错误处理优化

---

## 技术栈（最终确认）

| Component | Technology | Notes |
|-----------|-----------|-------|
| 菜单系统 | GM_registerMenuCommand | 原生TM菜单 |
| 弹窗UI | Modal + Shadow DOM | 隔离样式 |
| 通知 | GM_notification / Custom Toast | 5秒自动消失 |
| Curl解析 | curlconverter | 完整语法支持 |
| HTTP | GM_xmlhttpRequest | Promise包装 |
| Cookie | GM_cookie API | 绕过HttpOnly |
| 存储 | GM_setValue/getValue | 云同步 |
| 管理页面 | 独立HTML + GM API | 通过菜单打开 |
