# Dawry project contract

The rules every change to this repo follows: product behaviour, architecture,
API shape, security, and how work is done. If code and this file disagree, fix
one of them in the same change.

## 1. Product

Dawry (دوري, "my turn") lets a restaurant's customers see their place in line and
when their order will be ready. Everything works without an account; an
optional customer account adds saved orders and favorites across devices.

| Actor | Account | Can |
|---|---|---|
| Customer (guest) | none | Look up an order by restaurant + invoice number (or QR), watch it update live |
| Customer (account) | phone number + password, self sign-up | Everything a guest can, plus: every order page they open is saved to "my orders", one page tracks all their active orders live, favorite restaurants. Same data on every device. |
| Staff | username + password, created by the owner | Create orders, change status and ETA, cancel |
| Owner | phone number + password, created by the super-admin | Everything staff can, plus manage staff, menu, custom fields, restaurant settings, reports |
| Super-admin | username + password, created from the CLI | Create restaurants and owners, suspend/activate, reset any password, platform stats |

Out of scope: self-signup for restaurants/staff (only customers sign up), password-reset emails, billing, POS/third-party APIs,
SMS/WhatsApp notifications, delivery tracking.

### 1.1 Orders

- Staff type the **invoice number** from the real receipt. It is unique per
  restaurant per **business day** (numbers may reset daily). Business day =
  calendar date in the platform time zone (`APP_TIME_ZONE`, default `Africa/Cairo`).
- **Items**: picked from the restaurant's menu (with quantity) or typed freely.
  The item name is copied onto the order, so menu edits never change old orders.
- **Built-in fields** (all optional, staff-only): customer name, customer phone,
  address, notes.
- **Custom fields**: defined per restaurant (label, required yes/no, "show to
  customer" yes/no). Values are text.
- **ETA** is always set by staff. Three display modes, chosen per order:
  - `countdown`: staff type minutes; the customer sees a live countdown and the clock time.
  - `clock`: staff pick a clock time; the customer sees that time.
  - `minutes`: staff type minutes; the customer sees "about N minutes" (no countdown).
  Every mode stores one absolute `etaAt` timestamp. Staff can change it later.
- **Statuses**: `preparing` → `out_for_delivery` → `delivered`. `cancelled` is
  allowed from `preparing` or `out_for_delivery`. No other transitions.
- **Queue ("orders before you")**: count of the restaurant's other orders that
  are `preparing` today and whose `etaAt` is earlier than this order's (ties:
  earlier `createdAt` first). An order leaves the queue when it goes out for
  delivery or is cancelled. Only meaningful while this order is `preparing`.
- **Late**: an order is late when it is `preparing` and now > `etaAt`. The
  customer sees "running late"; the staff dashboard shows a toast once per
  order when it becomes late.

### 1.2 Customer pages

- `/r/<slug>`: restaurant name/logo + invoice number form.
- `/r/<slug>/<invoice>`: today's order with that invoice number. The QR code on
  the receipt points here.
- Shows: logo/name, status steps, items, public custom fields, orders before
  you, ETA (per mode), late/cancelled messages. Updates live.
- Never shows built-in fields or private custom fields.
- Suspended or unknown restaurant, or unknown invoice → the same "not found" page.
- When a logged-in user opens an order page, the order is saved to their
  account (idempotent). Saved orders of a suspended restaurant are hidden.
- `/me`: saved orders (active first, live), favorite restaurants, sign out.

### 1.3 Accounts and phone numbers

- One phone number = one account. Owners and customers both log in with phone
  + password (Better Auth username = digits-only phone). Staff usernames must
  contain a letter, so they never collide with phones.
- Any logged-in user can use the customer features (saved orders, favorites).
- Customer sign-up: `POST /api/customer/sign-up` (name, phone, password);
  phone already registered → `409 conflict`. Signs the user in on success.

## 2. Architecture

pnpm workspaces + Turborepo.

| Workspace | Role |
|---|---|
| `packages/shared` | Pure TypeScript shared by both apps: constants, zod schemas for every API payload, queue/ETA/status logic, response types. No I/O. |
| `apps/api` | Express 5 + Drizzle (MySQL 8) + Better Auth. Owns all data and all rules. |
| `apps/web` | Next.js 16 (App Router) + Tailwind 4 + shadcn/ui + next-intl. Renders UI only; every rule is enforced again by the API. |

- **One origin for the browser.** The web app proxies `/api/*` to the API
  (Next.js rewrite to `API_INTERNAL_URL`). Browsers never call the API host
  directly, so auth cookies are first-party and there is no CORS surface.
  Server components call `API_INTERNAL_URL` directly and forward the request's
  cookies.
- **Live updates** use Server-Sent Events from the API. Events carry no order
  data, only "something changed" for a restaurant; clients then refetch through
  the normal endpoints (which apply all access rules). One API instance: the
  event bus is in-process.
- **Configuration** comes from one root `.env` (tests: root `.env.test`).
  `.env.example` lists every variable. The API validates its env with zod at boot.

### 2.1 Folder layout

