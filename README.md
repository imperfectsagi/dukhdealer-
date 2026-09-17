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

### 8. Availability

Availability slots are generated automatically, 14 days ahead, the first time anyone
hits the booking page or the admin availability API — no manual step needed. The seed
migration deliberately doesn't hardcode calendar dates, since plain SQL can't compute
"today" at migration time.

## Media & R2

Uploads from the Admin Panel → Media go to your R2 bucket and are served back through
`/api/media/[key]`, which streams the object through the Worker. That's simplest to set
up but adds a hop. For a high-traffic production site, consider instead:

1. Enabling a [custom domain or `r2.dev` public bucket URL](https://developers.cloudflare.com/r2/buckets/public-buckets/) for `dukh-dealer-media`
2. Updating `createMediaItem()` calls in `src/lib/d1.ts` / `src/app/api/admin/media/route.ts`
   to store that public URL directly instead of the `/api/media/[key]` proxy path

## Payment screenshots

Customer payment screenshots are currently stored as base64 data URLs directly in the
`bookings.payment_screenshot` D1 column (capped at ~3MB per booking in
`src/app/api/public/bookings/route.ts`). This is the simplest path and keeps the public
booking flow working without needing an authenticated upload step. If booking volume
grows, consider switching this to an R2 upload (same pattern as the Media Library) to
keep D1 row sizes small — D1 has per-row and per-database size considerations at scale.

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
```

## Not yet built (beyond original scope)

This deploy covers the CMS admin panel, D1/R2 persistence, and the booking request flow.
It does **not** include: the actual chat/voice/video session experience, real payment
gateway integration (payments are manual UPI + screenshot + admin verification, as the
original design specified), or customer accounts/login. Those were out of scope for
what was asked — flagging them here so they're not mistaken for oversights if you go
looking for them.
