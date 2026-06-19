# Dedupe Tab

Chrome extension that detects when you open a tab for a URL you already have open, and asks whether to switch to the existing tab instead.

## Behavior

1. You open a new tab that navigates to an `http` or `https` URL.
2. If another tab already has the same URL (ignoring trailing slashes and hash fragments), the extension switches to the existing tab and shows a popup.
3. After 5 seconds, the duplicate tab closes automatically. Click **Keep new tab** in the popup to cancel and stay on the new tab.

The prompt opens in a small focused popup window (not a system notification), so it stays visible even when macOS or Chrome hides extension notifications.

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
