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

## Redeploying from a GitHub Codespace terminal

This is the short loop for pushing an updated copy of this project live. Run
everything from the repository root in the Codespace terminal.

### 1. Get the code in place

If you downloaded a ZIP, unzip it over your repo so the files are replaced, then
check what changed before committing anything:

```bash
git status
git diff --stat
```

### 2. Install and log in

```bash
npm install
npx wrangler login       # opens a browser tab; approve, then return here
npx wrangler whoami      # confirm the right Cloudflare account
```

In a Codespace `wrangler login` cannot always open a browser. If it hangs, use
an API token instead:

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
npx wrangler whoami
```

Create that token in the Cloudflare dashboard with the *Edit Cloudflare Workers*
template, plus D1 and R2 read/write.

### 3. Apply the database migrations

This deploy adds `migrations/0004_focal_and_homepage_colors.sql`. Migrations are
additive and safe to re-run — already-applied ones are skipped.

```bash
# see what would run
npx wrangler d1 migrations list dukh-dealer-db --remote

# apply to the live database
npm run db:migrate:remote
```

**Do this before deploying the code.** The new code reads `banners.focal_x`,
`theme_settings.homepage_heading_color` and friends; if the columns are missing,
those reads fail.

### 4. Check it builds before you deploy

```bash
npx tsc --noEmit         # type check
npm run lint             # lint
npm run build            # production build
```

Fix anything that fails here — a broken build will not deploy cleanly.

### 5. Deploy

```bash
npm run deploy
```

Wrangler prints the deployment URL when it finishes.

### 6. Verify on the live site

In this order, because each step depends on the previous one:

```text
1. /api/favicon                 -> returns an image (your uploaded one, or the default)
2. hard-reload the homepage     -> tab icon is correct
3. Admin > Theme                -> set Homepage Heading, save, reload homepage
4. Admin > Banners              -> click the image to set a focal point, publish,
                                   then view the homepage in a narrow window
5. Admin > Bookings > a booking -> approve payment, save a Meet link
6. /track                       -> enter that Booking ID, the link is there
```

### 7. Commit and push

```bash
git add -A
git commit -m "Banner focal point, homepage text colours, favicon fix, booking tracking"
git push
```

### If something goes wrong

```bash
npx wrangler deployments list           # recent deploys
npx wrangler rollback                   # roll back to the previous one
npx wrangler tail                        # live logs from the deployed Worker
npx wrangler d1 execute dukh-dealer-db --remote \
  --command "SELECT favicon, updated_at FROM logo_settings"
```

Migrations are additive, so a code rollback does not require a database
rollback — the extra columns are simply unused by older code.

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

There is no customer login, so **the Booking ID is the credential**. A customer
who has `DD-2026-8F42K` can open that booking from any device, at any time, via
the permanent **Track Booking** page at `/track` (linked in the site header and
footer). This is deliberate: customers need to get back into their booking after
closing the tab, without an account or a saved link.

`GET /api/public/bookings/<bookingId>` returns the customer view: status,
session date/time, package/service, duration, assigned listener, amount,
language — and the Google Meet link.

The Meet link is returned **only** when both of these are true in D1:

1. `payment_status = 'verified'` (an admin approved the payment), and
2. an admin has actually saved a link on that booking

It is never returned before payment approval, and never for a cancelled or
refunded booking. The payment screenshot, admin notes and customer id are never
returned at all. Archived bookings stop resolving entirely.

**Previously the link also required the join window to be open** (from ten
minutes before the session). That is why a link an admin added days in advance
appeared never to show up — the customer could only have seen it in those ten
minutes. Visibility is no longer time-gated: the link shows as soon as it
exists, so the customer can add it to their calendar. `joinWindowOpen` is still
returned and is used only to change the wording on the page ("join when you're
ready" vs "join at your scheduled time").

> Trade-off worth knowing: because the Booking ID alone grants access, a Booking
> ID is a secret. The generated codes are five characters from a 32-character
> alphabet (~33 million combinations per year prefix), which is fine for this
> use but is not the same as authentication. If you later want it stricter, each
> booking still has an `access_token` column populated at creation — re-adding a
> token check in `toPublicBooking()` (`src/lib/booking-access.ts`) is a
> few-line change, but it would break the "enter just your Booking ID" flow.

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
src/components/admin/FocalPointPicker.tsx  Click-to-set banner focal point
src/app/api/favicon       Single source of truth for the site favicon
src/app/track             Public "Track Booking / Check Booking Status" page
```

