# Chisel

Chrome extension that lets developers inspect DOM elements on localhost, describe a change, and get a structured Claude Code-ready prompt copied to their clipboard.

## Stack

- Chrome Extension Manifest V3
- Vanilla JS — no framework, no build step
- CSS with `chisel-` prefix for all injected classes

## File Structure

```
chisel-extension/
  manifest.json          # MV3 config
  background.js          # Service worker — message routing, script injection
  content/
    inspector.js         # Core logic — hover, click, context extraction, prompt builder
    inspector.css        # Injected styles — highlight, chip, card, toast
  popup/
    popup.html           # Extension popup UI
    popup.js             # Popup logic — toggle inspector
  icons/
    icon16.png
    icon48.png
    icon128.png
  test.html              # Localhost test page
```

## Key Patterns

- **Content script injection**: Programmatic via `chrome.scripting.executeScript` (not manifest `content_scripts`)
- **Message passing**: popup -> background (`chrome.runtime.sendMessage`) -> content script (`chrome.tabs.sendMessage`)
- **Clipboard**: Relay through background's `scripting.executeScript` calling `navigator.clipboard.writeText`
- **React fiber detection**: Walks `__reactFiber` keys to find component name, source file, and line number
- **CSS scoping**: All injected classes prefixed with `chisel-` to avoid collisions
- **Localhost only**: `host_permissions` restricted to `localhost`, `127.0.0.1`, `0.0.0.0`

## Development Workflow

1. `chrome://extensions` -> Developer Mode -> Load unpacked -> select this folder
2. Test on localhost (e.g., `npx serve .` or `python3 -m http.server 3000`)
3. After code changes: click the refresh icon on the extension card, then reload the page
