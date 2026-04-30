# Browser Testing Playbook

Use for UI runtime checks.

Preferred:
- in-app browser / Playwright when available.

Chromium debug fallback:
```bash
/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser --remote-debugging-port=9222
```

Check:
- console errors
- failed network calls
- screenshots at desktop/mobile
- form loading/error states

Safari is not supported by Chromium debug tools.
