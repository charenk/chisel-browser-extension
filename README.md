# Chisel — DOM Inspector Chrome Extension

Hover any element on your localhost dev server, click, describe a change, get a Claude Code-ready prompt copied to your clipboard.

## Install
1. Open Chrome -> `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked** -> select this `chisel-extension/` folder
4. Pin the Chisel icon in your Chrome toolbar

## Recommended Workflow (with Claude Code Plan Mode)

1. In your terminal, press `Shift+Tab` twice to enter Plan Mode
2. Open your localhost dev server in Chrome
3. Click the Chisel toolbar icon -> "Activate Inspector"
4. Hover over any element — you'll see an indigo highlight and a label chip
5. Click the element -> an input card appears
6. Type your change instruction and press Enter
7. Prompt is copied to clipboard — switch to terminal and paste
8. Claude reads the codebase (read-only), proposes a plan, and waits
9. Review what Claude plans to change -> type `yes` to approve and execute

Claude will not touch a single file until you approve. You see exactly which files will change and why before anything happens.

## Works with
- React (Vite, Next.js, CRA) — includes component name and file path
- Vue, Svelte, Angular, vanilla HTML — includes selector and HTML snippet
- Any localhost dev server

## Shortcuts
- `Esc` — close the input card
- `Esc` (again) — deactivate the inspector
- `Enter` — submit instruction (inside the input card)
- `Shift+Enter` — new line inside input card
