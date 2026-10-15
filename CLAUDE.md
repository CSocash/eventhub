# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
EventHub is a full-stack event ticket booking platform built for QA training. Users browse events, book tickets, manage bookings, and create events. Each user operates in an isolated sandbox: they see the shared seeded events plus only their own events and bookings.

- **Frontend** (`frontend/`, port 3000): Next.js 14 App Router, React 18, Tailwind, React Query v5. Mixed `.tsx`/`.ts` and `.jsx`/`.js`.
- **Backend** (`backend/`, port 3001): Express, Prisma 5, MySQL 8, plain JavaScript (CommonJS). JWT auth (7-day expiry), bcryptjs.
- **Tests** (`tests/`): Playwright E2E, Chromium only.

## Commands
Run from the repo root unless noted.

```bash
npm run setup        # Install deps in backend/ and frontend/ (root `npm install` only gets Playwright + concurrently)
npm run dev          # Start API + web concurrently
npm run db:push      # Push Prisma schema without migration files (non-interactive)
npm run migrate      # prisma migrate dev (interactive, needs a terminal)
npm run seed         # Seed the 10 static events
npm run build        # next build

npm run test         # All Playwright tests
npm run test:ui      # Playwright UI mode
npm run test:report  # Open the last HTML report
npx playwright test tests/<file>.spec.js --reporter=line   # Single file
npx playwright test tests/<file>.spec.js -g "<test title>"  # Single test
docker compose run --rm --build tests                       # Whole suite in the Playwright container
```

Checks CI runs on every PR (`.github/workflows/ci.yml`); run these before pushing:

```bash
cd backend  && node --check server.js && node --check app.js
cd backend  && npx prisma validate && npx prisma format   # CI fails if `format` changes schema.prisma
cd frontend && npx tsc --noEmit && npm run build
```

- There are no unit tests, and the backend has no linter or type-check beyond `node --check`.
- `npm run lint` runs `next lint`, but no ESLint config is committed, so it prompts for interactive setup instead of linting.
- Local setup needs `backend/.env` (see `backend/.env.example`: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `SHOW_EXPLORE_LINKS`) and `frontend/.env.local` (`NEXT_PUBLIC_API_URL`, which includes the `/api` suffix).
- Swagger UI is served at `http://localhost:3001/api/docs`, generated from JSDoc `@swagger` blocks in `backend/src/routes/*.js`. Update those blocks when changing an endpoint.

## Playwright tests run against production
`playwright.config.ts` sets `baseURL` to `https://eventhub.rahulshettyacademy.com`, and the existing spec hardcodes the same URL. `npm run test` therefore exercises the **deployed site, not your local servers**: local code changes are not covered until deployed, and tests create real data in the shared test account. The `playwright.yml` workflow builds the `Dockerfile` image and runs the suite in it (via the `docker-compose.yml` `tests` service) against the live site on every push to `main`, fails the run when any test fails, and always uploads the HTML report as the `playwright-report-<run id>` artifact.

The `Dockerfile` and `docker-compose.yml` only package the test runner (root `package.json`, `playwright.config.ts`, `tests/`); they do not run the app, and the container also targets production. The image is `node:20-bookworm` plus `npx playwright install --with-deps` (all browsers), run after `npm ci`, so browser builds always follow the `@playwright/test` version in `package-lock.json`. The CI workflow and local runs use the same image.

## Testing Conventions
- Test files go in `tests/` as `<feature-name>.spec.js` (JavaScript, with step comments).
- Follow the `playwright-best-practices` skill; use the `eventhub-domain` skill for selectors, API reference, and flows. The skill's examples use `http://localhost:3000` as the base URL, but the config and the existing spec target production (see above); follow the existing spec.
- Locator priority: `data-testid` > role > label/placeholder > ID > CSS class.
- No `page.waitForTimeout()`; wait with `expect(...).toBeVisible()`.
- Tests must be self-contained (login → action → assert). `fullyParallel` is off and retries are 0.
- Test account: `rahulshetty1@gmail.com` / `Magiclife1!`
- The navbar renders `logout-btn` and `user-email-display` in both the desktop and mobile markup, so scope those locators when the mobile drawer is open.

## Backend Architecture
Layered: Routes → (validators) → Controllers → Services → Repositories → Prisma. `app.js` wires middleware and routes; `server.js` connects to the DB and listens.

- **Auth**: `authMiddleware` is applied with `router.use` to all of `/api/events` and `/api/bookings`; it verifies the Bearer JWT and sets `req.user` (`userId`, `email`). Only `/api/auth/register`, `/api/auth/login`, `/api/health`, and `/api/config` are public.
- **Sandboxing lives in the repositories**: event queries always filter on `isStatic: true OR userId = <caller>`, so another user's event is a 404, not a 403. Bookings are looked up by id and then ownership-checked in the service, which yields 403 for cross-user access.
- **Errors**: services throw the domain errors in `src/utils/errors.js`; `middleware/errorHandler.js` maps them (and Prisma codes P2002/P2025/P2003) to HTTP statuses. Throw these rather than writing responses in services.
- **Response envelope**: success is `{ success, data, pagination? }`; failure is `{ success: false, error, details? }`.
- **Schema**: `User`, `Event` (`isStatic`, nullable `userId`), `Booking`. All relations cascade on delete.

