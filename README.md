# Dukh Dealer

Private paid conversation service — Next.js App Router site with a full CMS-style
Admin Panel, deployed to Cloudflare Workers with D1 (database) and R2 (media storage).

## Product

Customers book private sessions:

- Private live DM/chat
- Private voice
- Mystery Video (listener may wear the official mystery mask; customer camera optional)

Focus: listening, conversation, talking, being heard.
**Not** therapy, psychotherapy, medical treatment, diagnosis, or an emergency service.

## Tech stack

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4
- Cloudflare Workers via the [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) adapter
- Cloudflare **D1** (SQLite) for all content and bookings
- Cloudflare **R2** for uploaded media (images/video)
- Admin auth: PBKDF2 password hashing + signed session cookie stored in D1 (no third-party auth service)

> Cloudflare's own docs currently point new Next.js projects at a newer adapter called
> "vinext," and mark OpenNext as "maintain existing apps only." This project uses **OpenNext**
> because it's the long-established, fully-documented path with mature D1/R2 binding support.
> It still works and is actively maintained — but if you start a *new* Cloudflare + Next.js
> project from scratch later, it's worth checking whether vinext has become the better default.

## What changed from the original Part 1 scaffold

The zip this was built from was a frontend-only prototype: all content lived in an
in-memory JS array (`src/data/mock.ts`) that reset on every restart, and the admin
panel had no login. This version adds:

- A full D1 schema (`migrations/`) covering every content type
- A server-side data layer (`src/lib/d1.ts`) that replaces the old mock repository
- Real admin authentication (`src/lib/auth.ts`, `src/lib/session.ts`, `/admin/login`)
- API routes under `/api/admin/*` (session-protected) and `/api/public/*` (booking flow)
- R2-backed media uploads for the Media Library
- Previously-stubbed CMS pages (Media, Reviews, FAQ, Blog, Settings) are now real CRUD UIs
- `wrangler.jsonc`, `open-next.config.ts`, and updated `package.json` scripts for deployment

## Local development

```bash
npm install
npx wrangler d1 create dukh-dealer-db   # see "First deploy" below — do this once first
```

Local dev uses the same D1/R2 bindings as production, run locally by Wrangler:

```bash
npm run db:migrate:local
npm run dev
```

`next dev` picks up your `wrangler.jsonc` bindings automatically via
`initOpenNextCloudflareForDev()` in `next.config.ts`.

## First deploy — step by step

### 1. Install dependencies and login

```bash
npm install
npx wrangler login
```

### 2. Create the D1 database

```bash
npx wrangler d1 create dukh-dealer-db
```

This prints a `database_id`. Copy it into `wrangler.jsonc`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

### 3. Create the R2 bucket

```bash
npx wrangler r2 bucket create dukh-dealer-media
```

The bucket name already matches `wrangler.jsonc` (`dukh-dealer-media`) — change both
if you want a different name.

### 4. Run migrations

```bash
npm run db:migrate:remote
```

This creates all tables and seeds starter content (the same packages/listeners/FAQs
the mock version shipped with — edit or delete them from the Admin Panel afterwards).

### 5. Set the admin setup secret

This one-time secret lets you create your first admin login without exposing that
endpoint to random visitors. Pick your own random string:

```bash
npx wrangler secret put ADMIN_SETUP_KEY
```

### 6. Deploy

```bash
npm run deploy
```

This runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`. Wrangler will
print your `*.workers.dev` URL (or your configured custom domain).

### 7. Create your admin account

Once deployed, call the setup endpoint once (replace values):

```bash
curl -X POST https://YOUR-DEPLOYMENT-URL/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password","setupKey":"THE_SECRET_FROM_STEP_5"}'
```

This only works once — it refuses if an admin account already exists. Then go to
`/admin/login` and sign in.

### 8. Open your availability

**Nothing is bookable until you open availability.** This is deliberate: the admin
controls the calendar, not the code.

1. Admin Panel → **Listeners** → approve at least one listener
2. Admin Panel → **Availability** → choose the listener, a date, a start and end time
   (e.g. 10:00–13:00), and optionally "repeat for N days"
3. Customers now see only start times that fit inside that window for the package
   duration they picked

Slot start times are computed server-side from your windows minus blocks minus existing
bookings, so a 10:00–13:00 window will never offer 12:30 for a 60-minute package.

Set the timezone your windows are expressed in under Admin → Settings → Site
(default `Asia/Kolkata`).

## Media & R2

Uploads from the Admin Panel → Media go to your R2 bucket and are served back through
`/api/media/[key]`, which streams the object through the Worker. That's simplest to set
up but adds a hop. For a high-traffic production site, consider instead:

1. Enabling a [custom domain or `r2.dev` public bucket URL](https://developers.cloudflare.com/r2/buckets/public-buckets/) for `dukh-dealer-media`
2. Updating `createMediaItem()` calls in `src/lib/d1.ts` / `src/app/api/admin/media/route.ts`
   to store that public URL directly instead of the `/api/media/[key]` proxy path

## Payment screenshots

Payment proofs are uploaded as real files (multipart) to R2 under the `payments/`
prefix; `bookings.payment_screenshot` stores the served URL and
`bookings.payment_screenshot_key` the R2 key. They were previously base64 data URLs
inside the D1 row, which does not survive a normal phone screenshot.

`payments/` objects are **admin-only**: `/api/media/[key]` requires a valid admin
session for that prefix and serves them `private, no-store`. They are never included in
any public API response.

## Booking access and the Google Meet link

There is no customer login, so ownership of a booking is proved with a high-entropy
access token minted when the booking is created and returned exactly once, in the
confirmation link (`/booking/DD-2026-XXXXX?k=...`). The browser also keeps a copy in
`localStorage` so returning to the page on the same device still works.

Requesting a booking without a token still returns **200** with its status — a valid
Booking ID never 404s — but withholds the nickname, language, conversation preference
and the Meet link.

The Meet link is attached to the response only when all of these are true:

1. the caller supplied the correct access token
2. `payment_status = 'verified'` in D1
3. an admin has actually saved a link on that booking
4. the current time is inside the join window (10 minutes before the start until
   15 minutes after the end, using the booking's own timezone)

Admins set the link on the booking detail page. Nothing about payment state or the link
is inferred client-side.

## Environment / secrets reference

| Name | Where | Purpose |
|---|---|---|
| `ADMIN_SETUP_KEY` | `wrangler secret put` | Gates the one-time `/api/admin/setup` account creation |
| `DB` | `wrangler.jsonc` d1_databases | D1 binding, auto-available in Workers |
| `MEDIA_BUCKET` | `wrangler.jsonc` r2_buckets | R2 binding, auto-available in Workers |

## Project structure

```
migrations/              D1 schema + seed SQL
src/lib/d1.ts             All D1 reads/writes (server-only)
src/lib/auth.ts           Password hashing + session tokens (Web Crypto, edge-safe)
src/lib/session.ts        requireAdmin() guard for API routes
src/middleware.ts         Lightweight /admin/* cookie-presence gate
src/app/api/admin/*       Session-protected CRUD APIs
src/app/api/public/*      Unauthenticated booking-flow APIs
src/app/api/media/[key]   Public R2 object read-through
src/app/admin/*           Admin Panel UI (client components, calls /api/admin/*)
src/lib/availability.ts   Duration-aware slot computation + clash checks
src/lib/timezone.ts       Intl-only timezone maths (no Node APIs, Workers-safe)
src/lib/booking-access.ts Access tokens, join window, Meet-link disclosure rules
src/components/admin/*    Admin design system: AdminButton, dialogs, form fields
```

## Admin Panel on mobile

The Admin Panel is built mobile-first — every section is reachable from the hamburger
drawer, forms are single-column with 44px targets and 16px inputs (so iOS doesn't zoom),
long tables become stacked cards below `lg`, and dialogs are capped to the viewport and
scroll internally.

Admin buttons use `src/components/admin/AdminButton.tsx`, which has semantic variants
(`primary`, `secondary`, `activate`, `deactivate`, `destructive`, `ghost`) built on fixed
`--admin-*` tokens in `globals.css`. These are intentionally **independent of the public
theme**, so changing the site colours can never make admin actions unreadable. The public
CTA style (`#E76F35` on white) is not available inside the admin.

## Deleting bookings

Admins can delete a booking from its detail page. It requires re-entering the admin
password, which is verified **server-side** against the signed-in admin's stored hash —
never in the browser, and never stored. The default action archives (soft-deletes): the
booking leaves booking history, stops resolving for the customer, and frees its time
slot, while the row is retained for accounting. Archived bookings can be restored.
`DELETE ... {"mode":"purge"}` removes the row and its R2 payment proof permanently.

Every sensitive action (payment approval/rejection/refund, Meet-link changes, booking
deletion, availability, package, banner, logo, theme and CMS edits) writes to
`audit_log`, viewable at Admin → Audit Log. Customers have no delete capability.

## Caching

The root layout, homepage and public pages are `force-dynamic` and read D1 per request,
so a CMS change is visible immediately. Logo and favicon URLs carry a `?v=` stamp derived
from the last save, because browsers cache favicons hard enough to keep showing a
replaced one. Uploaded CMS media is served `immutable` — safe because each upload gets a
fresh UUID key, so a replacement is a different URL. Booking, payment and audit responses
are `private, no-store`.

## Not yet built (beyond original scope)

This deploy covers the CMS admin panel, D1/R2 persistence, and the booking request flow.
It does **not** include: the actual chat/voice/video session experience (sessions happen
in Google Meet via the admin-supplied link), real payment gateway integration (payments
are manual UPI + screenshot + admin verification, as the original design specified), or
customer accounts/login. Those were out of scope for what was asked — flagging them here
so they're not mistaken for oversights if you go looking for them.
