# Request Repeater - Browser Extension

将 Tampermonkey 用户脚本转换为浏览器扩展，解决了 HttpOnly cookie 无法访问的问题。

**支持浏览器**: Firefox, Chrome

## 安装方法

### Firefox 安装

1. 打开 Firefox，访问 `about:debugging#/runtime/this-firefox`
2. 点击 **"临时载入附加组件"**
3. 选择 `extension/manifest.json` 文件
4. 扩展安装完成！

### Chrome 安装

Chrome 需要使用 Service Worker，请先修改 `manifest.json`：

```json
"background": {
  "service_worker": "background/background.js"
}
```

然后：
1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择 `extension` 文件夹

## 与用户脚本版本的区别

| 功能 | 用户脚本 (v1.x) | 扩展 (v2.x) |
|------|----------------|-------------|
| HttpOnly Cookie | ❌ 无法访问 | ✅ 完全访问 |
| Network 面板可见 | ❌ 不可见 | ✅ 可在扩展后台查看 |
| CORS 绕过 | ✅ 通过 GM_xmlhttpRequest | ✅ 通过 host_permissions |
| 安装方式 | Tampermonkey | 浏览器扩展 |

## 核心改进

### 1. 完整的 Cookie 访问
使用 `browser.cookies.getAll()` API 获取所有 cookie，包括 HttpOnly 标记的 cookie。

```javascript
const browserCookies = await browser.cookies.getAll({ domain });
```

### 2. 请求在后台执行
所有 HTTP 请求在后台脚本中执行，绕过 CORS 限制。

### 3. 查看请求
**Firefox:**
1. 打开 `about:debugging#/runtime/this-firefox`
2. 找到 Request Repeater，点击 "检查"
3. 在弹出的 DevTools 中查看 Network 面板

**Chrome:**
1. 打开 `chrome://extensions/`
2. 找到 Request Repeater
3. 点击 "Service Worker" 链接

## 文件结构

```
extension/
├── manifest.json           # 扩展配置
├── background/
│   └── background.js       # 后台脚本 (请求执行 + cookie 获取)
├── popup/
│   ├── popup.html          # 弹出窗口
│   ├── popup.js
│   └── popup.css
├── content/
│   ├── content.js          # 内容脚本 (浮动面板)
│   └── content.css
├── options/
│   ├── options.html        # 管理页面
│   ├── options.js
│   └── options.css
├── shared/
│   ├── i18n.js             # 国际化
│   ├── storage.js          # 存储适配器
│   ├── curl-parser.js      # cURL 解析器
│   └── request-manager.js  # 请求管理
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## 使用方法

### 添加请求
1. 点击扩展图标打开 Popup
2. 点击 "➕ Add Request"
3. 填写请求名称、URL 模式、cURL 命令
4. 点击 "Add"

### 执行请求
1. 访问匹配 URL 模式的页面
2. 点击扩展图标
3. 点击 "Execute" 执行请求

### 自动显示浮动面板
当访问的页面匹配已保存的请求时，会自动显示浮动面板。

### 管理请求
1. 点击扩展图标
2. 点击 "⚙️ Manage"
3. 在管理页面查看、编辑、删除请求

## 数据迁移

如果你之前使用用户脚本版本，可以：

1. 在用户脚本版本中导出数据 (Export)
2. 在扩展版本的管理页面导入数据 (Import)

## 权限说明

- `storage`: 存储请求配置
- `cookies`: 访问所有 cookie (包括 HttpOnly)
- `activeTab`: 获取当前标签页 URL
- `<all_urls>`: 向任意 URL 发送请求

## 故障排除

### 请求仍然失败？
1. 打开扩展的后台页面/Service Worker
2. 查看 Console 和 Network 面板的错误信息

### 浮动面板不显示？
检查 URL 模式是否正确匹配当前页面。

### Cookie 仍然缺失？
确保目标域名的 cookie 存在于浏览器中。可以在 DevTools → Storage → Cookies 中查看。
