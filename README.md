# Request Repeater - User Guide

## 📖 Overview

**Request Repeater** is a browser extension that allows you to save curl commands, bind them to URL patterns, and execute them with your current page cookies. Perfect for API testing, debugging, and automation.

---

## 🚀 Installation

### Firefox
1. Open Firefox, visit `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `extension/manifest.json` file
4. Extension installed!

### Chrome
1. Open Chrome, visit `chrome://extensions/`
2. Enable **"Developer mode"**
3. Click **"Load unpacked"**
4. Select the `extension` folder

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
- ✅ **Repeat execution** - run a request N times consecutively
- ✅ **Scheduled execution** - auto-run requests at specified intervals (timer)
- ✅ **Floating panel** - auto-shows when visiting pages with bound requests
- ✅ **Draggable panel** - move the floating panel anywhere on screen
- ✅ **HttpOnly Cookie access** - access all cookies including HttpOnly

---

## 📋 Usage Guide

### 1. Adding a New Request

1. Click the **extension icon** → **➕ Add New Request**
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
2. The **floating panel** will auto-appear (or click extension icon)
3. You'll see all requests bound to the current URL (sorted by last execution)
4. Click **▶** to execute a request
5. See the result notification (status code, response time)

**Repeat Execution:**
- Enter a number in the input field next to ▶
- Click ▶ to run the request that many times

**Scheduled Execution (Timer):**
- Enter interval in seconds (5-3600)
- Click ⏱ to start the timer
- Click ⏹ to stop

**Batch Execution:**
- If multiple requests match, click **Execute All** at the bottom

### 3. Managing Requests

Click **extension icon** → **⚙️ Manage**

This opens a full-page management interface where you can:
- View all saved requests
- See detailed statistics
- Edit or delete requests
- Start/stop timers for any request
- Select multiple requests for batch execution
- Export configuration (backup as JSON)
- Import configuration (restore from JSON)

### 4. Viewing Statistics

The management page shows:
- **Total Requests**: Number of saved requests
- **Total Executions**: How many times you've run requests
- **Success Rate**: Percentage of successful executions

---

## 🔧 Configuration

### URL Pattern Matching

| Pattern | Matches |
|---------|---------|
| `https://example.com/users/123` | Exact URL only |
| `https://example.com/users/*` | All user pages |
| `https://example.com/*` | All pages on domain |
| `https://*.example.com/*` | All subdomains |

**Note:** Query parameters are ignored during matching. Only the path is compared.

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

### 5. Monitoring
Use the timer feature to periodically check API endpoints or refresh data.

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

### Workflow 3: Periodic Health Check

1. **Setup:**
   ```
   Name: Health Check
   Pattern: https://admin.example.com/*
   Curl: curl 'https://api.example.com/health'
   ```

2. **Usage:**
   - Set timer interval to 60 seconds
   - Click ⏱ to start
   - Request runs every minute automatically

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

**Solution:** The extension uses `host_permissions` to bypass CORS. Check permissions are correctly configured.

### Floating Panel Not Showing?

**Problem:** Panel doesn't auto-appear on matching pages

**Solution:**
1. Check URL pattern matches current page
2. Refresh the page
3. Check browser console for errors

---

## 📦 Backup & Restore

### Export Data

1. Click **⚙️ Manage**
2. Click **📥 Export**
3. Save JSON file (includes all requests + config)

### Import Data

1. Click **⚙️ Manage**
2. Click **📤 Import**
3. Select your backup JSON file
4. Data will be merged with existing requests

---

## 🔒 Privacy & Security

- ✅ **All data stored locally** - uses browser storage
- ✅ **No external connections** - except your saved curl requests
- ✅ **Cloud sync optional** - browser can sync across devices if enabled
- ⚠️ **Sensitive data** - curl commands may contain auth tokens - keep backups secure

---

## 🎨 UI Features

### Floating Panel
- **Auto-show**: Appears when visiting pages with bound requests
- **Draggable**: Click and drag the header to move
- **Minimizable**: Click − to collapse, click again to expand
- **Add button**: Quick access to add new requests

### Popup
- **Quick execute**: Run requests directly from popup
- **Repeat control**: Run N times with progress indicator
- **Timer control**: Start/stop scheduled execution
- **Edit on click**: Click request name to edit

---

## 🐛 Known Limitations

1. **No request chaining** - can't execute B after A succeeds (yet)
2. **Timer stops on page navigation** - timers are per-page, not persistent

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

### v1.0.0
- Browser extension (Manifest V3)
- HttpOnly cookie access via `browser.cookies` API
- Popup with repeat/timer controls
- Floating panel with drag support
- Full management page
