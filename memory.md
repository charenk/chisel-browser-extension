# Chisel — Decisions & Patterns

## Architecture
- MV3 service worker background (no persistent background page)
- Programmatic content script injection (not declared in manifest)
- No build step, no framework — vanilla JS throughout

## Communication Flow
- Popup -> background: `chrome.runtime.sendMessage({ type: 'TOGGLE_INSPECTOR' })`
- Background -> content: `chrome.scripting.executeScript` + `chrome.tabs.sendMessage`
- Content -> background: `chrome.runtime.sendMessage({ type: 'WRITE_CLIPBOARD' })`

## Clipboard Strategy
- Content scripts can't directly use `navigator.clipboard.writeText` (no user gesture)
- Background relays via `scripting.executeScript` with inline func calling clipboard API

## CSS Isolation
- All injected styles use `.chisel-` prefix
- Overlay elements use max z-index (2147483647)
- `!important` on highlight outlines to override page styles

## Phase 1 Scope
- Hover highlight with label chip
- Click-to-lock with input card
- Context extraction: tag, classes, id, CSS path, computed styles, React fiber
- Prompt builder with structured sections (Task, Target, HTML, Styles, Rules)
- Localhost-only restriction