## Banner focal point

Admin Panel → Banners → edit a banner with an image: below the image you get a
focal point picker. **Click anywhere on the image to set the focal point** — it
also responds to tap (pointer events, so phones and tablets work), to dragging,
and to arrow keys when focused (Shift for bigger steps).

The point is stored as a percentage of the image's own width and height
(`banners.focal_x` / `focal_y`, defaulting to dead-centre 50/50) and applied on
the public hero as CSS `object-position`. The hero uses `object-cover`, which
crops the image to fill the space — `object-position` decides *which* part
survives that crop, so on a tall narrow phone the thing you clicked stays in
frame. The editor shows a live "mobile crop preview" so you can confirm before
publishing.

For video banners the focal point applies to the poster image and to the video's
own cropping.

## Homepage header & hero text colours

Admin Panel → Theme → "Homepage header & hero text" has four independent
controls:

| Control | Applies to | Falls back to |
|---|---|---|
| Homepage Heading | hero `<h1>` | theme Foreground / Text |
| Homepage Subheading / Description | hero description paragraph | theme Muted |
| Homepage Eyebrow / Label | small uppercase label above the heading | theme Accent |
| Homepage Navigation Text | header nav links + mobile menu button | theme Muted |

Each is stored in its own `theme_settings` column and sent independently, so
setting or clearing one never changes the others. **Leave a field blank and that
element uses the site's default theme colour** — each field has a Clear button,
and the swatch shows the inherited colour while blank so you can see what blank
means.

Scope is deliberately narrow: these only colour homepage header/hero *text*.
They do not touch button backgrounds, button labels, or any text on other pages
— the navigation colour is applied only when the visitor is on `/`. "Reset to
default" restores the brand palette and leaves these overrides alone.

Non-hex values are ignored rather than stored, so a typo can't break the public
stylesheet.

## Favicon

The favicon is served from one place: **`/api/favicon`**, which reads the active
favicon from `logo_settings`, streams it out of R2, and falls back to the
bundled `public/favicon-default.png` when nothing has been uploaded.

What was wrong: the repo contained `src/app/favicon.ico`. Next's file convention
turns that file into its own `<link rel="icon" href="/favicon.ico">` in `<head>`,
which sat alongside — and won over — the icon set from `logo_settings` in
`generateMetadata`. So uploads saved correctly to R2 and D1 and still never
appeared. That file has been removed.

Three things now keep it correct:

- `generateMetadata` always emits `icon`, `shortcut` and `apple` pointing at
  `/api/favicon?v=<last-save-timestamp>`
- `next.config.ts` rewrites `/favicon.ico` → `/api/favicon`, so the request
  browsers make on their own also gets the uploaded icon.
  **Do not add a file at `public/favicon.ico`** — a static file takes precedence
  over the rewrite and would reintroduce the bug. That is why the fallback is
  named `favicon-default.png`.
- the route responds `Cache-Control: public, max-age=0, must-revalidate` with an
  ETag derived from the last save. Repeat visits still get a cheap `304`, but a
  replaced icon appears immediately rather than being pinned for days.

Migration `0004` also clears `logo_settings.favicon` when it holds
`/favicon.ico` (the old seed value), because `/favicon.ico` now points at the
favicon route and would otherwise make it redirect to itself. Uploaded favicons
are left untouched.

Browsers cache tab icons very aggressively even so. If you still see the old one
after deploying, hard-reload (Ctrl/Cmd+Shift+R) or open the site in a private
window; visiting `/api/favicon` directly shows you what the server is actually
serving.

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
so a CMS change is visible immediately. The logo URL carries a `?v=` stamp derived from
the last save; the favicon is served from `/api/favicon` with a `?v=` stamp and
`must-revalidate` + ETag, because browsers cache tab icons hard enough to keep showing a
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
