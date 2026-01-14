# Request Repeater

Browser extension to save curl commands, bind to URL patterns, and execute with current page cookies.

## Features

- **Save curl commands** and bind to URL patterns
- **Cookie replacement** - use current page cookies (including HttpOnly)
- **Request chaining** - execute B after A succeeds
- **Persistent timers** - survive browser restart
- **Request groups** - organize with folders and colors
- **Dark mode** - Light/Dark/Auto theme

## Installation

### Firefox
```bash
./scripts/build.sh
# Install dist/request-repeater-v1.1.0.xpi
```

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select the XPI file

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `src` folder

## Project Structure

```
req-repeater/
├── src/                    # Extension source code
│   ├── manifest.json
│   ├── background/         # Background service worker
│   ├── content/            # Content scripts (floating panel)
│   ├── popup/              # Popup UI
│   ├── options/            # Management page
│   ├── shared/             # Shared utilities
│   └── icons/
├── scripts/
│   └── build.sh            # Build XPI
├── dist/                   # Build output (gitignored)
└── README.md
```

## Usage

### Adding a Request
1. Click extension icon → Add Request
2. Fill in: Name, URL Pattern, cURL Command
3. Optionally specify cookies to replace

### Executing Requests
1. Visit a page matching your URL pattern
2. Floating panel appears automatically
3. Click ▶ to execute

### Request Chaining
Edit a request → Select "Chain Next" → Link another request

### Groups
Management page (⚙️) → Click + to create group → Assign requests

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save configurations |
| `cookies` | Access HttpOnly cookies |
| `<all_urls>` | Send requests to any URL |

## Version History

### v1.1.0
- Request chaining, persistent timers, groups, dark mode

### v1.0.0
- Browser extension (Manifest V3), HttpOnly cookie access

## License

MIT
