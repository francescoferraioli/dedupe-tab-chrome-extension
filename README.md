# Dedupe Tab

Chrome extension that detects when you open a tab for a URL you already have open, switches you to the existing tab, and closes the duplicate unless you refocus it in time.

## Behavior

1. You open a new tab that navigates to an `http` or `https` URL.
2. If another tab already has the same URL (ignoring trailing slashes and hash fragments), the extension switches to the existing tab.
3. After 2 seconds, the duplicate tab closes automatically.
4. Switch back to the duplicate tab before the timer expires to keep it open.

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
