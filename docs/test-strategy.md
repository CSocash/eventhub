# EventHub — Booking Test Strategy

Generated: 2026-10-11
Input: `docs/test-scenarios.md` (250 scenarios); this strategy covers the **122 booking scenarios**.
Consumed by: `/generate-tests`

Replaces the 2026-03-06 strategy, which covered the original 53 booking-management scenarios. All 53 are still assigned here; 7 of them changed layer (see [section 7](#7-changes-from-the-previous-strategy)).

---

## 1. Scope

"Booking scenarios" means every scenario that exercises one of these:

| Area | Code |
|---|---|
| Creating a booking | `POST /api/bookings`, `BookingForm` in `frontend/app/events/[id]/page.tsx:69` |
| Listing, viewing, looking up | `GET /api/bookings`, `/:id`, `/ref/:ref`; `frontend/app/bookings/page.tsx`, `frontend/app/bookings/[id]/page.tsx` |
| Cancelling and clearing | `DELETE /api/bookings/:id`, `DELETE /api/bookings`; `BookingCard.jsx`, detail page, `frontend/app/admin/bookings/page.tsx` |
| Per-user seat counts | `eventService.withPersonalSeats` (`eventService.js:6`), `bookingService.createBooking` (`bookingService.js:85-92`) |
| 9-booking FIFO limit | `bookingService.createBooking` (`bookingService.js:69-79`) |
| Booking reference | `randomRef`, `generateUniqueRef` (`bookingService.js:11-32`) |
| Refund eligibility | `RefundEligibility` (`frontend/app/bookings/[id]/page.tsx:21`) |
| Event deletion cascading to bookings | TC-115, TC-129, TC-535 |

Out of scope (128 scenarios): auth, event browsing and filters, event CRUD, navbar, and generic UI primitives (`Modal`, `Toast`, `Pagination`) where the scenario is not booking-specific. Run `/test-strategy` with no argument to assign those.

---

## 2. What each layer means in this repo

The repo has one test tool, `@playwright/test`, and one spec. There is no unit runner and no component-test harness. The layers below are defined so that only the Unit layer needs any setup.

| Layer | How it runs here | Touches production? |
|---|---|---|
| **Unit** | `node --test` (built into Node 21, no new dependency). Tests in `backend/test/unit/`. Repositories mocked with `node:test`'s `mock.method`. | No |
| **API** | Playwright `request` fixture against `/api`. Tests in `tests/api/`. | Yes: creates real users, events and bookings |
| **Component** | Playwright browser with **every `/api/**` call mocked** by `page.route()`. Session faked by seeding `localStorage.eventhub_token` and mocking `GET /api/auth/me`. Tests in `tests/component/`. | Loads the deployed frontend only; writes no data |
| **E2E** | Playwright browser, real backend, no mocks. Tests in `tests/`. | Yes |

Prerequisites before `/generate-tests` can produce the Unit layer:

1. **Export the ref helpers.** `bookingService.js:139` exports only the service object, so `randomRef` and `generateUniqueRef` are unreachable from a test. Add them to `module.exports` (or move them to `backend/src/utils/bookingRef.js`).
2. **Keep unit files out of `tests/`.** `playwright.config.ts` sets `testDir: './tests'` and Playwright's default match picks up `*.test.js`, so unit tests placed there would be run by Playwright and fail.
3. `backend/` dependencies must be installed (`npm run setup`) and `npx prisma generate` run, because `bookingService.js:3` imports the Prisma client at load time.

Component tests need no refactor: `RefundEligibility` and `BookingForm` are not exported, but they are reached by loading their page with mocked API responses.

---

## 3. Distribution

| Layer | Scenarios (primary) | Also covers (secondary) | Approx. tests | Focus | Run time |
|---|---|---|---|---|---|
| **Unit** | 12 | 11 | ~70 (table-driven) | Ref generation, validator chain boundaries and sanitisers, service decisions with mocked repositories | < 2 s |
| **API** | 53 | 6 | ~60 | Status codes, ownership, per-user seats, FIFO pruning against a real database, pagination | 1–2 min |
| **Component** | 47 | 8 | ~45 | Conditional rendering, form validation, dialogs, cache invalidation, refund widget | 1–2 min |
| **E2E** | 10 | 0 | 7 | Book → view → cancel journey, clear-all, cross-user denial, seat refresh | 2–3 min |
| **Total** | **122** | | | | |

**Shape.** By test count the suite is widest at Unit (~70) and narrowest at E2E (7). By scenario count the API layer is the widest, and that is deliberate: the booking domain is almost entirely database-state rules (ownership, FIFO pruning, seat arithmetic over stored bookings). The FIFO selection lives in the Prisma queries `findOldestUserBookingExcludingEvent` and `findOldestUserBooking` (`bookingRepository.js:70-85`); a unit test with a mocked repository cannot prove those queries pick the right row. The secondary Unit coverage in [section 6](#6-defence-in-depth) is what widens the base.

---

## 4. Layer assignments

`⚠` marks a scenario whose expected result in `test-scenarios.md` is a discovered behaviour that needs product confirmation before it is automated as pass/fail.

### 4.1 Unit — 12 scenarios

Target file: `backend/test/unit/`.

| TC | Title | Function under test | Source |
|---|---|---|---|
| TC-102 | Ref first character matches event title | `randomRef(title)` → `/^<T>-[A-Z0-9]{6}$/` | `bookingService.js:11` |
| TC-408 | Title starting with a digit | `randomRef('100 Days')` → prefix `1` | `bookingService.js:12` |
| TC-426 | Prefix for unusual titles (lowercase, symbol, `undefined`) | `randomRef` (`?? 'E'` fallback, `toUpperCase`) | `bookingService.js:12` |
| TC-405 | Collision retry, then timestamp fallback after 10 attempts | `generateUniqueRef` with `bookingRepository.findByRef` mocked | `bookingService.js:21-32` |
| TC-305 | Quantity 0 or negative rejected | `validateCreateBooking` chain, `isInt({ min: 1, max: 10 })` | `bookingValidator.js:38-41` |
| TC-306 | Quantity above 10 rejected | same | `bookingValidator.js:40` |
| TC-318 | Field validation errors (name, email, phone) | `validateCreateBooking` chain | `bookingValidator.js:21-36` |
| TC-319 | Invalid event id or quantity type | `isInt({ min: 1 })`, `toInt()` | `bookingValidator.js:16-19`, `:38-41` |
| TC-133 | Email lower-cased, name trimmed | `.trim()`, `.normalizeEmail()` | `bookingValidator.js:22`, `:30` |
| TC-423 | Name length boundary and whitespace padding | `.trim()` then `isLength({ min: 2 })` | `bookingValidator.js:21-24` |
| TC-424 | Phone formats and 10-character boundary | `isLength({ min: 10 })`, `matches(/^[0-9+\-\s()]+$/)` | `bookingValidator.js:32-36` |
| TC-425 | Gmail addresses canonicalised | `.normalizeEmail()` defaults | `bookingValidator.js:30` |

Run each validator case by executing the chain against a stub request (`await Promise.all(chain.slice(0, -1).map(v => v.run(req)))`, then `validationResult(req)`). No HTTP and no database are involved.

### 4.2 API — 53 scenarios

Target file: `tests/api/bookings.api.spec.js` (split by `describe`).

#### Contract and happy path

| TC | Title | Endpoint | Service / source |
|---|---|---|---|
| TC-031 | Create a booking | `POST /api/bookings` → 201, `message: 'Booking confirmed!'` | `bookingController.js:31`, `bookingService.createBooking` |
| TC-007 | Lookup by reference | `GET /api/bookings/ref/:ref` | `bookingService.getBookingByRef` (`:61`) |
| TC-106 | `totalPrice` = price × quantity | `POST /api/bookings` | `bookingService.js:99` |
| TC-415 | Free event gives `totalPrice: 0` | `POST /api/bookings` | `bookingService.js:99` |
| TC-403 | Quantity 10 accepted | `POST /api/bookings` | `bookingValidator.js:40` |
| TC-107 | Default page size 10 and pagination envelope | `GET /api/bookings` | `bookingService.getBookings` (`:37-52`) |
| TC-407 | Page 2 with partial results | `GET /api/bookings?page=2&limit=5` | `bookingRepository.findAll` (`:7`) |
| TC-130 | Newest first | `GET /api/bookings` | `orderBy: { createdAt: 'desc' }` (`bookingRepository.js:19`) |
| TC-131 | Filter by `eventId` | `GET /api/bookings?eventId=` | `bookingRepository.js:11` |
| TC-124 | Status always `confirmed`; cancel removes the row | `POST`, `DELETE /:id`, `GET /:id` → 404 | `bookingService.js:113`, `:133` |
| TC-132 | Same user books the same event several times | `POST /api/bookings` ×2 | `bookingService.js:86-87` |
| TC-406 | Clear all with one booking → `"1 booking(s) cleared"` | `DELETE /api/bookings` | `bookingController.js:43` |
| TC-344 | Clear all with none → `"0 booking(s) cleared"` | `DELETE /api/bookings` | `bookingRepository.deleteAllForUser` (`:60`) |

#### Per-user seats

| TC | Title | Assertion | Source |
|---|---|---|---|
| TC-110 | Seats drop for the booking user | `GET /api/events/:id` before and after | `withPersonalSeats` (`eventService.js:6`) |
| TC-111 | Another user's bookings do not affect mine | Two users, same static event | `getBookedQuantitiesForEvents` (`bookingRepository.js:91`) |
| TC-108 | Cancel restores seats (own event) | `DELETE /:id` then `GET /api/events/:id` | `bookingService.cancelBooking` (`:126`) |
| TC-112 | Cancel restores seats (static event) | same | same |
| TC-113 | Clear all restores seats on every event | `DELETE /api/bookings` then `GET /api/events` | `clearAllBookings` (`:121`) |
| TC-302 | Insufficient seats → 400 | Message `Only N seat(s) available, but M requested` | `bookingService.js:88-92` |
| TC-320 | More than remain for this user → 400 | Book 3 of 5, then request 3 | `bookingService.js:86-87` |
| TC-412 | Exactly the remaining seats → 201 | Boundary of `personalAvailable < quantity` | `bookingService.js:88` |
| TC-411 | Single-seat event sells out | Book 1 → `availableSeats: 0` → next booking 400 | `bookingService.js:87` |
| TC-413 | Sold-out seats return after cancel | Cancel → `availableSeats: 1` | `bookingRepository.delete` (`:56`) |
| TC-420 | Past-dated event can still be booked | No date check in `createBooking` | `bookingService.js:68-119` |

#### FIFO limit (9 bookings)

| TC | Title | Assertion | Source |
|---|---|---|---|
| TC-410 | 9th booking does not prune | Count stays 9, oldest still present | `count >= MAX_USER_BOOKINGS` (`bookingService.js:72`) |
| TC-100, TC-400 | 10th booking prunes the oldest from a different event | One test covers both IDs | `findOldestUserBookingExcludingEvent` (`bookingRepository.js:79`) |
| TC-101, TC-401 | Same-event fallback burns seats | `availableSeats` on the event drops by `quantity` | `sameEventFallback`, `decrementSeats` (`bookingService.js:76`, `:95-97`) |
| TC-136 ⚠ | Rejected booking at the limit still deletes the oldest | Count is 8 after a 404 or 400 | Prune at `:69-79` runs before the lookup at `:82` |
| TC-436 ⚠ | Parallel creations at the limit | Final count; no 404 `Record not found` | Count-then-delete is not atomic (`:70-78`) |
| TC-435 ⚠ | Concurrent bookings for the last seats | One 201, one 400 | Check at `:88` and insert at `:103` are not in a transaction |

#### Cascade from events

| TC | Title | Source |
|---|---|---|
| TC-129 | Deleting an event deletes its bookings | `onDelete: Cascade` in `schema.prisma` |
| TC-115 | FIFO event pruning deletes the pruned event's bookings | `eventService.createEvent` (`eventService.js:48`) |

#### Security

| TC | Title | Expected | Enforcement point |
|---|---|---|---|
| TC-203 | No token, list | 401 | `router.use(authMiddleware)` (`bookingRoutes.js:8`) |
| TC-204 | No token, detail | 401 | same |
| TC-205 | No token, clear all | 401 | same |
| TC-209 | No token, create / cancel / ref lookup | 401 | same |
| TC-201 | Cross-user `GET /:id` | 403 | `bookingService.js:57` |
| TC-206 | Cross-user `GET /ref/:ref` | 403 | `bookingService.js:64` |
| TC-202 | Cross-user `DELETE /:id` | **404** | `findById(id, userId)` filters by owner (`bookingService.js:127`, `bookingRepository.js:28`); the 403 branch at `:129` is unreachable |
| TC-219 | List returns only the caller's bookings | — | `where = { userId }` (`bookingRepository.js:9`) |
| TC-220 | Clear all removes only the caller's bookings | — | `bookingRepository.js:61` |
| TC-217 | Another user's private event cannot be booked | 404 | `eventRepository.findById(eventId, userId)` (`bookingService.js:82`) |
| TC-223 | Client-supplied `totalPrice`, `status`, `userId`, `bookingRef` ignored | Server values used | Explicit field list at `bookingService.js:104-114` |
| TC-233 ⚠ | Id probing: 403 for existing, 404 for missing | — | `findByIdOnly` (`bookingService.js:55-57`) |

#### Negative

| TC | Title | Expected | Source |
|---|---|---|---|
| TC-304 | Missing required fields | 400, `error: 'Validation failed'`, `details: [{ field, message }]` | `handleValidationErrors` (`bookingValidator.js:3-13`), mounted at `bookingRoutes.js:318` |
| TC-301 | Non-existent booking id | 404 | `bookingService.js:56` |
| TC-303 | Non-existent event | 404 | `bookingService.js:83` |
| TC-307 | Cancel an already-cancelled booking | 404 | `bookingService.js:128` |
| TC-331 | Reference that does not exist | 404 | `bookingService.js:63` |
| TC-330 ⚠ | Non-numeric id (`/api/bookings/abc`) | 500 today | `Number(id)` → `NaN` (`bookingRepository.js:30`, `:37`) |
| TC-334 ⚠ | Negative page | 500 today | `skip = (page - 1) * limit` (`bookingRepository.js:8`) |

TC-304 is the one validation case kept at the API layer. It proves the validator is mounted on the route and that the error envelope has the right shape; the boundary matrix is in the Unit layer.

### 4.3 Component — 47 scenarios

Target files: `tests/component/booking-form.spec.js`, `bookings-list.spec.js`, `booking-detail.spec.js`, `admin-bookings.spec.js`.

#### Booking form — `BookingForm` (`frontend/app/events/[id]/page.tsx:69`)

| TC | Title | Mocked state | Assertion |
|---|---|---|---|
| TC-529 | Stepper button states | Event with `availableSeats: 3` | "−" disabled at 1 (`:122`), "+" disabled at 3 (`:129`) |
| TC-123 | Quantity limited to 1–10 and to seats available | `availableSeats: 50`, then `4` | Max is `Math.min(10, availableSeats)` (`:81`) |
| TC-341 | Quantity cannot exceed 10 | `availableSeats: 50` | `#ticket-count` stops at 10 |
| TC-530 | Price summary follows quantity | Price 100, quantity 1 → 3 | Total is `price × quantity` (`:82`) |
| TC-021 | Book multiple tickets | Capture the `POST /api/bookings` body | Body has `quantity: 3`; confirmation renders |
| TC-316 | Submit with empty fields | — | Three inline errors; no POST sent (`validate`, `:88-100`) |
| TC-317 | Invalid individual fields | 1-char name, 9-digit phone | Matching error text |
| TC-321 | Server error shown as toast, form kept | POST → 400 | Toast shows `err.message` (`:107`); inputs keep values |
| TC-335 | Sold-out event cannot be booked | `availableSeats: 0` | `#confirm-booking` disabled (`:83`, `:152`) |
| TC-531 | "Confirm Booking" loading state | POST delayed | Button disabled while pending |
| TC-434 | Double-click creates one booking | POST delayed, double-click | Exactly one POST observed |
| TC-532 | Panel shows only the confirmation after booking | POST → 201 | Form absent; `.booking-ref` visible |
| TC-022 | "Browse More Events" after a booking | POST → 201 | Link navigates to `/events` |

#### Bookings list — `BookingsContent` (`frontend/app/bookings/page.tsx:14`) and `BookingCard.jsx`

| TC | Title | Mocked state | Assertion |
|---|---|---|---|
| TC-500 | Skeleton while fetching | GET delayed | 5 skeletons (`page.tsx:66-70`) |
| TC-501 | Empty state | `data: []` | "No bookings yet", "Browse Events" (`page.tsx:80-92`) |
| TC-308 | Error state | GET → 500 | "Couldn't load bookings", "Retry" refetches (`page.tsx:72-78`) |
| TC-109 | "Clear all bookings" in the header | One booking | Button present (`page.tsx:55`) |
| TC-545 | "Clear all bookings" shown with no bookings | `data: []` | Button still present (rendered unconditionally) |
| TC-507 | "Clearing…" while in progress | DELETE delayed | Text `Clearing…`, button disabled (`page.tsx:57-60`) |
| TC-345 | Dismissing the confirm keeps bookings | `dialog.dismiss()` | No DELETE request sent (`page.tsx:28`) |
| TC-510 | Pagination renders | `totalPages: 3` | Control visible; click sets `?page=2` (`page.tsx:41-45`) |
| TC-546 | Booking card contents | One booking, quantity 1 and 3 | Ref, status, `#id`, "1 ticket" / "3 tickets" (`BookingCard.jsx:66`), total |
| TC-028 | Cancel from the card | DELETE → 200 | Toast, dialog closes, list refetched (`BookingCard.jsx:35-40`) |
| TC-339 | Cancel a booking that no longer exists | DELETE → 404 | Error toast with server message; dialog closes (`BookingCard.jsx:38`) |
| TC-534 ⚠ | Seat counts after clear-all without reload | Count `GET /api/events` calls | Clear-all calls only `refetch()` (`page.tsx:32`); `['events']` is not invalidated |
| TC-535 ⚠ | Bookings list after deleting an event | Count `GET /api/bookings` calls | Event delete does not invalidate `['bookings']` |

#### Booking detail — `BookingDetailPage` (`frontend/app/bookings/[id]/page.tsx:91`)

| TC | Title | Mocked state | Assertion |
|---|---|---|---|
| TC-502 | Spinner while fetching | GET delayed | Spinner visible (`:114`) |
| TC-300 | "Booking not found" | GET → 404 | Title and "View My Bookings" (`:118-128`) |
| TC-509 | "Access Denied" on 403 | GET → 403 | `is403` branch (`:119-124`) |
| TC-547 | Detail page sections | One booking | Event, customer, payment values; `fmt_price` output (`:173-205`) |
| TC-505 | Breadcrumb shows the reference | One booking | `nav` contains the ref (`:147-151`) |
| TC-005 | Back to list | One booking | "← Back to My Bookings" → `/bookings` (`:209`) |
| TC-503 | Cancel confirmation dialog | Click "Cancel Booking" | Title, description with ref and seat count (`:215-223`) |
| TC-504 | Closing the dialog does not cancel | Click "Cancel" | No DELETE request sent |
| TC-543 | Dialog cannot be dismissed in flight | DELETE delayed | Cancel disabled, dialog stays open (`ConfirmDialog.jsx:17-20`) |

#### Refund widget — `RefundEligibility` (`frontend/app/bookings/[id]/page.tsx:21`)

| TC | Title | Mocked state | Assertion |
|---|---|---|---|
| TC-103 | One ticket is eligible | `quantity: 1` | `#refund-result` "Eligible for refund." |
| TC-104 | Multi-ticket is not eligible | `quantity: 3` | "Group bookings (3 tickets) are non-refundable." |
| TC-404 | Boundary: two tickets not eligible | `quantity: 2` | Ineligible message (`quantity === 1` at `:27`) |
| TC-105 | Spinner for about 4 seconds | `page.clock` | Spinner at 3.9 s; result at 4 s (`:26-28`) |
| TC-508 | Button hidden after the result | — | `#check-refund-btn` absent in `checking` and result states |
| TC-137 | Decided on the client with no API call | Record requests | No request between click and result |

Use `page.clock.install()` and `page.clock.fastForward(4000)` so these six tests do not each wait four real seconds.

#### Admin bookings — `AdminBookingsPage` (`frontend/app/admin/bookings/page.tsx:67`)

| TC | Title | Mocked state | Assertion |
|---|---|---|---|
| TC-026 | View bookings | Two bookings | Rows rendered; request uses `limit=15` (`:76`) |
| TC-027 | Cancel from the admin page | DELETE → 200 | Row removed after refetch |
| TC-540 | Status filter and empty state | Filter change | Request carries `status=`; "No bookings found" (`:123`) |
| TC-541 | Empty state with no bookings | `data: []` | "No bookings found" |
| TC-340 | Error state | GET → 500 | Error `EmptyState` (`:114`) |

#### Session

| TC | Title | Mocked state | Assertion |
|---|---|---|---|
| TC-229 ⚠ | Switching accounts shows no data from the previous user | Mock returns different bookings per `Authorization` token | User A's cards are never visible after User B logs in; `logout` (`useAuth.tsx:63`) does not clear the React Query cache |

### 4.4 E2E — 10 scenarios, 7 tests

Target file: `tests/booking-management.spec.js` (existing) plus `tests/booking-flow.spec.js`.

| TC | Title | Journey | Status |
|---|---|---|---|
| TC-020, TC-402 | Book one ticket (full flow) | Login → `/events` → event → form → confirmation with ref | New; TC-402 is the same test |
| TC-006 | "View My Bookings" after booking | Confirmation → `/bookings` → card present | Exists |
| TC-001 | Bookings list shows the booking | Login → `/bookings` | Exists |
| TC-002 | Booking detail page | List → "View Details" → sections | Exists |
| TC-003, TC-506 | Cancel from the detail page | Detail → dialog → toast → redirect → gone from list | Exists as one test |
| TC-004 | Clear all bookings | `/bookings` → confirm → empty state | Exists |
| TC-533 | Seat counts refresh after booking and cancelling | `/events` count → book 2 → count −2 → cancel → count restored | New |
| TC-200 | Cross-user booking shows "Access Denied" | User A books; User B opens `/bookings/<id>` | New |

---

## 5. Decision rationale — contested assignments

**TC-305, TC-306, TC-318, TC-319 → Unit (suggested: API).** `validateCreateBooking` (`bookingValidator.js:15-44`) is an array of express-validator chains with no I/O; each chain can be run against a stub request. A boundary matrix of about 25 inputs costs 25 HTTP round trips to production at the API layer and milliseconds at the Unit layer. TC-304 stays at API so one test still proves the chain is mounted at `bookingRoutes.js:318` and returns the documented envelope.

**TC-133, TC-423, TC-424, TC-425 → Unit (suggested: API or API / Component).** These check sanitisers (`trim`, `normalizeEmail`) and length boundaries in the same chain. `toInt()` and `normalizeEmail()` mutate `req.body`, so the stored value equals the sanitised value; asserting on `req.body` after running the chain is equivalent to reading the row back.

**TC-102 → Unit (suggested: E2E / API; currently automated at E2E).** `randomRef` (`bookingService.js:11`) is pure string logic. The existing E2E test logs in, clears bookings, and books an event to check one regular expression. The ref is still seen end to end because TC-020 asserts the confirmation card shows a ref of the right format.

**TC-100, TC-101, TC-400, TC-401, TC-410 → API, not Unit.** The rule is "delete the oldest booking, preferring a different event". Which row is "oldest" is decided by the `orderBy` and `where` clauses in `bookingRepository.js:70-85`. A unit test with mocked repositories would only prove that the service calls them in order. Unit tests of the service branch logic are added as secondary coverage, not as a replacement.

**TC-136 ⚠ → API.** The defect is that a deletion persists after the request is rejected. That is a statement about database state, so the test must read the booking count back after the 404.

**TC-435, TC-436 ⚠ → API.** Race conditions between the count, the delete, and the insert need real concurrent transactions. These tests are probabilistic; tag them `@race` and keep them out of the PR gate.

**TC-103, TC-104, TC-105, TC-404 → Component (suggested: E2E).** `RefundEligibility` is a `setTimeout` and one comparison (`[id]/page.tsx:26-28`); TC-137 confirms it makes no network call. Running it at E2E adds a login, a real booking and four seconds of waiting per case for no extra confidence.

**TC-200 → E2E, with TC-201 at API and TC-509 at Component.** TC-201 proves the server returns 403 and TC-509 proves the page renders "Access Denied" for a 403. Together they cover the logic, so TC-200 is technically redundant. It is kept because cross-user data access is the highest-impact failure in a sandboxed app, and one unmocked test guards against the two halves drifting apart (for example, the server changing to 404, which would make the UI say "Booking not found" while both lower tests still pass).

**TC-229 ⚠ → Component (suggested: E2E).** The risk is entirely in the browser: `logout` removes the token but leaves the React Query cache, and both users share the query key `['bookings', filters]`. A mock that returns different data per token and a controllable delay makes the stale window deterministic. With a real backend the refetch usually wins and the test passes by luck.

**TC-534, TC-535 ⚠ → Component (suggested: E2E).** Both ask whether a mutation invalidates the right query key. Counting `GET` requests through `page.route()` answers that exactly; a real backend only shows the symptom, and only within the 30-second stale time (`providers.jsx:14`).

**TC-434 → Component (suggested: E2E).** The guard is `Button`'s `disabled={disabled || loading}`. Delaying the mocked `POST` holds the pending state open long enough to double-click reliably and count requests. Against a real backend the window depends on network latency.

**TC-335, TC-339, TC-345 → Component (suggested: E2E).** Each is a single branch on one page: a disabled button when `availableSeats === 0`, an error toast on a 404, and an early return when `confirm()` is dismissed. TC-339's two-tab setup at E2E exists only to produce a 404, which a mock returns directly. TC-345 at Component can assert that no `DELETE` was sent, which is stronger than checking the list afterwards.

**TC-411, TC-413 → API (suggested: E2E).** Selling out and restoring a seat are arithmetic in `bookingService.js:87` and `withPersonalSeats`. The UI half is covered by TC-335 (sold-out rendering) and TC-533 (counts refresh).

**TC-021, TC-026, TC-027, TC-028 → Component (suggested: E2E).** These are the same create and cancel operations that TC-020 and TC-003 already cover end to end, reached from a different control. What differs is the UI wiring, which a mocked test checks: the request body carries the stepper quantity, and the list refetches after the mutation.

**TC-403 → API (suggested: E2E).** The server accepting quantity 10 is a validator boundary; the stepper stopping at 10 is TC-341.

**TC-547, TC-505 → Component, although TC-002 exists at E2E.** TC-002 checks that the sections are present with real data. The Component tests use a fixed booking, so they can assert exact formatted values (`$1,500`, the `en-IN` long date), which the E2E test cannot because it books whichever event is first.

**TC-503 → Component (P0).** The dialog's content is asserted with a mocked booking. The existing E2E TC-003 also passes through the dialog, so the P0 path is still exercised unmocked.

---

## 6. Defence in depth

Critical rules are covered at more than one layer. Bold marks the primary layer.

| Rule | Unit | API | Component | E2E |
|---|---|---|---|---|
| Per-user seat count | `withPersonalSeats` with mocked repository; `personalAvailable` branch in `createBooking` (TC-302, TC-320, TC-412) | **TC-110, TC-111, TC-302, TC-320, TC-412** | TC-123, TC-335 | TC-533 |
| 9-booking FIFO | `createBooking` with mocked repositories: no prune at 8, excluding-event query tried first, `decrementSeats` called only in fallback (TC-100, TC-101, TC-410) | **TC-100, TC-101, TC-410, TC-136** | — | — |
| Booking reference format | **TC-102, TC-405, TC-408, TC-426** | TC-031 asserts the regex | TC-546 | TC-020 |
| Quantity 1–10 | **TC-305, TC-306** | TC-304, TC-403 | TC-341, TC-529 | — |
| Total price | `createBooking` with mocked event (TC-106) | **TC-106, TC-415** | TC-530 | TC-020 |
| Ownership (cross-user) | — | **TC-201, TC-202, TC-206, TC-219, TC-220** | TC-509 | TC-200 |
| Server-controlled fields | `createBooking` ignores extra keys (TC-223) | **TC-223** | — | — |
| Authentication | `authMiddleware` (missing header, bad token) | **TC-203, TC-204, TC-205, TC-209** | — | — |
| Cancel removes the booking | — | **TC-124, TC-307** | TC-028, TC-503, TC-504 | TC-003 |
| Refund eligibility | — | — | **TC-103, TC-104, TC-404, TC-137** | — |

---

## 7. Changes from the previous strategy

| TC | Was | Now | Reason |
|---|---|---|---|
| TC-305, TC-306 | API | Unit | Validator chain is testable without HTTP |
| TC-102 | Unit + API + E2E | Unit (API and E2E assert the format inside other tests) | No dedicated E2E test for a regex |
| TC-503, TC-504, TC-505 | E2E | Component | Single-page state; mocks allow asserting that no DELETE is sent |
| TC-509 | E2E | Component | One branch on `error.status`; TC-200 remains the E2E |
| TC-402 | E2E (own test) | E2E, same test as TC-020 | The stepper bound is TC-529 |
| TC-403 | E2E | API | Server boundary; UI bound is TC-341 |
| TC-106 | Listed in the coverage map but missing from every layer table | API | — |
| TC-005 | Not assigned | Component | — |
| 69 further scenarios | Not in the scenario document | Assigned in section 4 | Booking scope grew from 53 to 122 scenarios |

Errors in the previous document that are corrected here:

- TC-202 was listed as "returns 403"; `cancelBooking` returns 404 for another user's booking.
- TC-406 appeared in the Unit table as "Price calculation" (that is TC-106) and in the API table as returning a `deleted` count; the response is a message string.
- The summary claimed 5 Unit scenarios and listed 4.
- The source map named `rahulshetty1@yahoo.com` as a second E2E account; only `rahulshetty1@gmail.com` / `Magiclife1!` is documented.

---

## 8. Anti-patterns

### In the existing test (`tests/booking-management.spec.js`)

| # | Finding | Where | Fix |
|---|---|---|---|
| 1 | **Top-only suite.** All 6 tests are E2E happy paths; nothing at any lower layer, and no negative or security test. | Whole file | Build the API and Component layers before adding more E2E |
| 2 | **Pure logic tested at E2E.** TC-102 drives a browser through login, clear and booking to check one regular expression. | `:156-168` | Move to Unit (`randomRef`); keep the format assertion inside TC-020 |
| 3 | **Setup through the UI.** Every test logs in through the form, clears bookings through the page, and books through the form before its own steps start. | `login` `:9`, `clearBookings` `:56`, `bookEvent` `:23` | Create state with the `request` fixture; reuse a `storageState` |
| 4 | **The "breadcrumb" assertion does not check the breadcrumb.** `span.font-mono.font-bold` matches the header badge (`[id]/page.tsx:157`); the breadcrumb span (`:150`) has no `font-bold`. TC-505 is unverified. | `:102` | Locate within the `nav` element |
| 5 | **CSS-class and tag locators** against the project's own priority order. | `.confirm-booking-btn` `:43`, `.booking-ref` `:46`, `h3` `:33` | `#confirm-booking` exists; add `data-testid` to the ref and title |
| 6 | **Racy conditional.** `isVisible()` runs right after `goto`, while the skeleton is showing, so it almost always returns `false`. The helper works only because the clear button is always rendered. | `:58` | Clear through `DELETE /api/bookings` |
| 7 | **Shared account, destructive setup, production.** Each test clears every booking in an account other students also use. TC-003 asserts "No bookings yet" after one cancel, which fails if anyone else books in between. | `:198`, `:217` | Register a throwaway user per run; assert on the specific ref being absent |
| 8 | **Non-deterministic data.** `bookEvent` books "the first card with a Book Now button", so the event, price and ref prefix vary between runs. | `:27-29` | Create a known event through the API first |
| 9 | **Hard-coded base URL** instead of the configured `baseURL`. | `:3` | `page.goto('/login')` |
| 10 | **Duplication.** TC-006 re-implements `bookEvent` inline; TC-004 repeats what `clearBookings` already does in every test. | `:127-144`, `:213-217` | Reuse the helper |
| 11 | `console.log` in tests. | `:34`, `:49`, `:144`, `:167` | Remove, or use `test.info().annotations` |

### In the suggested layers of `docs/test-scenarios.md`

| Anti-pattern | Scenarios | Assigned instead |
|---|---|---|
| Client-only logic at E2E | TC-103, TC-104, TC-404 | Component |
| Arithmetic and boundaries at E2E | TC-403, TC-411 | API |
| Single-branch UI state at E2E | TC-335, TC-339, TC-345, TC-434, TC-504, TC-505, TC-509 | Component |
| Cache-invalidation checks at E2E | TC-229, TC-534, TC-535 | Component |
| Validation matrix at API | TC-305, TC-306, TC-318, TC-319, TC-423, TC-424, TC-425 | Unit |

---

## 9. Constraints for test generation

1. **Never trigger the same-event FIFO fallback on a seeded event.** TC-101, TC-401 and TC-136 make `createBooking` call `eventRepository.decrementSeats` (`eventRepository.js:68`), which permanently lowers `availableSeats` on the shared row. On production that removes seats from a seeded event for every user, and nothing restores them. Create a private event through `POST /api/events` and run these tests against it.
2. **One throwaway user per API test file.** Register through `POST /api/auth/register`. FIFO tests need a known booking count, and cross-user tests need two accounts. There is no delete-user endpoint, so each run leaves accounts behind in the production database; confirm that is acceptable for the course environment, or run this layer against a local backend.
3. **A private event counts toward the 6-event limit.** Creating a seventh silently deletes the oldest and its bookings, so create at most six per user.
4. **Component tests must mock every `/api/**` request**, including `GET /api/auth/me`. An unmocked request reaches production with a fake token, gets a 401, and the axios interceptor redirects to `/login`.
5. **`⚠` scenarios** (TC-136, TC-229, TC-233, TC-330, TC-334, TC-420, TC-435, TC-436, TC-534, TC-535): generate them with `test.fail()` or a `@known-issue` tag asserting the expected behaviour, so they report without blocking, until the product owner confirms what is intended.
6. **TC-543 has an extra thing to watch.** While a cancel is pending, `ConfirmDialog.jsx:17` passes `onClose={undefined}` to `Modal`, whose Escape handler calls `onClose()` unguarded (`Modal.jsx:24`). Pressing Escape probably throws a `TypeError` in the page. Listen for `pageerror` in that test.

---

## 10. Implementation order

TC-400, TC-401 and TC-402 are not listed: they share a test with TC-100, TC-101 and TC-020.

**Tier 1 — P0, gate for release**

- Unit: TC-102, TC-305, TC-306
- API: TC-031, TC-106, TC-110, TC-111, TC-100, TC-302, TC-320, TC-129, TC-201, TC-202, TC-203, TC-204, TC-205, TC-209, TC-217, TC-219, TC-220, TC-223
- Component: TC-021, TC-103, TC-104, TC-123, TC-316, TC-335, TC-503, TC-509, TC-229 ⚠
- E2E: TC-020, TC-001, TC-002, TC-003 (+ TC-506), TC-004, TC-200

**Tier 2 — P1, every PR**

- Unit: TC-318, TC-319
- API: TC-007, TC-107, TC-108, TC-112, TC-113, TC-115, TC-124, TC-132, TC-101, TC-410, TC-136 ⚠, TC-206, TC-301, TC-303, TC-304, TC-307, TC-403, TC-411, TC-412, TC-413
- Component: TC-026, TC-027, TC-028, TC-105, TC-300, TC-317, TC-321, TC-345, TC-404, TC-434, TC-500, TC-501, TC-504, TC-529, TC-546
- E2E: TC-006, TC-533

**Tier 3 — P2 and P3, nightly**

- Unit: TC-133, TC-405, TC-408, TC-423, TC-424, TC-425, TC-426
- API: TC-130, TC-131, TC-233 ⚠, TC-330 ⚠, TC-331, TC-334 ⚠, TC-344, TC-406, TC-407, TC-415, TC-420 ⚠, TC-435 ⚠, TC-436 ⚠
- Component: TC-005, TC-022, TC-109, TC-137, TC-308, TC-339, TC-340, TC-341, TC-502, TC-505, TC-507, TC-508, TC-510, TC-530, TC-531, TC-532, TC-534 ⚠, TC-535 ⚠, TC-540, TC-541, TC-543, TC-545, TC-547

---

## 11. Source file map

| Layer | Test file | Source under test |
|---|---|---|
| Unit | `backend/test/unit/bookingRef.test.js` | `backend/src/services/bookingService.js:11-32` |
| Unit | `backend/test/unit/bookingValidator.test.js` | `backend/src/validators/bookingValidator.js` |
| Unit (secondary) | `backend/test/unit/bookingService.test.js` | `bookingService.createBooking`, `eventService.withPersonalSeats`, `middleware/authMiddleware.js` |
| API | `tests/api/bookings.api.spec.js` | `backend/src/routes/bookingRoutes.js`, `bookingController.js`, `bookingService.js`, `bookingRepository.js` |
| API | `tests/api/bookings-security.api.spec.js` | `middleware/authMiddleware.js`, `bookingService.js:54-66`, `:126-129` |
| Component | `tests/component/booking-form.spec.js` | `frontend/app/events/[id]/page.tsx` |
| Component | `tests/component/bookings-list.spec.js` | `frontend/app/bookings/page.tsx`, `frontend/components/bookings/BookingCard.jsx` |
| Component | `tests/component/booking-detail.spec.js` | `frontend/app/bookings/[id]/page.tsx`, `frontend/components/ui/ConfirmDialog.jsx` |
| Component | `tests/component/admin-bookings.spec.js` | `frontend/app/admin/bookings/page.tsx` |
| E2E | `tests/booking-management.spec.js` (existing), `tests/booking-flow.spec.js` | Full stack |

Test account for E2E: `rahulshetty1@gmail.com` / `Magiclife1!`. Run Unit with `node --test backend/test/unit/`.
