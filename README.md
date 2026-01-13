# Request Repeater - User Guide

## 📖 Overview

**Request Repeater** is a Tampermonkey userscript that allows you to save curl commands, bind them to URL patterns, and execute them with your current page cookies. Perfect for API testing, debugging, and automation.

---

## 🚀 Installation

1. **Install Tampermonkey**
   - Chrome: [Tampermonkey on Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/)
   - Firefox: [Tampermonkey on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - Edge: [Tampermonkey on Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/)

2. **Install Request Repeater**
   - Open Tampermonkey Dashboard
   - Click "+" (Create new script)
   - Copy and paste the entire `request-repeater.user.js` content
   - Save (Ctrl+S / Cmd+S)

3. **Verify Installation**
   - Visit any website
   - Click the Tampermonkey icon in your browser toolbar
   - You should see 4 menu items from Request Repeater

---

## 🎯 Features

### Core Features
- ✅ **Save curl commands** and bind to URL patterns
- ✅ **Path matching** with wildcard support (`*`)
- ✅ **Cookie replacement** - use current page cookies with each request
- ✅ **Per-request configuration** - customize cookie replacement for each request
- ✅ **5-second notifications** - see results instantly
- ✅ **Batch execution** - run multiple requests at once

### Advanced Features
- ✅ **Full curl syntax** - supports all curl parameters (GET/POST/PUT/DELETE, headers, body, auth)
- ✅ **Statistics tracking** - execution count, success rate, average response time
- ✅ **Management page** - view all requests with detailed statistics
- ✅ **Import/Export** - backup and share your request configurations

---

## 📋 Usage Guide

### 1. Adding a New Request

1. Click **Tampermonkey icon** → **➕ Add New Request**
2. Fill in the form:
   - **Request Name**: e.g., "Get User Info"
   - **URL Pattern**: e.g., `https://example.com/users/*` (use `*` as wildcard)
   - **cURL Command**: Paste your full curl command
   - **Cookie Replace List**: Comma-separated cookie names (e.g., `sessionId, token`)
3. Click **Add Request**

**Example:**
```
Name: Get Current User
URL Pattern: https://myapp.com/dashboard/*
Curl: curl 'https://api.myapp.com/user/me' -H 'Authorization: Bearer xxx' -H 'Cookie: sessionId=old'
Cookie Replace: sessionId, userId
```

### 2. Executing Requests

1. Navigate to a page that matches your URL pattern
2. Click **Tampermonkey icon** → **⚡ Execute Requests**
3. You'll see all requests bound to the current URL (sorted by last execution)
4. Click **Execute** on any request
5. See the result notification (status code, response time)

**Batch Execution:**
- If multiple requests match, click **Execute All** at the bottom

### 3. Managing Requests

Click **Tampermonkey icon** → **⚙️ Manage All Requests**

This opens a full-page management interface where you can:
- View all saved requests
- See detailed statistics
- Export configuration (backup as JSON)
- Import configuration (restore from JSON)

### 4. Viewing Statistics

Click **Tampermonkey icon** → **📊 View Statistics**

See:
- **Total Requests**: Number of saved requests
- **Total Executions**: How many times you've run requests
- **Success Rate**: Percentage of successful executions
- **Top 5 Most Used**: Your most frequently executed requests

---

## 🔧 Configuration

### URL Pattern Matching

| Pattern | Matches |
|---------|---------|
| `https://example.com/users/123` | Exact URL only |
| `https://example.com/users/*` | All user pages |
| `https://example.com/*` | All pages on domain |
| `https://*.example.com/*` | All subdomains |

### Cookie Replacement

**How it works:**

**Option 1: Replace Specific Cookies**
1. Your curl command contains: `Cookie: sessionId=old; token=abc`
2. Current page has: `sessionId=new; userId=123`
3. You configure to replace: `sessionId`
4. Final request sends: `Cookie: sessionId=new; token=abc`

**Option 2: Replace ALL Cookies (Leave Empty)**
1. Your curl command contains: `Cookie: sessionId=old; token=abc`
2. Current page has: `sessionId=new; userId=123`
3. You configure: *(leave empty)*
4. Final request sends: `Cookie: sessionId=new; userId=123` (all current page cookies)

**Per-Request Configuration:**
- Each request can specify different cookies to replace
- **Leave empty** = use ALL current page cookies (ignore curl cookies)
- **Specify names** = replace only those cookies from curl

---

## 💡 Use Cases

### 1. API Testing
Save API test requests with auth tokens, then execute them on different pages to test with different user contexts.

### 2. Debugging
Capture and replay problematic requests with current session data to reproduce bugs.

### 3. Automation
Batch execute multiple API calls with one click instead of manually running curl commands.

### 4. Development Workflow
Switch between test accounts quickly by executing saved requests with current cookies.

---

## 📝 Example Workflows

### Workflow 1: Testing User API Across Multiple Pages

1. **Setup:**
   ```
   Name: Fetch User Profile
   Pattern: https://app.example.com/user/*
   Curl: curl 'https://api.example.com/profile' -H 'Auth: Bearer xxx'
   Cookie Replace: sessionId
   ```

2. **Usage:**
   - Visit `https://app.example.com/user/alice`
   - Execute request → Gets Alice's profile with her session
   - Visit `https://app.example.com/user/bob`
   - Execute request → Gets Bob's profile with his session

### Workflow 2: Batch Data Export

1. **Setup Multiple Requests:**
   - "Export Users" → GET /api/users
   - "Export Orders" → GET /api/orders
   - "Export Products" → GET /api/products

2. **Execute:**
   - Go to dashboard
   - Click "Execute All"
   - Get 3 responses instantly

---

## 🛠️ Troubleshooting

### Request Not Showing?

**Problem:** Added request doesn't appear in Execute dialog

**Solution:** Check URL pattern - make sure it matches current page URL

**Example:**
- Pattern: `https://example.com/users/*`
- Current: `http://example.com/users/123` ❌ (http vs https)
- Current: `https://example.com/users/123` ✅

### Cookie Not Replaced?

**Problem:** Request still uses old cookie from curl

**Solution:** 
1. Check "Cookie Replace List" is not empty
2. Verify cookie name matches exactly (case-sensitive)
3. Ensure cookie exists on current page (`document.cookie` in console)

### Invalid Curl Command?

**Problem:** "Failed to parse curl command" error

**Solution:**
1. Ensure command starts with `curl`
2. Check quotes are properly escaped
3. Test curl in terminal first
4. Use `-H` for headers, not `--header`

### CORS Errors?

**Problem:** Request blocked by CORS policy

**Solution:** 
- `GM_xmlhttpRequest` bypasses CORS - this shouldn't happen
- Check `// @connect *` is in script header
- Verify `@grant GM_xmlhttpRequest` permission

---

## 📦 Backup & Restore

### Export Data

1. Click **⚙️ Manage All Requests**
2. Click **📥 Export All Data**
3. Save JSON file (includes all requests + config)

### Import Data

1. Click **⚙️ Manage All Requests**
2. Click **📤 Import Data**
3. Select your backup JSON file
4. Data will be merged with existing requests

---

## 🔒 Privacy & Security

- ✅ **All data stored locally** - uses `GM_setValue` (Tampermonkey storage)
- ✅ **No external connections** - except your saved curl requests
- ✅ **Cloud sync optional** - Tampermonkey can sync across browsers if enabled
- ⚠️ **Sensitive data** - curl commands may contain auth tokens - keep backups secure

---

## 🎨 Keyboard Shortcuts

Currently, all actions are accessed via Tampermonkey menu (click icon).

Future version may add:
- `Ctrl+Shift+R` - Quick execute
- `Ctrl+Shift+A` - Add request

---

## 🐛 Known Limitations

1. **Single-file userscript** - all code in one file (Tampermonkey requirement)
2. **No request chaining yet** - can't execute B after A succeeds
3. **No scheduled execution** - can't auto-run every X minutes
4. **Basic import** - import UI shows in console (manual GM_setValue needed)

These may be added in future versions based on feedback!

---

## 📞 Support & Feedback

**Issues?** 
- Check this guide first
- Verify curl command works in terminal
- Check browser console for errors (F12)

**Feature Requests?**
- Let me know what you'd like to see!

---

## 📄 License

Free to use and modify. Built with ❤️ for developers who love automation.

---

## 🔄 Version History

### v1.0.0 (2026-01-14)
- Initial release
- Core features: Add/Execute/Manage requests
- Cookie replacement with per-request config
- Path matching with wildcards
- Batch execution
- Statistics tracking
- Import/Export functionality
- Management page with full UI
