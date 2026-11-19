# Design

The Dawry web app is built as a **station departures board for food**. Every order is a departure: the invoice number is the train number, the ETA is the departure time, and the status is the platform state. Tokens live in `src/app/globals.css`.

## World

- **Board** (`--board` #1c1b19 light / #0c0b0a dark): the warm charcoal shell (no blue anywhere: the user rejected navy). It covers the panel sidebar and phone top bar, the hero band on public pages, and the left half of sign-in pages.
- **Concourse** (`--background` #f5f5f3 / #121110, `--surface` #fff / #1a1918): the work area. Lists are hairline-ruled rows inside one bordered container. Do not pile up cards.
- **Signals**: each colour has one job.

  | Signal | Light | Dark |
  |---|---|---|
  | Preparing (`--preparing`) | #a35f00 | #f2b25c |
  | Out for delivery (`--transit`, violet) | #6d48c9 | #b49cff |
  | Delivered / go (`--go`) | #12775a | #4cc898 |
  | Late (`--late`) | #c3352b | #ff7b6e |
  | Cancelled | `--muted-foreground` | `--muted-foreground` |

  Each signal also has a `-soft` background.
- **Primary action**: ink (`--primary`), one per screen. Signal buttons (`transit`, `go`) move an order to its next state.

## Type

- **Alexandria** (`--font-display`): headings and every figure (the `.figure` utility, tabular lining numerals). It is an Arabic + Latin face from Egyptian signage.
- **Noto Sans Arabic** (`--font-body`): reading text, both scripts.
- Page title: 28px semibold. Section heading: 14–18px semibold. Labels: 13px medium. No eyebrows, no all-caps.

## Shape and depth

- Radius: controls 8–10px, containers 12–14px (`rounded-xl`), sheets and dialogs 18px.
- Elevation: a border, or `shadow-raise` / `shadow-float`, never both. Floats are reserved for overlays and the search/invoice inputs that straddle the board's edge.

## Components

- `AppShell` (`components/layout/app-shell.tsx`): the board sidebar (lg+) or the top bar plus drawer below that. It also provides `PageHeader` (title, description, actions, optional tabs) and `PageBody`.
- `SheetContent` (`ui/dialog.tsx`): an end-side panel for create forms. `DialogContent` is for short, focused tasks.
- `Menu` (`ui/menu.tsx`): row overflow actions. Destructive items use `tone="danger"`.
- `Badge`: a signal dot plus a word.
- `Flap` (`ui/flap.tsx`): **the signature move**. A board figure flips in like a split-flap tile when it appears and whenever its value changes (ETA clock, orders ahead). It honours reduced motion.

## Lists, detail pages, reports

- Every list has a `Toolbar` above it (`ui/list-toolbar.tsx`): `SearchField` (Arabic-folding search, `lib/list.ts`), `Segmented` filters with counts, `SortSelect`. Their state lives in the URL (`useParam`), so it survives opening a row and coming back.
- Rows that represent a thing open its page: the row's main link carries `.row-link` (covers the row); controls in the row sit above it with `relative z-10`. Detail pages use `PageHeader` with `back`, `meta` badges and actions.
- Header tabs are `TabRail` (underline on the header rule, optional count pill and signal dot).
- Figures: `StatStrip` (hairline grid), `Panel`, `BarChart` (one hue, peak in go-green, hover/focus readouts), `RankList`, `Facts` (`ui/stats.tsx`). Chart axis dates use `shortDay` (Western digits, no locale marks).
- Reports (`components/reports/`): category tabs plus a 7/30/90-day `RangePicker`; the same view serves the owner and the super-admin.
- Links to a customer page never open a new tab.

## Layout rules

- Order board rows:
  - Desktop (xl): six columns (invoice | time | order | customer | state | next action + ⋯).
  - md–lg: five columns, with the customer shown under the order.
  - Phones: stacked blocks with a full-width next-step button, and a bottom "new order" bar in the thumb zone.
- RTL first: use logical properties throughout. LTR runs (phones, usernames, invoice numbers) carry `dir="ltr"` and still sit on the reading edge, via a base rule.
- Light and dark follow the device, with a toggle (`lib/theme.ts`).
