# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Customers** (mostly guests, on phones): scan the QR on their receipt or type the invoice number, then wait. They want to know how many orders are ahead of them and when theirs will be ready. An optional account saves their orders and favourite restaurants.
- **Restaurant staff and owners**: work the counter, kitchen or office, on phones, tablets and desktop/POS PCs. Staff create orders and move them through preparing → out for delivery → delivered (or cancel). Owners also manage staff, the menu, custom fields, settings and reports.
- **Super-admin** (the platform operator): creates restaurants and owners, suspends/activates them, resets passwords and reads platform stats.

## Product Purpose

Dawry (دوري, "my turn") shows a restaurant's customers their place in line and when their order will be ready, live, without an account. Success means a customer never has to ask the counter "is my order ready?", and staff keep the queue honest with a few taps.

## Positioning

The queue position ("orders before you") and the ETA come from the staff's own live order board, not from a delivery app. Any restaurant gets it from its existing paper receipt: the invoice number plus a QR code.

## Operating Context

- The customer journey: paper receipt → QR or invoice number → live order page, updated over Server-Sent Events.
- Staff use a busy, shared screen during service. Order cards must be scannable at a glance, and the next action must be one tap.
- Arabic (RTL) is the default; English is second. Egypt-first (Africa/Cairo business day).

## Capabilities and Constraints

- Roles and sign-in: customers use `/login` (plus `/signup`); restaurant staff use `/r/staff/login`; restaurant owners use `/r/admin/login`; the super-admin uses `/super-admin`. Each sign-in page accepts only its own role. "My orders" belongs to customers only.
- ETA has three modes: countdown, clock time, and approximate minutes. Statuses are preparing, out_for_delivery, delivered and cancelled. An order is late when it is preparing and past its ETA.
- Light and dark themes follow the device, with a manual toggle.
- Stack (existing): Next.js 16, Tailwind 4, shadcn/ui, next-intl. Every string lives in `translation/ar.ts` and `en.ts`.

## Brand Commitments

- The name Dawry / دوري stays. Every other part of the previous identity (the saffron "queue ticket" palette, the logo mark, the type) is retired by the user's decision of 2026-11-19, because it read as childish and card-heavy.
- The user wants the bar set by best-in-class tools for this kind of product. They reject stock-looking UI, card clutter and broken controls.

## Evidence on Hand

- Dev seed data: Pizza Roma, Burger House, Old Cafe (suspended) and Koshary Tahrir, with orders and staff. There are no real customer logos, photos or testimonials, so none may be fabricated.

## Product Principles

1. The waiting customer needs one answer first: how long, and how many before me.
2. Staff surfaces optimise for speed under pressure: glanceable states, one obvious next action, no hunting.
3. Each role sees only its own world: separate entrances and separate navigation.
4. RTL is first-class, not a mirror pass.
5. It works on every screen size it ships to, phone first.

## Accessibility & Inclusion

WCAG AA contrast in both themes, full keyboard and screen-reader support, and reduced motion respected. Arabic and English parity.