```
apps/api/src/
  app.ts               express app factory (no listen)
  index.ts             boot: env → db → auth → app.listen
  migrate.ts           applies drizzle migrations (production)
  auth.ts              Better Auth config
  db/                  client + schema
  http/                errors, validation, auth guards, SSE helpers
  modules/<name>/      routes.ts (HTTP) + service.ts (rules + queries)
  cli/                 one-off commands run via package scripts
apps/api/test/         tests, next to src (helpers/ for shared test code)
apps/web/src/app/      routes
apps/web/src/components/, lib/, i18n/
apps/web/translation/  ar.ts (source of truth) + en.ts (typed against ar)
apps/web/test/         tests, next to src
packages/shared/src/   + packages/shared/test/
```

## 3. API contract

- JSON only. Request bodies are validated with the zod schema from
  `@dawry/shared`; unknown fields are stripped.
- Errors always have the shape `{ "error": { "code": string, "message": string } }`.
  Codes: `validation_failed` (400, plus `issues`), `unauthenticated` (401),
  `forbidden` (403), `not_found` (404), `conflict` (409), `rate_limited` (429),
  `internal` (500, never leaks details).
- Dates are ISO-8601 strings in UTC. Business days are `YYYY-MM-DD`.
- IDs are opaque strings (UUID).

| Prefix | Who | Notes |
|---|---|---|
| `GET /health` | anyone | `{ "status": "ok" }` |
| `/api/auth/*` | Better Auth | sign-in, sign-out, session. Sign-up is disabled. |
| `/api/admin/*` | super-admin | restaurants, owners, suspend, passwords, stats |
| `/api/restaurant/*` | owner or staff of the session's restaurant | orders, events; owner-only: staff, menu, fields, settings, reports |
| `/api/public/*` | anyone | restaurant by slug, order by invoice, events. Read-only apart from saving the viewed order for a logged-in user. |
| `/api/customer/sign-up` | anyone | customer self sign-up (rate limited) |
| `/api/me/*` | any logged-in user | saved orders, favorites |

The restaurant for `/api/restaurant/*` always comes from the session's
membership, never from the URL or body. A user belongs to at most one restaurant.

## 4. Security

- **Sessions**: Better Auth database sessions in cookies that are `HttpOnly`,
  `SameSite=Lax`, `Secure` in production (with the `__Secure-` prefix). No
  tokens in `localStorage` or readable by JavaScript.
- **CSRF**: state-changing requests must come from a trusted origin (Better
  Auth origin check for auth routes; an `Origin`/`Referer` check for every other
  non-GET API route). `SameSite=Lax` is the second layer.
- **XSS**: React escaping only; `dangerouslySetInnerHTML` is forbidden. All
  user text is stored as plain text with length limits. Security headers via
  helmet (API) and Next.js `headers()` (web), including a Content-Security-Policy.
- **Passwords**: at least 8 characters, hashed by Better Auth (scrypt). Never
  logged, never returned.
- **Brute force**: Better Auth rate limiting on sign-in; public lookup endpoints
  are rate limited per IP.
- **Tenant isolation**: every restaurant query filters by the session's
  restaurant id. Each restaurant-scoped endpoint has a test proving another
  restaurant's data is unreachable.
- **Suspension**: a suspended restaurant's owner and staff get `403 forbidden`
  on every restaurant route; its public pages return `404`.
- **Least data**: public responses never include customer name, phone,
  address, notes, private custom fields, internal ids of users, or other orders.
- Request body limit 100 kB. Errors never echo stack traces.
- Secrets live only in `.env` files (gitignored). Never print them.

## 5. Data rules

- Tables use `snake_case`; TypeScript uses `camelCase`.
- Schema changes only through Drizzle migrations (`pnpm --filter @dawry/api db:generate`),
  committed with the code that needs them. Production applies them automatically
  (compose `migrate` service) before the API starts.
- A restaurant is a Better Auth `organization` (+ `restaurant_settings` row).
  Owner = member role `owner`; staff = member role `member`.
- Deleting is rare: staff are deleted (their sessions go with them); menu items
  and custom fields are archived (`active = false`) so old orders stay readable.

## 6. Web

- Arabic is the default language and is right-to-left; English is the second.
  The language lives in the `NEXT_LOCALE` cookie, never in the URL.
- Every user-visible string comes from `apps/web/translation/` (`ar.ts` is the
  source; `en.ts` must have the same keys, enforced by types and a test).
- shadcn/ui components, RTL-aware (logical CSS properties: `ms-`, `pe-`, `start-`).
- Mobile-first: customer pages and the staff order screen must work on a phone.
- Routes: `/` (find restaurant), `/r/[slug]`, `/r/[slug]/[invoice]`, `/login`, `/signup`, `/me`,
  `/dashboard/*` (owner + staff), `/admin/*` (super-admin).

## 7. How work is done

- Every workspace has `build`, `test`, `lint`, `typecheck` scripts, in that
  order; the root runs them only through turbo. `pnpm check` must be fully
  green before every commit. No CI, no git hooks.
- TDD for logic and behaviour: write the failing test, see it fail, implement,
  see it pass. Tests sit in `test/` next to `src/`. API tests use the real
  `dawry_test` MySQL database.
- UI tests use role/text queries and test behaviour, never CSS classes or styles.
  Pure styling changes need no tests.
- Use `pnpm` (and `pnpm dlx`), never `npx`/`npm` for project work.
- Commit messages: conventional style (`feat(api): …`, `fix(web): …`, `chore: …`).
- Code review tools (CodeRabbit) run only when the owner asks.