## Business Rules (as implemented)
- **Per-user seat counts**: booking does not decrement `Event.availableSeats`. The value returned to a user is `availableSeats − that user's booked quantity`, computed in `eventService.withPersonalSeats` and re-checked in `bookingService.createBooking`. Cancelling hard-deletes the booking row, which is what "restores" the seats.
- **Max 9 bookings per user**, FIFO: at the limit, the oldest booking is deleted, preferring one for a *different* event. If only same-event bookings exist, the oldest is deleted and `availableSeats` is permanently decremented so the visible count still drops.
- The booking FIFO prune runs *before* the event lookup and seat check, and nothing is wrapped in a transaction, so a rejected booking request (404 or insufficient seats) made at the limit still deletes the oldest booking.
- **Max 6 user-created events**, FIFO: the oldest is deleted (cascading its bookings).
- Updating an event's `totalSeats` does not touch `availableSeats`.
- The `/admin/events` and `/admin/bookings` pages have no role check: there are no roles, and every logged-in user manages their own sandboxed data there.
- **Booking ref**: `<first character of event title, uppercased>-<6 chars of A–Z0–9>`.
- Static (seeded) events cannot be updated or deleted (403). Users can only modify their own events.
- Refund eligibility is client-side only: 1 ticket = eligible, more than 1 = not eligible.

## Frontend Architecture
- `app/layout.tsx` nests `Providers` (Auth → React Query → Toast) → `AuthGuard` → `AppShell`. `AuthGuard` redirects every route except `/login` and `/register` to `/login` when there is no user; `AppShell` hides the navbar and footer on those two routes.
- **Auth state**: `lib/hooks/useAuth.tsx` stores the JWT in `localStorage` under `eventhub_token` and validates it on mount via `/auth/me`.
- **Data fetching**: pages use the React Query hooks in `lib/hooks/` (`useEvents`, `useBookings`). Booking mutations invalidate both the `['bookings']` and `['events']` keys, because seat counts depend on bookings.
- **Two parallel API layers in `lib/api/`**: the one in use is axios-based (`client.js`, `eventsApi.js`, `bookingsApi.js`, `authApi.js`). Its interceptors attach the token, unwrap `response.data` so callers receive the API envelope directly, and on a 401 clear the token and redirect to `/login`. A second, typed set (`client.ts`, `events.ts`, `bookings.ts`, `index.ts`) wraps a fetch client with no auth header. `client.js` and `client.ts` share the specifier `./client` and resolve differently: the Next build always bundles `client.js` (axios), while `tsc` type-checks against `client.ts`. `client.ts` therefore never runs, and its types describe a client that is not the one executing. The bookings page calls `bookingsApi.clearAll()` from `bookings.ts`, which works only because it lands on the axios client at runtime; other methods in that file are stale (`cancel` calls `PATCH /bookings/:id/cancel`, which the backend does not have). Add new API calls to the axios `*Api.js` files.
- Path alias `@/` maps to `frontend/`.

## CI / Deploy
- `ci.yml` (PRs to `main`): backend checks, frontend type-check + build, and a schema-drift job that diffs the PR's `schema.prisma` against the **production database** over SSH. The drift job and `deploy.yml` only run in `rahulshettyacademy/eventhub`, which holds the server secrets; forks skip them. A schema change fails that job until the migration has been applied on the server.
- `deploy.yml` (push to `main`): reruns CI, then deploys over SSH (`git reset --hard origin/main`, `npm ci`, `prisma generate`, `next build`, PM2 reload). Merging to `main` ships to production.
- **Migrations are never run by the pipeline.** A schema change needs a committed migration (`npm run migrate`) and someone must run `npx prisma migrate deploy` on the server by hand before the PR can go green and merge.
- CI uses Node 21.7.1.

## Claude Skills
Project skills live in `.claude/skills/`:
- `/generate-tests <feature>`: writes Playwright tests
- `/review-tests <file>`: reviews test code quality
- `/create-scenarios <area>`: writes test scenario documents (output in `docs/`)
- `/test-strategy <scenarios>`: assigns scenarios to test-pyramid layers
- `eventhub-domain`, `playwright-best-practices`: reference skills (business rules, API, UI selectors, Playwright standards)

## Notes
- `README.md` predates auth and sandboxing: its folder tree, `EVT-XXXXXX` booking-ref format, and unauthenticated endpoint descriptions are out of date. Trust the code and the `eventhub-domain` skill over it.
