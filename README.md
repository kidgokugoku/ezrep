# ezrep

Save curl commands, bind to URLs, replay with current cookies.

## Features

- Save curl commands and bind to URL patterns
- Auto-replace cookies with current page cookies
- Floating panel on matching pages
- Timer: interval-based execution (every N seconds)
- Cron: cron expression scheduling (e.g., `*/5 * * * *`)
- Execution history with status codes and response times
- Request chaining (execute B after A succeeds)
- Groups for organizing requests
- Import/Export configuration
- Dark mode support

## Install

**Firefox**: `about:debugging` → Load `dist/ezrep-v1.2.0.xpi`

**Chrome**: `chrome://extensions` → Load unpacked → Select `src/`

## Usage

1. Click extension icon → Add request
2. Paste curl command, set URL pattern
3. Visit matching page → floating panel appears
4. Click ▶ to execute

### Cron Examples

| Expression | Meaning |
|------------|---------|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 9 * * *` | Daily at 9:00 |
| `0 9 * * 1` | Every Monday at 9:00 |

## Build

```bash
./scripts/build.sh
```

## Changelog

### v1.2.0
- Add cron scheduling support
- Add execution history
- Fix floating panel reopen issue
- Add request status notifications

### v1.1.0
- Add request chaining
- Add groups
- Add dark mode

### v1.0.0
- Initial release

## License

MIT
