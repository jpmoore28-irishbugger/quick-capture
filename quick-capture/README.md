# Quick Capture

A tiny, fast, keyboard-first capture tool for tasks and notes. No build step,
no dependencies, no backend — everything is saved locally in your browser
via `localStorage`.

## Use it

Just open `index.html` in your browser (double-click it, or drag it into a
browser window). That's it.

## How it works

- Type a thought and hit **Enter** to capture it instantly.
- Add `#hashtags` anywhere in your text — they're auto-detected, highlighted,
  and turned into filter chips above the list.
- **Today** view (default) shows things captured today plus anything still
  open from before. **All** shows everything.
- Click an item (or select it and press **Enter**) to mark it done.
- Hover an item and click **×** (or select it and press **Backspace**) to
  delete it.
- Double-click an item's text (or select it and press **e**) to edit it in
  place. **Enter**/blur saves, **Esc** cancels.
- Drag the **⋮⋮** handle on the left of an item to reorder the list.
- **Export** downloads all your items as a JSON file. **Import** merges
  items from a previously exported JSON file back in.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Focus the capture input from anywhere |
| `Enter` (in input) | Capture the current line |
| `↑` / `↓` | Move focus between items |
| `Enter` (on item) | Toggle done |
| `e` (on item) | Edit in place |
| `Backspace` (on item) | Delete |
| `Esc` (in input) | Blur the input |

## Data

Everything lives in your browser's `localStorage` under the key
`quick-capture:items`. Nothing is sent anywhere. Clearing your browser's
site data for this page will erase it.
