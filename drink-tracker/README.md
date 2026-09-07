# Drink Tracker

A tiny, fast tracker for keeping an eye on how many alcoholic drinks you've
had against a weekly limit you set. No build step, no dependencies, no
backend — everything is saved locally in your browser via `localStorage`.

## Use it

Just open `index.html` in your browser (double-click it, or drag it into a
browser window). That's it.

## How it works

- Set your **weekly limit** by clicking the "Limit: 7/wk" badge in the
  top-right and typing a new number.
- Tap **+1 Drink** every time you have one, or **+0.5** for a half
  (a small pour, a shared bottle, etc.). The progress bar and count
  update instantly. Both the limit and your logged amounts support
  decimals (e.g. a limit of 10.5, or a 0.5 entry).
- Made a mistake? Tap **Undo last** to remove the most recent entry, or
  find any entry in the list below and click its **×** to delete it.
- The week runs **Monday–Sunday**. The progress bar turns amber near your
  limit and red once you're over it.
- **This Week** shows today's and this week's drinks grouped by day.
  **All** shows your full history grouped by week, alongside how you did
  against your limit that week.
- **Export** downloads all your data (limit + entries) as a JSON file.
  **Import** merges entries from a previously exported file back in.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `d` | Log a drink |
| `h` | Log half a drink |
| `u` | Undo the last logged drink |

## Data

Everything lives in your browser's `localStorage` under the keys
`drink-tracker:entries` and `drink-tracker:weeklyLimit`. Nothing is sent
anywhere. Clearing your browser's site data for this page will erase it.
