# Dedupe Tab

Chrome extension that detects when you open a tab for a URL you already have open, switches you to the existing tab, and closes the duplicate unless you refocus it in time.

## Behavior

1. You open a new tab that navigates to an `http` or `https` URL.
2. If another tab already has the same URL (ignoring trailing slashes on the path), the extension switches to the existing tab.
3. After 2 seconds, the duplicate tab closes automatically unless you refocus it in time.
4. If the URLs match on path but differ in query string and/or `#` hash, a popup asks whether to switch to the existing tab, switch and reload the existing tab with the new URL, close the other tab, or keep both open. The popup closes after 5 seconds and defaults to keeping both tabs.
5. Switch back to a duplicate tab before the timer expires to keep it open.
6. Optional: open the extension options page to set blacklist regexes (one per line). New-tab URLs matching any pattern are skipped entirely.

## Development

```bash
npm install
npm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

For active development:

```bash
npm run watch
```

Reload the extension in `chrome://extensions` after changes.

## Type checking

```bash
npm run typecheck
```
