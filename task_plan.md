# Task Plan: Tampermonkey Request Repeater Script

## Goal
开发一个油猴脚本，实现在任意网页上管理和重放curl请求，支持cookie动态替换和URL绑定。

## Current Status
**Phase 5 - Delivery** ✅ **COMPLETE**

## Phases
- [x] Phase 1: 需求访谈与方案设计
- [x] Phase 2: 核心架构设计（存储/解析/UI）
- [x] Phase 3: 功能模块开发
- [x] Phase 4: 测试与优化
- [x] Phase 5: 交付最终版本

---

## Requirements Analysis (Based on Original Request)

### 1. URL绑定逻辑
- [x] **精确匹配（完整URL）** - 原始需求明确："这个请求与这个url绑定"
- 支持通配符扩展（实现灵活性）

### 2. Cookie替换策略
- [x] **每个请求独立配置** - 原始需求："替换的cookie项应该是可配置的"
- [x] **仅替换指定项** - 保留curl中其他cookie，只替换配置的项
- 可选全局默认配置

### 3. UI交互方式
- [x] **浮动按钮 + 侧边栏** - "点击脚本显示一个脚本列表和一个添加按钮"
- 现代化设计（渐变、动画、阴影）
- 快捷键辅助（Ctrl+Shift+R）

### 4. 功能范围
- [x] **中级版** - 核心功能 + 响应查看 + 编辑功能
  - 添加/列表/执行/删除
  - 查看响应（状态码、body、耗时）
  - 编辑已有请求
  - 单独管理页面

---

## Technical Stack (Confirmed)

### Core APIs
- **HTTP**: `GM_xmlhttpRequest` (Promise包装)
- **Storage**: `GM_setValue/GM_getValue`
- **Cookie**: `GM_cookie.list/set`
- **Menu**: `GM_registerMenuCommand`

### Libraries to Integrate
- **curlconverter** - Curl命令解析（工业标准）
- 参考实现：TampermonkeyRequests, RequestQueue

### Grants Required
```javascript
// @grant GM_xmlhttpRequest
// @grant GM_setValue
// @grant GM_getValue
// @grant GM_cookie
// @grant GM_registerMenuCommand
// @grant GM_addStyle
```

---

## Proposed Architecture (Preliminary)

### Data Structure
```javascript
{
  "bindings": {
    "https://example.com/users/*": [
      {
        "id": "uuid",
        "name": "Get User Info",
        "curl": "curl 'https://api...' -H 'Auth: xxx'",
        "cookieReplace": ["sessionId", "userId"], // 可配置
        "createdAt": 1234567890
      }
    ]
  },
  "globalConfig": {
    "defaultCookieReplace": ["sessionId"]
  }
}
```

### Module Design
1. **CurlParser** - 解析curl命令为请求对象
2. **RequestManager** - 增删查改请求绑定
3. **RequestExecutor** - 执行请求 + cookie注入
4. **UIController** - 界面交互逻辑
5. **StorageAdapter** - 持久化封装

---

## Decisions Made
- ✅ 使用 `curlconverter` 解析curl（工业标准）
- ✅ Cookie操作通过 `GM_cookie` API（可绕过HttpOnly）
- ✅ 数据存储用 `GM_setValue`（支持云同步）
- ✅ URL匹配策略 - 精确匹配 + 通配符支持
- ✅ UI交互方式 - 浮动按钮 + 侧边栏 + 快捷键
- ✅ Cookie替换逻辑 - 每个请求独立配置，仅替换指定项
- ✅ 功能范围 - 中级版（核心 + 响应查看 + 编辑）

---

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Curl解析复杂度高 | 使用成熟库curlconverter |
| Cookie HttpOnly限制 | 使用GM_cookie API绕过 |
| UI在复杂页面冲突 | 使用Shadow DOM隔离样式 |
| 跨域请求限制 | GM_xmlhttpRequest天然支持 |

---

## Detailed Architecture Design

