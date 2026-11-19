---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

Scope: the whole Dawry web app (customer, restaurant dashboard, super-admin). Mode: operate (customer order page is operate too: one answer, glanceable).

## Direction contract

THESIS: Dawry is a station departures board for food. Every order is a departure: invoice = train number, ETA = departure time, status = platform state. Refuses the card-grid dashboard and the cute ticket-stub costume.

OWN-WORLD: Ink-navy board rail (#0f1d33) as the shell; cool off-white work ground; hairline-ruled rows, no card piles. Signal palette doing jobs: green = delivered/go, blue = out for delivery, red = late, ink = preparing. Alexandria (Egyptian signage-derived Arabic+Latin) for headings and every number, tabular figures; Noto Sans Arabic for body.

STORY: The customer sees "your departure" first: the ETA huge and the count ahead. Staff scan one timetable, rows sorted by time, and tap one next-step button. Owners and admin manage from a quiet sidebar shell.

FIRST VIEWPORT: Dashboard: ink sidebar at the start edge (restaurant name, nav, user); top bar with page title and "new order" primary; a departures table (invoice | items | customer | ETA | status | next action) with late rows signalled red. Phone: top bar + drawer, rows become two-line entries with the action on the end. Customer: the board header (restaurant), the giant ETA time plus the ahead count, then the status line and items.

FORM: Station timetable (Egyptian railway bilingual departure boards), my list position 5, seed 7985619c. Signature move: figures flip when an ETA or count changes. Raises: from split-flap: rows are live entities ranked by time and columns never move. From terminal wayfinding: phones show only the next decision per order. From catalog sleeve: nothing is labelled twice.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