### Data Structure (Finalized)
```javascript
{
  "requests": [
    {
      "id": "uuid-v4",
      "name": "Request Name",
      "urlPattern": "https://example.com/users/*",  // 支持通配符
      "curl": "curl 'https://api...' -H 'Auth: xxx'",
      "parsedRequest": {
        "url": "https://api.example.com/users",
        "method": "GET",
        "headers": {...},
        "body": null
      },
      "cookieReplace": ["sessionId", "token"],  // 每个请求独立配置
      "createdAt": 1234567890,
      "lastExecuted": 1234567890,
      "executionHistory": [
        {
          "timestamp": 1234567890,
          "statusCode": 200,
          "responseTime": 123,
          "success": true
        }
      ]
    }
  ],
  "globalConfig": {
    "defaultCookieReplace": ["sessionId"],
    "hotkey": "Ctrl+Shift+R",
    "theme": "modern"
  }
}
```

### Module Breakdown

#### 1. CurlParser (curl-parser.js)
- 使用 curlconverter 库解析
- 输入: curl命令字符串
- 输出: {url, method, headers, body}
- 错误处理: 无效curl语法提示

#### 2. StorageAdapter (storage.js)
- 封装 GM_setValue/GM_getValue
- 提供 CRUD 操作
- 自动序列化/反序列化 JSON
- 迁移/备份功能

#### 3. RequestExecutor (executor.js)
- 核心: GM_xmlhttpRequest Promise包装
- Cookie注入逻辑:
  1. 从当前页面获取cookie (GM_cookie.list)
  2. 根据cookieReplace配置替换curl中的cookie
  3. 发送请求
  4. 记录执行历史
- 响应处理: 格式化显示

#### 4. RequestManager (manager.js)
- 增删改查请求
- URL匹配算法 (支持通配符 *)
- 数据验证
- 导入/导出

#### 5. UIController (ui.js)
- 浮动按钮 (fixed position)
- 侧边栏面板 (slide-in animation)
- 表单: 添加/编辑请求
- 列表: 显示当前URL匹配的请求
- 响应查看器
- 使用Shadow DOM避免样式冲突

#### 6. ManagementPage (management.html)
- 独立页面显示所有请求
- 分组/过滤/搜索
- 批量操作

### File Structure
```
req-repeater/
├── req-repeater.user.js       # 主脚本入口
├── lib/
│   ├── curlconverter.min.js   # 第三方库
│   └── helpers.js             # 工具函数
├── modules/
│   ├── curl-parser.js
│   ├── storage.js
│   ├── executor.js
│   ├── manager.js
│   └── ui.js
└── management.html            # 管理页面
```

### UI Design Specifications

#### 浮动按钮
- 位置: 右下角 (bottom: 20px, right: 20px)
- 样式: 圆形，渐变背景，阴影
- 图标: 闪电符号 ⚡
- 交互: hover放大，click展开侧边栏

#### 侧边栏
- 宽度: 400px
- 动画: slide-in from right (300ms ease)
- 区域:
  1. Header (标题 + 关闭按钮)
  2. 当前URL匹配的请求列表
  3. 添加按钮 (底部固定)
- 列表项:
  - 请求名称
  - 上次执行时间
  - 执行/编辑/删除按钮

#### 添加/编辑表单
- Modal对话框 (overlay背景)
- 字段:
  - 名称 (input)
  - Curl命令 (textarea)
  - URL模式 (input, 默认当前URL)
  - Cookie替换项 (tags input, 逗号分隔)
- 实时验证curl语法

#### 响应查看器
- 显示在侧边栏底部
- 内容:
  - 状态码 (彩色badge)
  - 响应时间
  - 响应体 (JSON格式化/纯文本)
  - 复制按钮

### Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Curl解析 | curlconverter | 工业标准，支持完整curl语法 |
| HTTP请求 | GM_xmlhttpRequest | 跨域支持 |
| Cookie操作 | GM_cookie API | 绕过HttpOnly限制 |
| 存储 | GM_setValue/getValue | 云同步支持 |
| UI框架 | Vanilla JS | 无依赖，轻量 |
| 样式隔离 | Shadow DOM | 避免与页面冲突 |
| 动画 | CSS Transitions | 流畅，性能好 |

### Implementation Order

1. ✅ Phase 2: 架构设计完成
2. 下一步: StorageAdapter + 基础数据结构
3. 然后: CurlParser集成
4. 接着: RequestExecutor核心逻辑
5. 随后: UI基础框架
6. 最后: 管理页面 + 完善细节

---

## Next Actions
1. ✅ 架构设计完成
2. 使用Plan agent创建详细的实现计划
3. 开始编码实现
