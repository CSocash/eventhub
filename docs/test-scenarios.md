# EventHub — Test Scenarios (Complete Application Suite)

Generated: 2026-03-06 (Booking Management) · Extended: 2026-10-10 (entire application)
Scope: Authentication, Navigation, Event Browsing, Event Detail & Booking, Booking Management, Admin (Events & Bookings), API contract, Sandbox limits

Sources: `eventhub-domain` skill (`business-rules.md`, `user-flows.md`, `api-reference.md`), `frontend/app/`, `frontend/components/`, `backend/src/` (routes, validators, services, repositories, middleware).

## How to read this document

- IDs are stable. The original Booking Management scenarios keep their numbers (they are referenced by `tests/booking-management.spec.js` and `docs/test-strategy.md`); scenarios added on 2026-10-10 continue each range.
- "Logged in" means authenticated as a test account with a valid JWT in `localStorage.eventhub_token`. "User A / User B" are two different accounts.
- **⚠ Discovered behaviour** marks a scenario whose expected result is taken from the code and differs from the domain skill, or looks like a defect. Confirm the intended behaviour with the product owner before automating it as a pass/fail check.

| Range | Category | Original (Booking Mgmt) | Added 2026-10-10 |
|---|---|---|---|
| TC-001–099 | Happy Path | TC-001–007 | TC-008–034 |
| TC-100–199 | Business Rules | TC-100–109 | TC-110–137 |
| TC-200–299 | Security | TC-200–206 | TC-207–234 |
| TC-300–399 | Negative / Error | TC-300–308 | TC-309–348 |
| TC-400–499 | Edge Cases | TC-400–408 | TC-409–441 |
| TC-500–599 | UI State | TC-500–510 | TC-511–551 |

## Domain skill vs. code — discrepancies found

These were found while tracing scenarios to code. Scenarios below follow the **code**.

| Topic | Domain skill says | Code does |
|---|---|---|
| Invalid login | 401 "Invalid credentials" | 400 "Invalid email or password" (`authService.login`) |
| Duplicate registration | 409 "Email already registered" | 400 "Email already registered" (`authService.register`) |
| Password minimum | 6 characters | API: 6 characters. Register UI: 8+ chars with uppercase, number and special character |
| Seat availability | Static events use a fixed DB value; dynamic = `totalSeats − bookings` | Every event returns `availableSeats − caller's booked quantity` (`withPersonalSeats`) |
| Events per page | 9 (rules) / 12 (flows) | Events page 12, home 6, admin table 10, API default 10 |
| Bookings per page | 9 | Bookings page 10, admin bookings 15, API default 10 |
| Bookings-page sandbox banner | Conditional banner | No banner on `/bookings`; only `/events` (when more than 5 cards are shown) and a permanent note on `/admin/events` |
| Cross-user booking cancel | 403 | 404 (`cancelBooking` looks the booking up scoped to the caller) |
| Cities | Bangalore/Mumbai/Hyderabad/Delhi/Chennai | Filter also lists Pune; the event form accepts any free-text city |
| `PUT /api/events/:id` | `UpdateEventInput` (partial) | Uses the create validator, so every required field must be sent |

---

## Happy Path

### TC-001: View bookings list with existing bookings
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings`
2. Observe the list of booking cards rendered
**Expected Results**: Each booking card displays booking reference, event name, quantity, total price, and "View Details" link
**Business Rule**: Flow 4 — Manage Bookings
**Suggested Layer**: E2E

---

### TC-002: View single booking detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings`
2. Click "View Details" on any booking card
3. Observe the booking detail page at `/bookings/:id`
**Expected Results**: Page shows event details (title, date, venue, city, category), customer details (name, email, phone), payment summary (quantity, price per ticket, total paid), booking reference in breadcrumb and header, booking ID, and "Check eligibility for refund?" link
**Business Rule**: Booking model fields; Flow 4
**Suggested Layer**: E2E

---

### TC-003: Cancel a single booking from the detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one confirmed booking
**Steps**:
1. Navigate to `/bookings/:id`
2. Click "Cancel Booking" button
3. Confirm in the dialog by clicking "Yes, cancel it"
4. Observe redirect and bookings list
**Expected Results**: Success toast "Booking cancelled successfully" appears; user is redirected to `/bookings`; cancelled booking no longer appears in the list
**Business Rule**: Booking cancellation deletes the record; seats released for dynamic events
**Suggested Layer**: E2E

---

### TC-004: Clear all bookings from the bookings list page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: User is logged in; user has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" link
3. Confirm the browser confirm dialog
4. Observe the page after clearing
**Expected Results**: All bookings are removed; page shows empty state "No bookings yet" with "Browse Events" button
**Business Rule**: `DELETE /api/bookings` clears all user bookings; `clearAllBookings` service method
**Suggested Layer**: E2E

---

### TC-005: Navigate back to bookings list from detail page
**Category**: Happy Path
**Priority**: P2
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "← Back to My Bookings" button at bottom of detail page
**Expected Results**: User is navigated to `/bookings`
**Business Rule**: UI navigation flow
**Suggested Layer**: E2E

---

### TC-006: Navigate to bookings via "View My Bookings" after completing a booking
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User just completed a booking (confirmation card shown)
**Steps**:
1. After booking confirmation, click "View My Bookings" link
2. Observe the bookings page
**Expected Results**: User lands on `/bookings` and the newly created booking appears in the list
**Business Rule**: Flow 3 → Flow 4 navigation
**Suggested Layer**: E2E

---

### TC-007: Lookup booking by reference via API
**Category**: Happy Path
**Priority**: P1
**Preconditions**: User is authenticated; user has a booking with known `bookingRef`
**Steps**:
1. Send `GET /api/bookings/ref/:ref` with valid JWT and own booking ref
**Expected Results**: 200 response with full booking data including nested event
**Business Rule**: `GET /api/bookings/ref/:ref` endpoint
**Suggested Layer**: API

---

### TC-008: Register a new account from the UI
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Not logged in; a unique email not yet registered
**Steps**:
1. Navigate to `/register`
2. Enter the unique email, a password meeting all four rules (e.g. `Sandbox1!`), and the same value in Confirm Password
3. Click the register button (`register-btn`)
**Expected Results**: Account is created; JWT stored in `localStorage.eventhub_token`; user lands on `/` with navbar showing the registered email and a Logout button
**Business Rule**: Flow 1 — Registration; `useAuth.register` stores the token and routes home
**Suggested Layer**: E2E

---

### TC-009: Log in with valid credentials from the UI
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Registered account; not logged in
**Steps**:
1. Navigate to `/login`
2. Fill email (placeholder `you@email.com`) and password
3. Click `#login-btn`
**Expected Results**: User is redirected to `/`; home hero with "Browse Events →" is visible; navbar shows the user's email
**Business Rule**: Flow 1 — Login; JWT issued and stored
**Suggested Layer**: E2E

---

### TC-010: Log out
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in
**Steps**:
1. Click `logout-btn` in the navbar
**Expected Results**: `eventhub_token` is removed from `localStorage`; user is redirected to `/login`; navbar and footer are no longer shown
**Business Rule**: `useAuth.logout`; `AppShell` hides chrome on auth routes
**Suggested Layer**: E2E

---

### TC-011: Session persists across a page reload
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in
**Steps**:
1. Navigate to `/bookings`
2. Reload the page
**Expected Results**: After a brief spinner the same page renders, still authenticated; `GET /api/auth/me` returned 200 for the stored token
**Business Rule**: `AuthProvider` validates the stored token on mount via `/auth/me`
**Suggested Layer**: E2E

---

### TC-012: Home page shows hero and featured events
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in; seeded events exist
**Steps**:
1. Navigate to `/`
2. Observe the hero, the "Featured Events" grid, and the CTA banner
3. Click "Browse Events →", go back, click "My Bookings", go back, click "View all →", go back, click "Explore All Events"
**Expected Results**: Hero heading "Discover & Book Amazing Events"; up to 6 event cards in the featured grid; the four links navigate to `/events`, `/bookings`, `/events`, `/events` respectively
**Business Rule**: Home page uses `useEvents({ limit: 6 })`
**Suggested Layer**: E2E

---

### TC-013: Browse the events list
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; seeded events exist
**Steps**:
1. Navigate to `/events`
2. Inspect the first `event-card`
**Expected Results**: Heading "Upcoming Events"; up to 12 cards; each card shows category badge, title, date, "venue, city", price, a seats indicator, and a "Book Now" link (`book-now-btn`)
**Business Rule**: Flow 2 — Browse & Filter Events
**Suggested Layer**: E2E

---

### TC-014: Search events by keyword
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; an event whose title contains a known word (e.g. "Marathon")
**Steps**:
1. Navigate to `/events`
2. Type the word in the "Search events, venues…" box
3. Wait for the list to update
**Expected Results**: URL gains `?search=<word>`; only events whose title, description or venue contain the word are shown
**Business Rule**: Flow 2 — search covers title, description, venue (`eventRepository.findAll`)
**Suggested Layer**: E2E

---

### TC-015: Filter events by category
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in
**Steps**:
1. On `/events`, choose "Concert" in the category dropdown
**Expected Results**: URL gains `?category=Concert`; every visible card has the "Concert" badge
**Business Rule**: Flow 2 — category filter
**Suggested Layer**: E2E

---

### TC-016: Filter events by city
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in
**Steps**:
1. On `/events`, choose "Mumbai" in the city dropdown
**Expected Results**: URL gains `?city=Mumbai`; every visible card shows "…, Mumbai"
**Business Rule**: Flow 2 — city filter
**Suggested Layer**: E2E

---

### TC-017: Combine search, category and city, then clear filters
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in
**Steps**:
1. On `/events`, set a search term, a category and a city that together match at least one event
2. Verify results
3. Click "Clear filters"
**Expected Results**: Results satisfy all three conditions (AND); after clearing, all three controls are reset, the URL is `/events` with no query string, and the full list returns
**Business Rule**: `eventRepository.findAll` combines filters with AND; `EventFilters.clearAll`
**Suggested Layer**: E2E

---

### TC-018: Paginate the events list
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in; more than 12 events visible to the user (10 static + at least 3 own)
**Steps**:
1. Navigate to `/events`
2. Click "Next →" (or page "2")
**Expected Results**: URL becomes `/events?page=2`; the remaining events are shown; page 2 is marked `aria-current="page"`
**Business Rule**: Flow 2 — pagination, 12 per page
**Suggested Layer**: E2E

---

### TC-019: Open an event detail page
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in
**Steps**:
1. On `/events`, click "Book Now" on a card (or the card title)
**Expected Results**: URL is `/events/:id`; breadcrumb "Events / {title}"; page shows title, category badge, Date, Time, Venue, City, "Available: N / total seats", "Price per ticket", description (if any) and the "Book Tickets" panel
**Business Rule**: Flow 3 step 2
**Suggested Layer**: E2E

---

### TC-020: Book one ticket for an event (full flow)
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; event has available seats
**Steps**:
1. Open `/events/:id`
2. Leave quantity at 1; fill Full Name, Email (`#customer-email`), Phone Number (10 digits)
3. Click "Confirm Booking" (`.confirm-booking-btn`)
**Expected Results**: Form is replaced by "Booking Confirmed! 🎉" card showing Booking Ref (`.booking-ref`), Customer, Tickets = 1, Total = event price; buttons "View My Bookings" and "Browse More Events"
**Business Rule**: Flow 3 — Book an Event; Rule 1
**Suggested Layer**: E2E

---

### TC-021: Book multiple tickets using the quantity stepper
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; event has at least 3 available seats
**Steps**:
1. Open `/events/:id`
2. Click "+" twice (`#ticket-count` shows 3)
3. Observe the price summary, fill the form, confirm
**Expected Results**: Summary reads "{price} × 3 tickets" and Total = price × 3 before submit; confirmation card shows Tickets = 3 and the same total
**Business Rule**: Rule 9 — `totalPrice = price × quantity`
**Suggested Layer**: E2E

---

### TC-022: "Browse More Events" after a booking
**Category**: Happy Path
**Priority**: P2
**Preconditions**: Booking confirmation card is shown
**Steps**:
1. Click "Browse More Events"
**Expected Results**: User lands on `/events`
**Business Rule**: Flow 3 step 7
**Suggested Layer**: E2E

---

### TC-023: Create an event from the admin UI
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; user has fewer than 6 own events
**Steps**:
1. Navigate to `/admin/events`
2. Fill Title (`event-title-input`), Description, Category, City, Venue, a future Event Date & Time, Price, Total Seats
3. Click "+ Add Event" (`add-event-btn`)
4. Navigate to `/events` and search for the title
**Expected Results**: Toast "Event created!"; form resets to empty; the "N total" counter increases by 1; the event is listed in the admin table (after the static rows) and on `/events` without a "Featured" badge, showing `totalSeats` seats available
**Business Rule**: Flow 5 — Admin: Manage Events
**Suggested Layer**: E2E

---

### TC-024: Edit an own event from the admin UI
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; user owns at least one event
**Steps**:
1. On `/admin/events`, find the own event's row and click "Edit" (`edit-event-btn`)
2. Change the title and price
3. Click "💾 Update Event"
**Expected Results**: Form is pre-filled with the event's values and the heading reads "✏️ Edit Event"; after submit, toast "Event updated!", form returns to "+ New Event" mode, and the row shows the new title and price
**Business Rule**: Flow 5 step 5; `eventService.updateEvent`
**Suggested Layer**: E2E

---

### TC-025: Delete an own event from the admin UI
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Logged in; user owns at least one event
**Steps**:
1. On `/admin/events`, click "Delete" (`delete-event-btn`) on the own event's row
2. In the "Delete this event?" dialog click "Delete event" (`confirm-dialog-yes`)
**Expected Results**: Row disappears immediately; toast "Event deleted"; the event no longer appears on `/events`; `GET /api/events/:id` returns 404
**Business Rule**: Flow 5 step 6; `eventService.deleteEvent`
**Suggested Layer**: E2E

---

### TC-026: View bookings in the admin "Manage Bookings" page
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in; user has at least one booking
**Steps**:
1. Navigate to `/admin/bookings`
2. Click "View" on a row
**Expected Results**: Heading "Manage Bookings" with "N total bookings"; table columns Ref, Customer, Event, Qty, Total, Status, Date, Actions; the modal "Booking — {ref}" shows reference, status, event title/date/city, customer name/email/phone, tickets, total and booked-on date
**Business Rule**: Admin bookings page uses `useBookings({ limit: 15 })` — the caller's own bookings only
**Suggested Layer**: E2E

---

### TC-027: Cancel a booking from the admin "Manage Bookings" page
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in; user has at least one booking
**Steps**:
1. On `/admin/bookings`, click "Cancel" on a row
2. Click "Yes, cancel it"
**Expected Results**: Toast "Booking cancelled"; dialog closes; row is removed and the total count drops by 1
**Business Rule**: `DELETE /api/bookings/:id`; `useCancelBooking` invalidates bookings and events
**Suggested Layer**: E2E

---

### TC-028: Cancel a booking from its card on the bookings list
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in; user has at least one booking
**Steps**:
1. On `/bookings`, click "Cancel Booking" (`cancel-booking-btn`) on a card
2. Click "Yes, cancel it"
**Expected Results**: Toast "Booking cancelled successfully"; user stays on `/bookings`; the card is removed
**Business Rule**: `BookingCard.handleCancel`
**Suggested Layer**: E2E

---

### TC-029: Auth API — register, log in, and fetch the current user
**Category**: Happy Path
**Priority**: P0
**Preconditions**: A unique email
**Steps**:
1. `POST /api/auth/register` with `{ email, password }` (password ≥ 6 chars)
2. `POST /api/auth/login` with the same credentials
3. `GET /api/auth/me` with `Authorization: Bearer <token>`
**Expected Results**: Register → 201 `{ success: true, token, user: { id, email } }`; login → 200 with the same shape; me → 200 `{ success: true, user: { userId, email, iat, exp } }` where `userId` equals the registered `id`
**Business Rule**: `authController`; API reference — Authentication
**Suggested Layer**: API

---

### TC-030: Events API — create, read, update, delete lifecycle
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Valid JWT; fewer than 6 own events
**Steps**:
1. `POST /api/events` with a full valid payload
2. `GET /api/events/:id`
3. `PUT /api/events/:id` with the full payload and a changed title
4. `DELETE /api/events/:id`
5. `GET /api/events/:id`
**Expected Results**: 201 with `data` and message "Event created successfully"; 200 with the event; 200 with the new title and message "Event updated successfully"; 200 with message "Event deleted successfully"; final GET → 404
**Business Rule**: `eventController`; API reference — Events
**Suggested Layer**: API

---

### TC-031: Bookings API — create a booking
**Category**: Happy Path
**Priority**: P0
**Preconditions**: Valid JWT; a visible event with seats
**Steps**:
1. `POST /api/bookings` with `{ eventId, customerName, customerEmail, customerPhone, quantity: 2 }`
**Expected Results**: 201 `{ success: true, data, message: "Booking confirmed!" }`; `data` has `status: "confirmed"`, `quantity: 2`, `totalPrice = price × 2`, a `bookingRef` matching `^[A-Z0-9]-[A-Z0-9]{6}$`, and a nested `event`
**Business Rule**: `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-032: Events API — list with filters and pagination envelope
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Valid JWT; seeded events exist
**Steps**:
1. `GET /api/events`
2. `GET /api/events?category=Sports&city=Chennai&page=1&limit=5`
**Expected Results**: Both return 200 `{ success: true, data: [...], pagination: { total, page, limit, totalPages } }`; first call uses `limit: 10`; second returns only Sports events in Chennai with `limit: 5` and `totalPages = ceil(total / 5)`
**Business Rule**: `eventService.getEvents`; response envelope
**Suggested Layer**: API

---

### TC-033: Navigate the application through the navbar
**Category**: Happy Path
**Priority**: P1
**Preconditions**: Logged in; desktop viewport
**Steps**:
1. Click `nav-events`, then `nav-bookings`, then `nav-home`
2. Open the Admin dropdown and click "Manage Events", then "Manage Bookings"
3. Inspect the "API Docs" link
**Expected Results**: Each link routes to `/events`, `/bookings`, `/`, `/admin/events`, `/admin/bookings`; the current section is highlighted; the API Docs link points to `{API base}/docs`
**Business Rule**: `Navbar` routes
**Suggested Layer**: E2E

---

### TC-034: Public endpoints respond without authentication
**Category**: Happy Path
**Priority**: P2
**Preconditions**: None
**Steps**:
1. `GET /api/health`
2. `GET /api/config`
3. `GET /api/docs/`
**Expected Results**: Health → 200 `{ status: "ok", timestamp, dbStatus: "connected" }`; config → 200 `{ showExploreLinks: <boolean> }`; docs → 200 Swagger UI HTML titled "EventHub API Docs"
**Business Rule**: Public routes in `app.js`
**Suggested Layer**: API

---

## Business Rules

### TC-100: FIFO pruning — 10th booking replaces oldest booking from a different event
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has exactly 9 bookings (all for different events); user has JWT token
**Steps**:
1. Note the oldest booking ID
2. Create a new booking (10th) for a different event via `POST /api/bookings`
3. Retrieve all user bookings
**Expected Results**: Total booking count remains 9; the oldest booking is deleted; the new booking is present
**Business Rule**: Max 9 bookings per user; FIFO pruning prefers deleting from a different event
**Suggested Layer**: API

---

### TC-101: FIFO pruning — same-event fallback permanently burns a seat
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has exactly 9 bookings all for the SAME event; enough seats remain
**Steps**:
1. Create a 10th booking for the same event
2. Retrieve the event's available seats
**Expected Results**: Oldest booking is deleted; new booking is created; `availableSeats` decremented by the new booking's quantity (seat permanently burned via `decrementSeats`)
**Business Rule**: `sameEventFallback` path in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-102: Booking reference first character matches event title first character
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User is logged in; event with known title exists (e.g., "Tech Conference Bangalore")
**Steps**:
1. Book the event
2. Read the `bookingRef` from the confirmation card or API response
**Expected Results**: `bookingRef` starts with the uppercase first character of the event title (e.g., "T-XXXXXX" for "Tech Conference")
**Business Rule**: `randomRef` function: prefix = `eventTitle[0].toUpperCase()`; Rule 7
**Suggested Layer**: E2E / API

---

### TC-103: Refund eligibility — single ticket booking is eligible
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity = 1
**Steps**:
1. Navigate to `/bookings/:id` for the single-ticket booking
2. Click "Check eligibility for refund?"
3. Wait for spinner to disappear (4 seconds)
4. Read the refund result
**Expected Results**: `#refund-result` shows green "Eligible for refund. Single-ticket bookings qualify for a full refund."
**Business Rule**: Rule 8 — quantity === 1 → eligible
**Suggested Layer**: E2E

---

### TC-104: Refund eligibility — multi-ticket booking is NOT eligible
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User has a booking with quantity > 1 (e.g., 3 tickets)
**Steps**:
1. Navigate to `/bookings/:id` for the multi-ticket booking
2. Click "Check eligibility for refund?"
3. Wait for spinner to disappear (4 seconds)
4. Read the refund result
**Expected Results**: `#refund-result` shows red "Not eligible for refund. Group bookings (3 tickets) are non-refundable." with correct quantity displayed
**Business Rule**: Rule 8 — quantity > 1 → not eligible
**Suggested Layer**: E2E

---

### TC-105: Refund eligibility spinner shows for approximately 4 seconds
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Check eligibility for refund?"
2. Immediately check for spinner
3. Observe when spinner disappears and result appears
**Expected Results**: `#refund-spinner` is visible immediately after clicking; spinner disappears and `#refund-result` appears after ~4 seconds
**Business Rule**: Rule 8 — `setTimeout(..., 4000)` in `RefundEligibility` component
**Suggested Layer**: E2E / Component

---

### TC-106: Total price is calculated as price × quantity
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User books an event with known price
**Steps**:
1. Book an event (e.g., price $1499, quantity 3)
2. View the booking detail page
**Expected Results**: "Total Paid" shows $4,497 (1499 × 3); `totalPrice` in API response equals `event.price × quantity`
**Business Rule**: Rule 9 — `totalPrice = event.price × quantity`
**Suggested Layer**: E2E / API

---

### TC-107: Bookings page shows max 10 bookings per page (pagination)
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has more than 10 bookings visible in DB (unlikely with limit 9, but relevant for API pagination param)
**Steps**:
1. Send `GET /api/bookings?page=1&limit=10`
**Expected Results**: Response includes `pagination.limit = 10`, `pagination.totalPages`, and `data` array with at most 10 items
**Business Rule**: Rule 4 — max 9 bookings per user; API default limit = 10
**Suggested Layer**: API

---

### TC-108: Cancelling a booking releases seat count for dynamic events (computed)
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has a dynamic (user-created) event with a booking
**Steps**:
1. Note the current available seats for the event (computed: totalSeats - booked quantities)
2. Cancel the booking for that event
3. Re-fetch the event detail
**Expected Results**: Available seats increase by the cancelled booking's quantity
**Business Rule**: Rule 6 — seats are computed as `availableSeats − sum(user's booking quantities)` (`withPersonalSeats`); cancellation removes the booking record
**Suggested Layer**: API / E2E

---

### TC-109: Bookings list shows "Clear all bookings" link in the page header
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User has at least one booking
**Steps**:
1. Navigate to `/bookings`
2. Look for "Clear all bookings" link
**Expected Results**: "Clear all bookings" link is visible in the top-right of the page header, with the hint "Do this often for clean test data." (The link is rendered unconditionally — see TC-545 for the zero-bookings case.)
**Business Rule**: Flow 4 — clear option is always available on `/bookings`
**Suggested Layer**: E2E / Component

---

### TC-110: Available seats drop for the booking user immediately after booking
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Logged in; event shows N available seats (N ≥ 2)
**Steps**:
1. Note N on `/events/:id`
2. Book 2 tickets
3. Return to `/events/:id` and to the event's card on `/events`
**Expected Results**: Both views show N − 2 seats; `GET /api/events/:id` returns `availableSeats: N − 2`
**Business Rule**: Rule 1 & Rule 6 — seat count reduces immediately; `withPersonalSeats`; booking mutations invalidate the `['events']` query
**Suggested Layer**: E2E / API

---

### TC-111: Seat counts are per user — another user's bookings do not affect mine
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User A and User B; a static event
**Steps**:
1. As User B, read `availableSeats` for the static event
2. As User A, book 5 tickets for the same event
3. As User B, read `availableSeats` again
**Expected Results**: User B's value is unchanged; User A's value is 5 lower
**Business Rule**: Per-user seat counts — booking does not decrement `Event.availableSeats`; the returned value is `availableSeats − caller's booked quantity`
**Suggested Layer**: API

---

### TC-112: Cancelling a booking restores the seats for a static event
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Logged in; a booking of quantity Q exists for a static event showing N seats
**Steps**:
1. Cancel the booking
2. Re-read the event
**Expected Results**: Event shows N + Q seats (⚠ differs from the skill, which says static seats are fixed)
**Business Rule**: `cancelBooking` hard-deletes the row; `withPersonalSeats` applies to all events
**Suggested Layer**: API / E2E

---

### TC-113: "Clear all bookings" restores seats on every booked event
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Logged in; bookings exist for two different events
**Steps**:
1. `DELETE /api/bookings`
2. `GET /api/events/:id` for both events
**Expected Results**: Both events return their full unbooked `availableSeats`
**Business Rule**: Rule 4 — clearing removes all booking rows; seats are computed from remaining rows
**Suggested Layer**: API

---

### TC-114: Maximum 6 user-created events — the 7th replaces the oldest
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Valid JWT; user owns exactly 6 events; note the oldest event's id
**Steps**:
1. `POST /api/events` with a valid payload
2. List the user's own events; `GET /api/events/:oldestId`
**Expected Results**: Create → 201; the user still owns exactly 6 events; the oldest is gone (404); the new one is present
**Business Rule**: Rule 3 — max 6 events, FIFO (`MAX_USER_DYNAMIC_EVENTS`)
**Suggested Layer**: API

---

### TC-115: FIFO event pruning also deletes the pruned event's bookings
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User owns 6 events and has a booking on the oldest one
**Steps**:
1. Create a 7th event
2. `GET /api/bookings`; `GET /api/bookings/:id` for the booking on the pruned event
**Expected Results**: The booking is no longer listed and returns 404
**Business Rule**: Booking → Event relation cascades on delete
**Suggested Layer**: API

---

### TC-116: Static events do not count toward the 6-event limit
**Category**: Business Rule
**Priority**: P1
**Preconditions**: New user with 0 own events (10 static events visible)
**Steps**:
1. Create 6 events in a row
2. List events
**Expected Results**: All 6 creations succeed with nothing pruned; `pagination.total` is 16 (10 static + 6 own)
**Business Rule**: Rule 3 — `countUserDynamic` counts only `isStatic: false` events owned by the caller
**Suggested Layer**: API

---

### TC-117: Static events cannot be updated
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Valid JWT; id of a static event
**Steps**:
1. `PUT /api/events/:staticId` with a full valid payload
2. `GET /api/events/:staticId`
**Expected Results**: 403 `{ success: false, error: "Cannot modify a static event" }`; event is unchanged
**Business Rule**: Rule 3 — static events are immutable
**Suggested Layer**: API

---

### TC-118: Static events cannot be deleted
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Valid JWT; id of a static event
**Steps**:
1. `DELETE /api/events/:staticId`
2. `GET /api/events/:staticId`
**Expected Results**: 403 "Cannot delete a static event"; event still returns 200
**Business Rule**: Rule 3 — static events are immutable
**Suggested Layer**: API

---

### TC-119: A newly created event starts with all seats available and belongs to the caller
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with `totalSeats: 50`
**Expected Results**: `data.availableSeats = 50`, `data.totalSeats = 50`, `data.isStatic = false`, `data.userId` = caller's id; omitted description is stored as `""` and omitted imageUrl as `null`
**Business Rule**: `eventService.createEvent` payload construction
**Suggested Layer**: API

---

### TC-120: Events list contains only static events plus the caller's own events
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User A owns event EA; User B owns event EB
**Steps**:
1. As User A, `GET /api/events?limit=100`
**Expected Results**: Every item has `isStatic: true` or `userId` = User A; EA is present; EB is absent
**Business Rule**: Rule 2 — sandbox isolation (`ownershipClause` in `eventRepository.findAll`)
**Suggested Layer**: API

---

### TC-121: Events are ordered static first, then own events newest first
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User owns two events created at different times
**Steps**:
1. `GET /api/events?limit=100`
**Expected Results**: All static events come first; own events follow in descending `createdAt` order
**Business Rule**: `orderBy: [{ isStatic: 'desc' }, { createdAt: 'desc' }]`
**Suggested Layer**: API

---

### TC-122: Search matches title, description and venue — not city or category
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Own event with a unique word in each of title, description, venue, and a unique city
**Steps**:
1. `GET /api/events?search=<title word>`, then `<description word>`, then `<venue word>`
2. `GET /api/events?search=<unique city>`
**Expected Results**: The first three searches each return the event; the city search does not return it (unless the city text also occurs in title/description/venue)
**Business Rule**: Flow 2 — search bar searches title, description, venue
**Suggested Layer**: API

---

### TC-123: Booking quantity is limited to 1–10 and to the seats available to the user
**Category**: Business Rule
**Priority**: P0
**Preconditions**: Logged in; one event with ≥ 10 seats and one own event with 3 seats
**Steps**:
1. Open the ≥ 10-seat event and click "+" until it disables
2. Open the 3-seat event and click "+" until it disables
**Expected Results**: First stops at 10 with "(max 10)"; second stops at 3 with "(max 3)"
**Business Rule**: Booking model — quantity 1–10; `maxQty = min(10, availableSeats)`
**Suggested Layer**: E2E / Component

---

### TC-124: Booking status is always "confirmed" and cancellation removes the record
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Logged in; one booking
**Steps**:
1. Read the booking's status in the list, detail page and API
2. Cancel it
3. `GET /api/bookings?status=cancelled`
**Expected Results**: Status is "confirmed" everywhere; after cancel the booking is gone entirely and the `cancelled` filter returns an empty list
**Business Rule**: Booking model — status always "confirmed"; cancel = hard delete
**Suggested Layer**: API

---

### TC-125: JWT carries the user identity and expires after 7 days
**Category**: Business Rule
**Priority**: P1
**Preconditions**: None
**Steps**:
1. Log in via API and decode the token payload
**Expected Results**: Payload contains `userId`, `email`, `iat`, `exp`; `exp − iat` = 604800 seconds
**Business Rule**: Auth — JWT 7-day expiry (`signToken`)
**Suggested Layer**: API / Unit

---

### TC-126: Register UI enforces the strong-password policy
**Category**: Business Rule
**Priority**: P1
**Preconditions**: On `/register`
**Steps**:
1. Enter a valid email and password `Sandbox1!` in both password fields; submit
**Expected Results**: All four checklist items (8+ characters, uppercase, number, special character) are green and registration succeeds
**Business Rule**: `PASSWORD_RULES` in the register page (stricter than the API's 6-character minimum)
**Suggested Layer**: E2E / Component

---

### TC-127: Events-page sandbox banner appears only when more than 5 events are displayed
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Logged in; seeded events exist
**Steps**:
1. Open `/events` with no filters
2. Apply a filter that leaves 5 or fewer cards
**Expected Results**: Unfiltered: amber banner "Your sandbox holds up to 9 bookings and you can create up to 6 custom events. When either limit is reached, the oldest entry is automatically replaced." Filtered to ≤ 5: banner is hidden
**Business Rule**: Rule 5 — sandbox warning banners (`events.length > 5`)
**Suggested Layer**: E2E / Component

---

### TC-128: Admin events page always shows the 6-event limit notice
**Category**: Business Rule
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. Open `/admin/events`
**Expected Results**: Notice above the form: "You can add up to 6 events. Once the limit is reached, your oldest event is automatically replaced when you add a new one."
**Business Rule**: Rule 3 / Rule 5
**Suggested Layer**: E2E / Component

---

### TC-129: Deleting an event deletes its bookings
**Category**: Business Rule
**Priority**: P0
**Preconditions**: User owns an event with at least one booking
**Steps**:
1. `DELETE /api/events/:id`
2. `GET /api/bookings`
**Expected Results**: Bookings for that event are no longer returned; total booking count drops accordingly
**Business Rule**: Booking.eventId FK — cascade delete with Event
**Suggested Layer**: API

---

### TC-130: Bookings are listed newest first
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User has three bookings created in a known order
**Steps**:
1. `GET /api/bookings`; open `/bookings`
**Expected Results**: Most recently created booking is first in both
**Business Rule**: `bookingRepository.findAll` orders by `createdAt desc`
**Suggested Layer**: API

---

### TC-131: Bookings API filters by event
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User has bookings for events X and Y
**Steps**:
1. `GET /api/bookings?eventId=<X>`
**Expected Results**: Only bookings with `eventId = X`; `pagination.total` equals their count
**Business Rule**: `bookingRepository.findAll` `eventId` filter
**Suggested Layer**: API

---

### TC-132: Same user can book the same event several times
**Category**: Business Rule
**Priority**: P1
**Preconditions**: Logged in; event with ≥ 4 seats
**Steps**:
1. Book the event twice, 2 tickets each
**Expected Results**: Two separate bookings with different refs sharing the same prefix; event shows 4 fewer seats
**Business Rule**: Rule 6 — the same user may book the same event multiple times
**Suggested Layer**: API / E2E

---

### TC-133: Customer email on a booking is normalised by the server
**Category**: Business Rule
**Priority**: P2
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/bookings` with `customerEmail: "Test.User@Example.COM"` and `customerName: "  Test User  "`
**Expected Results**: 201; stored `customerEmail` is lower-cased (`test.user@example.com`) and `customerName` is trimmed (`Test User`)
**Business Rule**: `bookingValidator` — `.trim()` and `.normalizeEmail()`
**Suggested Layer**: API

---

### TC-134: Passwords are stored hashed
**Category**: Business Rule
**Priority**: P1
**Preconditions**: DB access (test environment) or unit-level access to `authService`
**Steps**:
1. Register a user with a known password
2. Inspect the stored `User.password`
**Expected Results**: Value is a bcrypt hash (`$2…`, cost 10), never the plaintext; `bcrypt.compare` with the plaintext is true
**Business Rule**: User model — bcrypt hashed password
**Suggested Layer**: Unit

---

### TC-135: ⚠ Editing `totalSeats` does not change `availableSeats`
**Category**: Business Rule
**Priority**: P2
**Preconditions**: User owns an event with `totalSeats: 50` and no bookings
**Steps**:
1. `PUT /api/events/:id` with the full payload and `totalSeats: 80`
2. `GET /api/events/:id`
**Expected Results**: ⚠ Discovered behaviour: `totalSeats` is 80 but `availableSeats` is still 50, so the UI reads "50 / 80 seats". Confirm whether available seats should follow the new capacity.
**Business Rule**: `eventService.updateEvent` copies `totalSeats` only
**Suggested Layer**: API

---

### TC-136: ⚠ A rejected booking at the 9-booking limit still removes the oldest booking
**Category**: Business Rule
**Priority**: P1
**Preconditions**: User has exactly 9 bookings; an own event with 1 seat left
**Steps**:
1. `POST /api/bookings` for that event with `quantity: 5`
2. `GET /api/bookings`
**Expected Results**: Request returns 400 (insufficient seats). ⚠ Discovered behaviour: the oldest booking has already been deleted, leaving 8 — pruning runs before the event lookup and seat check and is not transactional. Expected by the business rule: a failed booking leaves existing bookings untouched.
**Business Rule**: Rule 4 — FIFO pruning; ordering in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-137: Refund eligibility is decided on the client with no API call
**Category**: Business Rule
**Priority**: P2
**Preconditions**: Logged in; on a booking detail page
**Steps**:
1. Start capturing network requests
2. Click "Check eligibility for refund?" and wait for the result
**Expected Results**: No request is sent between the click and the result
**Business Rule**: Rule 8 — frontend-only logic
**Suggested Layer**: E2E / Component

---

## Security

### TC-200: Cross-user booking access returns "Access Denied" (UI)
**Category**: Security
**Priority**: P0
**Preconditions**: Two test accounts exist (rahulshetty1@gmail.com and rahulshetty1@yahoo.com); User A has a booking
**Steps**:
1. Log in as User A, create a booking, note the booking ID
2. Log out (clear localStorage JWT)
3. Log in as User B
4. Navigate to `/bookings/:userA_booking_id`
**Expected Results**: Page shows "Access Denied" title and "You are not authorized to view this booking." description
**Business Rule**: Rule 2 — cross-user access returns 403; frontend renders "Access Denied" on 403 response
**Suggested Layer**: E2E

---

### TC-201: Cross-user booking access returns 403 via API
**Category**: Security
**Priority**: P0
**Preconditions**: User A has a booking; User B has a valid JWT
**Steps**:
1. Send `GET /api/bookings/:userA_booking_id` with User B's JWT
**Expected Results**: HTTP 403; response body contains "You are not authorized to view this booking"
**Business Rule**: `bookingService.getBookingById` — `booking.userId !== userId` → ForbiddenError
**Suggested Layer**: API

---

### TC-202: Cross-user booking cancellation is rejected via API
**Category**: Security
**Priority**: P0
**Preconditions**: User A has a booking; User B has a valid JWT
**Steps**:
1. Send `DELETE /api/bookings/:userA_booking_id` with User B's JWT
2. As User A, send `GET /api/bookings/:id`
**Expected Results**: Request is rejected and the booking is NOT deleted (User A still gets 200). ⚠ Discovered behaviour: the status is **404** "Booking with id X not found", not 403 — `cancelBooking` uses `bookingRepository.findById(id, userId)`, which is scoped to the caller, so the 403 branch is unreachable.
**Business Rule**: `bookingService.cancelBooking` ownership enforcement; Rule 2 (sandbox isolation)
**Suggested Layer**: API

---

### TC-203: Unauthenticated access to bookings list returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/bookings` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized" error message
**Business Rule**: Auth middleware on all `/api/bookings` routes
**Suggested Layer**: API

---

### TC-204: Unauthenticated access to booking detail returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `GET /api/bookings/:id` without Authorization header
**Expected Results**: HTTP 401; "Unauthorized" error message
**Business Rule**: Auth middleware
**Suggested Layer**: API

---

### TC-205: Unauthenticated DELETE /api/bookings returns 401
**Category**: Security
**Priority**: P0
**Preconditions**: No valid JWT
**Steps**:
1. Send `DELETE /api/bookings` without Authorization header
**Expected Results**: HTTP 401
**Business Rule**: Auth middleware; `clearAllBookings` requires authenticated user
**Suggested Layer**: API

---

### TC-206: Cross-user booking lookup by ref returns 403
**Category**: Security
**Priority**: P1
**Preconditions**: User A has a booking with known ref; User B has a valid JWT
**Steps**:
1. Send `GET /api/bookings/ref/:userA_ref` with User B's JWT
**Expected Results**: HTTP 403; "You do not own this booking"
**Business Rule**: `bookingService.getBookingByRef` — ownership check
**Suggested Layer**: API

---

### TC-207: Unauthenticated visitors are redirected to the login page
**Category**: Security
**Priority**: P0
**Preconditions**: No token in `localStorage`
**Steps**:
1. Navigate directly to each of `/`, `/events`, `/events/1`, `/bookings`, `/bookings/1`, `/admin/events`, `/admin/bookings`
**Expected Results**: Each ends at `/login`; no protected content is rendered before the redirect; `/login` and `/register` load without redirect
**Business Rule**: `AuthGuard` — only `/login` and `/register` are public
**Suggested Layer**: E2E

---

### TC-208: Events API rejects requests without a token
**Category**: Security
**Priority**: P0
**Preconditions**: No Authorization header
**Steps**:
1. Send `GET /api/events`, `GET /api/events/1`, `POST /api/events`, `PUT /api/events/1`, `DELETE /api/events/1`
**Expected Results**: Each returns 401 `{ success: false, error: "Unauthorized" }`; nothing is created, changed or deleted
**Business Rule**: `authMiddleware` applied to all `/api/events` routes
**Suggested Layer**: API

---

### TC-209: Booking write and lookup endpoints reject requests without a token
**Category**: Security
**Priority**: P0
**Preconditions**: No Authorization header
**Steps**:
1. Send `POST /api/bookings` (valid body), `DELETE /api/bookings/1`, `GET /api/bookings/ref/T-ABC123`
**Expected Results**: Each returns 401 "Unauthorized"
**Business Rule**: `authMiddleware` applied to all `/api/bookings` routes
**Suggested Layer**: API

---

### TC-210: Invalid, tampered, forged or expired tokens are rejected
**Category**: Security
**Priority**: P0
**Preconditions**: A valid token to derive variants from
**Steps**:
1. Call `GET /api/events` with: (a) `Bearer garbage`, (b) a valid token with one payload character changed, (c) a token signed with a different secret, (d) a token whose `exp` is in the past, (e) a token with `alg: none`
**Expected Results**: All return 401 `{ success: false, error: "Invalid or expired token" }`
**Business Rule**: `jwt.verify` in `authMiddleware`
**Suggested Layer**: API / Unit

---

### TC-211: Authorization header without the `Bearer ` scheme is rejected
**Category**: Security
**Priority**: P1
**Preconditions**: A valid token
**Steps**:
1. Call `GET /api/events` with `Authorization: <token>`, then `Authorization: Token <token>`, then `Authorization: bearer <token>`
**Expected Results**: All return 401 "Unauthorized" (prefix check is case-sensitive)
**Business Rule**: `header?.startsWith('Bearer ')`
**Suggested Layer**: API

---

### TC-212: `/api/auth/me` requires a valid token
**Category**: Security
**Priority**: P1
**Preconditions**: None
**Steps**:
1. `GET /api/auth/me` with no header
2. `GET /api/auth/me` with an invalid token
**Expected Results**: 401 "Unauthorized"; 401 "Invalid or expired token"
**Business Rule**: `authMiddleware` on `/auth/me`
**Suggested Layer**: API

---

### TC-213: A 401 from the API logs the user out of the UI
**Category**: Security
**Priority**: P1
**Preconditions**: Logged in
**Steps**:
1. Replace `localStorage.eventhub_token` with an invalid value (without reloading)
2. Trigger a data request (e.g. navigate from `/` to `/bookings`)
**Expected Results**: Token is removed from `localStorage` and the browser lands on `/login`
**Business Rule**: axios response interceptor — on 401 clear token and redirect
**Suggested Layer**: E2E

---

### TC-214: An invalid stored token is discarded on page load
**Category**: Security
**Priority**: P1
**Preconditions**: `localStorage.eventhub_token` set to an invalid or expired token
**Steps**:
1. Load `/events`
**Expected Results**: Token is removed; user ends at `/login`; no event data is shown
**Business Rule**: `AuthProvider` mount check via `/auth/me`
**Suggested Layer**: E2E

---

### TC-215: Another user's event cannot be read
**Category**: Security
**Priority**: P0
**Preconditions**: User A owns event EA; User B is authenticated
**Steps**:
1. As User B, `GET /api/events/:EA`
2. As User B, open `/events/:EA` in the UI
**Expected Results**: API → 404 "Event with id EA not found" (not 403, so existence is not revealed); UI → "Event not found" with a "Browse Events" button
**Business Rule**: Rule 2 — sandbox isolation enforced in `eventRepository.findById`
**Suggested Layer**: API / E2E

---

### TC-216: Another user's event cannot be updated or deleted
**Category**: Security
**Priority**: P0
**Preconditions**: User A owns event EA; User B is authenticated
**Steps**:
1. As User B, `PUT /api/events/:EA` with a full valid payload
2. As User B, `DELETE /api/events/:EA`
3. As User A, `GET /api/events/:EA`
**Expected Results**: Steps 1 and 2 → 404; User A still sees EA unchanged
**Business Rule**: Rule 2; users can only modify their own events
**Suggested Layer**: API

---

### TC-217: Another user's private event cannot be booked
**Category**: Security
**Priority**: P0
**Preconditions**: User A owns event EA; User B is authenticated
**Steps**:
1. As User B, `POST /api/bookings` with `eventId: EA`
**Expected Results**: 404 "Event with id EA not found"; no booking is created
**Business Rule**: `createBooking` verifies the event is static or owned by the caller
**Suggested Layer**: API

---

### TC-218: Another user's events never appear in lists or search
**Category**: Security
**Priority**: P0
**Preconditions**: User A owns an event with a unique title word; User B is authenticated
**Steps**:
1. As User B, `GET /api/events?search=<unique word>` and `GET /api/events?limit=100`
2. As User B, search the same word on `/events` and review `/admin/events`
**Expected Results**: The event is absent from every result; the UI shows "No events found" for the search
**Business Rule**: Rule 2 — ownership clause is ANDed with search
**Suggested Layer**: API / E2E

---

### TC-219: Bookings list returns only the caller's bookings
**Category**: Security
**Priority**: P0
**Preconditions**: User A and User B each have bookings
**Steps**:
1. As User B, `GET /api/bookings?limit=100`
2. As User B, open `/bookings` and `/admin/bookings`
**Expected Results**: None of User A's booking refs or ids appear; `pagination.total` equals User B's own count
**Business Rule**: `bookingRepository.findAll` filters `where: { userId }`
**Suggested Layer**: API / E2E

---

### TC-220: "Clear all bookings" removes only the caller's bookings
**Category**: Security
**Priority**: P0
**Preconditions**: User A and User B each have bookings
**Steps**:
1. As User B, `DELETE /api/bookings`
2. As User A, `GET /api/bookings`
**Expected Results**: User B's list is empty; User A's bookings are all intact
**Business Rule**: `deleteAllForUser(userId)`
**Suggested Layer**: API

---

### TC-221: Event creation ignores privileged fields in the request body
**Category**: Security
**Priority**: P0
**Preconditions**: Valid JWT for User B; id of User A
**Steps**:
1. `POST /api/events` with a valid payload plus `isStatic: true`, `userId: <User A id>`, `availableSeats: 999999`, `id: 1`
**Expected Results**: 201; the created event has `isStatic: false`, `userId` = User B, `availableSeats = totalSeats`, and a server-assigned id; it is not visible to User A or other users
**Business Rule**: `eventService.createEvent` builds an explicit payload (no mass assignment)
**Suggested Layer**: API

---

### TC-222: Event update ignores privileged fields in the request body
**Category**: Security
**Priority**: P1
**Preconditions**: User owns an event
**Steps**:
1. `PUT /api/events/:id` with a full valid payload plus `isStatic: true`, `userId: 1`, `availableSeats: 999999`
**Expected Results**: 200; `isStatic`, `userId` and `availableSeats` are unchanged
**Business Rule**: `eventService.updateEvent` copies only whitelisted fields
**Suggested Layer**: API

---

### TC-223: Booking creation ignores price, status, owner and reference supplied by the client
**Category**: Security
**Priority**: P0
**Preconditions**: Valid JWT; event with price P
**Steps**:
1. `POST /api/bookings` with a valid body plus `totalPrice: 0`, `status: "refunded"`, `userId: <other user>`, `bookingRef: "HACKED"`
**Expected Results**: 201; `totalPrice = P × quantity`, `status = "confirmed"`, `userId` = caller, `bookingRef` is server-generated
**Business Rule**: `bookingService.createBooking` computes price and reference server-side
**Suggested Layer**: API

---

### TC-224: Login error does not reveal whether an email is registered
**Category**: Security
**Priority**: P1
**Preconditions**: One registered email, one unregistered email
**Steps**:
1. `POST /api/auth/login` with the registered email and a wrong password
2. `POST /api/auth/login` with the unregistered email
**Expected Results**: Both return the same status (400) and the same body `{ success: false, error: "Invalid email or password", details: [] }`
**Business Rule**: `authService.login` uses one message for both failures
**Suggested Layer**: API

---

### TC-225: Password and its hash never appear in API responses
**Category**: Security
**Priority**: P0
**Preconditions**: None
**Steps**:
1. Inspect the full response bodies of register, login and `/auth/me`
**Expected Results**: No `password` field and no bcrypt hash anywhere; `user` contains only `id`/`userId` and `email` (plus `iat`/`exp` on `/me`)
**Business Rule**: `authService` returns `{ id, email }` only
**Suggested Layer**: API

---

### TC-226: SQL injection payloads are treated as plain text
**Category**: Security
**Priority**: P1
**Preconditions**: Valid JWT
**Steps**:
1. `GET /api/events?search=' OR '1'='1` and `?search='; DROP TABLE Event;--`
2. `GET /api/events?category=' OR 1=1--`
3. `POST /api/auth/login` with password `' OR '1'='1`
4. `GET /api/bookings/ref/' OR '1'='1`
**Expected Results**: No server error and no data leak: searches return an empty list (or only literal matches), login fails with 400, ref lookup returns 404; a subsequent `GET /api/events` still works
**Business Rule**: All queries go through Prisma's parameterised client
**Suggested Layer**: API

---

### TC-227: Script content in user-supplied fields is rendered as text
**Category**: Security
**Priority**: P0
**Preconditions**: Logged in
**Steps**:
1. Create an event with title `<img src=x onerror=alert(1)>`, description `<script>alert(2)</script>`, venue `"><svg onload=alert(3)>`
2. Book it with customer name `<script>alert(4)</script>`
3. Visit `/events`, `/events/:id`, `/admin/events`, `/bookings`, `/bookings/:id`, `/admin/bookings` (open the View modal)
**Expected Results**: No dialog fires on any page; the strings appear literally as text
**Business Rule**: Stored XSS protection — React escapes interpolated values
**Suggested Layer**: E2E

---

### TC-228: Dangerous image URLs are rejected
**Category**: Security
**Priority**: P1
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with `imageUrl: "javascript:alert(1)"`, then `"data:text/html,<script>alert(1)</script>"`
**Expected Results**: 400 "Validation failed" with details `{ field: "imageUrl", message: "Image URL must be a valid URL" }`
**Business Rule**: `eventValidator` — `isURL()`
**Suggested Layer**: API

---

### TC-229: ⚠ Switching accounts in the same browser session shows no data from the previous user
**Category**: Security
**Priority**: P0
**Preconditions**: User A has bookings and an own event; User B has neither
**Steps**:
1. Log in as User A; visit `/events` and `/bookings`
2. Click Logout, then log in as User B **without reloading the page**
3. Immediately open `/bookings`, `/events` and `/admin/events`
**Expected Results**: At no point are User A's bookings or private events displayed. ⚠ Risk found in code: logout does not clear the React Query cache (30 s stale time, same query keys for both users), so cached lists from User A may flash or persist until refetch.
**Business Rule**: Rule 2 — sandbox isolation; `useAuth.logout` / `Providers` QueryClient lifetime
**Suggested Layer**: E2E

---

### TC-230: Protected pages are not reachable after logout
**Category**: Security
**Priority**: P1
**Preconditions**: Logged in on `/bookings`
**Steps**:
1. Click Logout
2. Press the browser Back button
3. Enter `/bookings/<known id>` in the address bar
**Expected Results**: Both attempts end at `/login`; no booking data is shown
**Business Rule**: `AuthGuard` re-evaluates on every route
**Suggested Layer**: E2E

---

### TC-231: Admin pages have no elevated privileges
**Category**: Security
**Priority**: P1
**Preconditions**: A newly registered user (User B); User A has events and bookings
**Steps**:
1. As User B, open `/admin/events` and `/admin/bookings`
**Expected Results**: Pages load (there are no roles); the events table lists only static events (all "Read-only") plus User B's own; "Manage Bookings" shows only User B's bookings (0 total for a new user)
**Business Rule**: Rule 2 — admin pages use the same sandboxed endpoints
**Suggested Layer**: E2E

---

### TC-232: Cross-origin requests from an unlisted origin are not allowed
**Category**: Security
**Priority**: P2
**Preconditions**: API running with `CORS_ORIGIN` set to the web origin
**Steps**:
1. Send `OPTIONS /api/events` and `GET /api/health` with `Origin: https://evil.example`
**Expected Results**: `Access-Control-Allow-Origin` is not `https://evil.example` (it is the configured origin only)
**Business Rule**: `cors({ origin: CORS_ORIGIN, credentials: true })`
**Suggested Layer**: API

---

### TC-233: ⚠ Booking id probing distinguishes "exists" from "does not exist"
**Category**: Security
**Priority**: P3
**Preconditions**: User A has booking id N; User B is authenticated; id M does not exist
**Steps**:
1. As User B, `GET /api/bookings/N` and `GET /api/bookings/M`
**Expected Results**: ⚠ Discovered behaviour: 403 for N and 404 for M, which lets a user enumerate which sequential ids exist (no booking data is disclosed). Confirm this is acceptable; events use 404 for both cases.
**Business Rule**: `getBookingById` uses `findByIdOnly` then an ownership check
**Suggested Layer**: API

---

### TC-234: ⚠ Repeated failed logins are not throttled
**Category**: Security
**Priority**: P3
**Preconditions**: A registered email
**Steps**:
1. Send 30 consecutive `POST /api/auth/login` requests with wrong passwords
2. Send one with the correct password
**Expected Results**: ⚠ Discovered behaviour: every wrong attempt returns 400 with no lockout, delay or 429, and the correct attempt succeeds. Recorded as an observation — no rate limiting exists in `app.js`.
**Business Rule**: Absence of rate limiting / lockout middleware
**Suggested Layer**: API

---

## Negative / Error

### TC-300: Navigate to non-existent booking ID shows "Booking not found"
**Category**: Negative
**Priority**: P1
**Preconditions**: User is logged in
**Steps**:
1. Navigate to `/bookings/99999` (ID that does not exist)
**Expected Results**: Page shows "Booking not found" and "This booking doesn't exist or may have been cancelled." with "View My Bookings" button
**Business Rule**: `bookingService.getBookingById` throws NotFoundError → API returns 404; frontend renders not-found empty state
**Suggested Layer**: E2E

---

### TC-301: GET /api/bookings/:id with non-existent ID returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `GET /api/bookings/99999` with valid JWT
**Expected Results**: HTTP 404; error message "Booking with id 99999 not found"
**Business Rule**: `bookingService.getBookingById` — NotFoundError
**Suggested Layer**: API

---

### TC-302: Create booking with insufficient seats returns 400
**Category**: Negative
**Priority**: P0
**Preconditions**: User is authenticated; event has 0 personal available seats (all booked by this user)
**Steps**:
1. Send `POST /api/bookings` with `quantity: 1` for a fully-booked event
**Expected Results**: HTTP 400; "Only 0 seat(s) available, but 1 requested"
**Business Rule**: `bookingService.createBooking` — `InsufficientSeatsError` when `personalAvailable < quantity`
**Suggested Layer**: API

---

### TC-303: Create booking for non-existent event returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `eventId: 99999`
**Expected Results**: HTTP 404; "Event with id 99999 not found"
**Business Rule**: `bookingService.createBooking` — event lookup fails → NotFoundError
**Suggested Layer**: API

---

### TC-304: Create booking with missing required fields returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with missing `customerName`, `customerEmail`, or `customerPhone`
**Expected Results**: HTTP 400; validation error message listing missing fields
**Business Rule**: Input validators on the bookings route
**Suggested Layer**: API

---

### TC-305: Create booking with quantity = 0 or negative returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `quantity: 0`
2. Send `POST /api/bookings` with `quantity: -1`
**Expected Results**: HTTP 400; validation error for both cases
**Business Rule**: quantity must be 1–10 per booking model
**Suggested Layer**: API

---

### TC-306: Create booking with quantity > 10 returns 400
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated
**Steps**:
1. Send `POST /api/bookings` with `quantity: 11`
**Expected Results**: HTTP 400; validation error
**Business Rule**: quantity must be 1–10
**Suggested Layer**: API

---

### TC-307: Cancel a booking that has already been cancelled returns 404
**Category**: Negative
**Priority**: P1
**Preconditions**: User is authenticated; a booking exists
**Steps**:
1. Delete the booking via `DELETE /api/bookings/:id`
2. Attempt to delete the same booking again
**Expected Results**: HTTP 404; "Booking with id X not found"
**Business Rule**: `cancelBooking` uses `bookingRepository.findById` — not found after deletion
**Suggested Layer**: API

---

### TC-308: Bookings page shows error state when server is unreachable
**Category**: Negative
**Priority**: P2
**Preconditions**: Backend server is down or returns 500
**Steps**:
1. Navigate to `/bookings` with backend unavailable
**Expected Results**: Error empty state renders: "Couldn't load bookings", "Failed to connect to the server. Please try again.", and a "Retry" button
**Business Rule**: `isError` branch in `BookingsContent` component
**Suggested Layer**: Component / E2E

---

### TC-309: Login with a wrong password
**Category**: Negative
**Priority**: P0
**Preconditions**: A registered non-demo account; on `/login`
**Steps**:
1. Enter the registered email and a wrong password (≥ 6 chars)
2. Click `#login-btn`
**Expected Results**: Error toast "Invalid email or password"; user stays on `/login`; no token is stored. API returns 400 (not 401 — a 401 would trigger the interceptor's redirect)
**Business Rule**: `authService.login` → ValidationError
**Suggested Layer**: E2E / API

---

### TC-310: Login with an unregistered email
**Category**: Negative
**Priority**: P1
**Preconditions**: On `/login`
**Steps**:
1. Enter an email that was never registered and any 6+ character password; submit
**Expected Results**: Error toast "Invalid email or password"; stays on `/login`
**Business Rule**: `authService.login`
**Suggested Layer**: E2E / API

---

### TC-311: Login form client-side validation
**Category**: Negative
**Priority**: P1
**Preconditions**: On `/login`
**Steps**:
1. Submit with both fields empty
2. Submit with email `not-an-email` and password `12345`
**Expected Results**: Inline errors "Enter a valid email" and "Password must be at least 6 characters" in both cases; no request to `/api/auth/login` is sent
**Business Rule**: Login page `validate()`
**Suggested Layer**: Component / E2E

---

### TC-312: Auth API rejects missing or malformed credentials
**Category**: Negative
**Priority**: P1
**Preconditions**: None
**Steps**:
1. `POST /api/auth/login` with `{}`
2. `POST /api/auth/register` with `{ email: "bad", password: "123" }`
**Expected Results**: Both → 400 `{ success: false, error: "Validation failed", details: [{ field: "email", message: "A valid email is required" }, { field: "password", message: "Password must be at least 6 characters" }] }`; no user is created
**Business Rule**: `validateAuth` in `authRoutes`
**Suggested Layer**: API

---

### TC-313: Register with an email that is already registered
**Category**: Negative
**Priority**: P0
**Preconditions**: An existing account's email
**Steps**:
1. On `/register`, enter the existing email and a valid strong password twice; submit
**Expected Results**: Error toast "Email already registered"; stays on `/register`; no token stored. API returns 400 (the skill documents 409)
**Business Rule**: `authService.register` duplicate check
**Suggested Layer**: E2E / API

---

### TC-314: Register form rejects weak passwords
**Category**: Negative
**Priority**: P1
**Preconditions**: On `/register` with a valid email
**Steps**:
1. Submit with each of: `Short1!` (7 chars), `lowercase1!` (no uppercase), `NoNumber!!` (no digit), `NoSpecial12` (no special character)
**Expected Results**: Each attempt shows "Password does not meet the requirements below", the unmet checklist item stays grey, and no request is sent
**Business Rule**: `PASSWORD_RULES` / `isStrongPassword`
**Suggested Layer**: Component / E2E

---

### TC-315: Register form rejects mismatched passwords and invalid email
**Category**: Negative
**Priority**: P1
**Preconditions**: On `/register`
**Steps**:
1. Enter a valid email, `Sandbox1!` as password and `Sandbox2!` as confirmation; submit
2. Enter email `user@domain` with matching strong passwords; submit
**Expected Results**: Step 1 → "Passwords do not match"; step 2 → "Enter a valid email"; no request is sent
**Business Rule**: Register page `validate()`
**Suggested Layer**: Component / E2E

---

### TC-316: Booking form — submit with empty fields
**Category**: Negative
**Priority**: P0
**Preconditions**: Logged in; on `/events/:id` with seats available
**Steps**:
1. Click "Confirm Booking" without filling anything
**Expected Results**: Inline errors "Name must be at least 2 chars", "Enter a valid email", "Enter a valid 10-digit phone"; no booking request is sent; no confirmation card
**Business Rule**: `BookingForm.validate()`; Booking model field rules
**Suggested Layer**: Component / E2E

---

### TC-317: Booking form — invalid individual fields
**Category**: Negative
**Priority**: P1
**Preconditions**: Logged in; on `/events/:id`
**Steps**:
1. Submit with name `A`, valid email and phone
2. Submit with valid name, email `user@`, valid phone
3. Submit with valid name and email, phone `12345`
**Expected Results**: Only the offending field shows its error each time; no request is sent; fixing the field and resubmitting clears the error and books successfully
**Business Rule**: Name ≥ 2 chars, valid email, phone ≥ 10 digits
**Suggested Layer**: Component / E2E

---

### TC-318: Bookings API — field validation errors
**Category**: Negative
**Priority**: P1
**Preconditions**: Valid JWT; valid event id
**Steps**:
1. `POST /api/bookings` with, in turn: `customerName: "A"`; `customerEmail: "not-an-email"`; `customerPhone: "12345"`; `customerPhone: "abcdefghij"`
**Expected Results**: Each → 400 `error: "Validation failed"` with a `details` entry for the field: "Customer name must be at least 2 characters"; "Customer email must be a valid email address"; "Customer phone must be at least 10 digits"; "Customer phone must contain only digits and +, -, spaces, or parentheses". No booking is created
**Business Rule**: `bookingValidator`
**Suggested Layer**: API

---

### TC-319: Bookings API — invalid event id or quantity type
**Category**: Negative
**Priority**: P1
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/bookings` with `eventId` missing, `0`, `-1`, `"abc"`
2. `POST /api/bookings` with `quantity` missing, `1.5`, `"two"`
**Expected Results**: 400 "Validation failed" with "Event ID is required" / "Event ID must be a positive integer" and "Quantity is required" / "Quantity must be an integer between 1 and 10"
**Business Rule**: `bookingValidator` — `isInt` rules
**Suggested Layer**: API

---

### TC-320: Booking more tickets than remain for the user
**Category**: Negative
**Priority**: P0
**Preconditions**: Valid JWT; an own event where the user has 2 seats left
**Steps**:
1. `POST /api/bookings` with `quantity: 3`
**Expected Results**: 400 `{ success: false, error: "Only 2 seat(s) available, but 3 requested" }`; no booking is created; seats unchanged
**Business Rule**: `InsufficientSeatsError` in `createBooking`
**Suggested Layer**: API

---

### TC-321: Booking error from the server is shown as a toast and the form is kept
**Category**: Negative
**Priority**: P1
**Preconditions**: Logged in; on `/events/:id`; booking request will fail (mock `POST /api/bookings` → 400 with an error message, or 500)
**Steps**:
1. Fill the form validly and click "Confirm Booking"
**Expected Results**: Error toast with the server's message; no confirmation card; entered values remain; button returns from loading to "Confirm Booking"
**Business Rule**: `onError: toast(err.message, 'error')` in `BookingForm`
**Suggested Layer**: Component / E2E

---

### TC-322: Event form — submit with empty fields
**Category**: Negative
**Priority**: P0
**Preconditions**: Logged in; on `/admin/events`
**Steps**:
1. Click "+ Add Event" with the form untouched
**Expected Results**: Inline errors "Title is required", "Venue is required", "City is required", "Event date is required", "Enter a valid price (≥ 0)", "Must have at least 1 seat"; no request is sent; table unchanged
**Business Rule**: `EventForm.validate()`
**Suggested Layer**: Component / E2E

---

### TC-323: Event form — past date, negative price, zero seats
**Category**: Negative
**Priority**: P1
**Preconditions**: Logged in; on `/admin/events` with other fields valid
**Steps**:
1. Set Event Date & Time to yesterday; submit
2. Set a future date and Price `-5`; submit
3. Set Price `10` and Total Seats `0`; submit
**Expected Results**: "Must be a future date"; "Enter a valid price (≥ 0)"; "Must have at least 1 seat" respectively; no event is created
**Business Rule**: Event model — future date, price ≥ 0, totalSeats ≥ 1
**Suggested Layer**: Component / E2E

---

### TC-324: Events API — missing required fields
**Category**: Negative
**Priority**: P0
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with `{}`
**Expected Results**: 400 "Validation failed"; `details` contains entries for `title`, `category`, `venue`, `city`, `eventDate`, `price`, `totalSeats`; no event created and nothing pruned
**Business Rule**: `validateCreateEvent`
**Suggested Layer**: API

---

### TC-325: Events API — past or malformed event date
**Category**: Negative
**Priority**: P0
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with `eventDate` = yesterday (ISO)
2. `POST /api/events` with `eventDate: "next friday"`
**Expected Results**: 400 with "Event date must be in the future"; 400 with "Event date must be a valid ISO 8601 date"
**Business Rule**: Event model — eventDate must be a future date
**Suggested Layer**: API

---

### TC-326: Events API — invalid price, seats or image URL
**Category**: Negative
**Priority**: P1
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with, in turn: `price: -1`; `price: "free"`; `totalSeats: 0`; `totalSeats: 2.5`; `imageUrl: "not a url"`
**Expected Results**: Each → 400 with the matching message: "Price must be a non-negative number"; "Total seats must be a positive integer"; "Image URL must be a valid URL"
**Business Rule**: `validateCreateEvent`
**Suggested Layer**: API

---

### TC-327: ⚠ Events API — partial update is rejected
**Category**: Negative
**Priority**: P1
**Preconditions**: User owns an event
**Steps**:
1. `PUT /api/events/:id` with only `{ "title": "New title" }`
**Expected Results**: ⚠ Discovered behaviour: 400 "Validation failed" listing the other required fields — `PUT` reuses the create validator, so a full payload with a future `eventDate` is required. Event is unchanged.
**Business Rule**: `router.put('/:id', validateCreateEvent, …)`
**Suggested Layer**: API

---

### TC-328: Events API — update or delete a non-existent event
**Category**: Negative
**Priority**: P1
**Preconditions**: Valid JWT
**Steps**:
1. `PUT /api/events/999999` with a full valid payload
2. `DELETE /api/events/999999`
**Expected Results**: Both → 404 "Event with id 999999 not found"
**Business Rule**: `NotFoundError` in `eventService`
**Suggested Layer**: API

---

### TC-329: Non-existent event id
**Category**: Negative
**Priority**: P1
**Preconditions**: Logged in
**Steps**:
1. `GET /api/events/999999`
2. Open `/events/999999`
**Expected Results**: API → 404 "Event with id 999999 not found"; UI → "Event not found" / "The event you're looking for doesn't exist or has been removed." with a "Browse Events" button
**Business Rule**: `eventService.getEventById`; `isError` branch of the event detail page
**Suggested Layer**: API / E2E

---

### TC-330: ⚠ Non-numeric id in the path
**Category**: Negative
**Priority**: P2
**Preconditions**: Valid JWT
**Steps**:
1. `GET /api/events/abc`, `GET /api/bookings/abc`, `DELETE /api/bookings/abc`
2. Open `/events/abc` and `/bookings/abc` in the UI
**Expected Results**: Expected: a 4xx (400 or 404) with the standard error envelope. ⚠ Discovered behaviour: ids are passed through `Number()` with no validation, so `NaN` reaches Prisma and the API answers 500. The UI shows "Event not found" / "Booking not found".
**Business Rule**: Missing path-parameter validation in repositories
**Suggested Layer**: API

---

### TC-331: Booking reference that does not exist
**Category**: Negative
**Priority**: P2
**Preconditions**: Valid JWT
**Steps**:
1. `GET /api/bookings/ref/Z-000000`
**Expected Results**: 404 `Booking with reference "Z-000000" not found`
**Business Rule**: `bookingService.getBookingByRef`
**Suggested Layer**: API

---

### TC-332: Unknown API route
**Category**: Negative
**Priority**: P2
**Preconditions**: None
**Steps**:
1. `GET /api/does-not-exist`; `PATCH /api/bookings/1/cancel` with a valid token
**Expected Results**: 404 `{ success: false, error: "Route <METHOD> <path> not found" }`
**Business Rule**: Catch-all 404 handler in `app.js`
**Suggested Layer**: API

---

### TC-333: ⚠ Malformed JSON request body
**Category**: Negative
**Priority**: P2
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/bookings` with `Content-Type: application/json` and body `{"eventId": 1,`
**Expected Results**: Expected: 400 with the error envelope. ⚠ Discovered behaviour: the body-parser error is not mapped by `errorHandler`, so the response is 500.
**Business Rule**: `errorHandler` fallback branch
**Suggested Layer**: API

---

### TC-334: ⚠ Negative page number
**Category**: Negative
**Priority**: P3
**Preconditions**: Valid JWT
**Steps**:
1. `GET /api/events?page=-1`; `GET /api/bookings?page=-1`
**Expected Results**: Expected: 400, or fall back to page 1. ⚠ Discovered behaviour: `skip` becomes negative and the query fails with 500. (`page=0` and `page=abc` fall back to page 1.)
**Business Rule**: Pagination maths in the repositories (`skip = (page − 1) × limit`)
**Suggested Layer**: API

---

### TC-335: Sold-out event cannot be booked from the UI
**Category**: Negative
**Priority**: P0
**Preconditions**: Logged in; an own event whose seats the user has fully booked
**Steps**:
1. Find the event's card on `/events`
2. Open `/events/:id` directly
**Expected Results**: Card link reads "Sold Out", has `aria-disabled="true"` and does not navigate; on the detail page the submit button reads "Sold Out" and is disabled, so no booking request can be sent
**Business Rule**: `soldOut = availableSeats === 0`
**Suggested Layer**: E2E

---

### TC-336: Events page shows an error state when the API fails
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; `GET /api/events` fails (mock 500 or network error)
**Steps**:
1. Open `/events`
2. Restore the API and click "Retry"
**Expected Results**: "Couldn't load events" / "There was a problem connecting to the server. Please try again." with a "Retry" button; after retry the cards load
**Business Rule**: `isError` branch in `EventsContent`
**Suggested Layer**: Component / E2E

---

### TC-337: Event create/update failure is shown as a toast and the form is kept
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; on `/admin/events`; `POST /api/events` will fail (mock 400/500)
**Steps**:
1. Fill the form validly and submit
**Expected Results**: Error toast with the server message; form keeps the entered values; no new row
**Business Rule**: `onError` in `EventForm`
**Suggested Layer**: Component / E2E

---

### TC-338: Failed event deletion rolls back the optimistic removal
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; own event listed; `DELETE /api/events/:id` will fail (mock 500)
**Steps**:
1. Click "Delete" and confirm
**Expected Results**: Row disappears, then reappears; error toast with the server message; no "Event deleted" toast
**Business Rule**: Optimistic delete with snapshot rollback in `AdminEventsPage.confirmDelete`
**Suggested Layer**: Component / E2E

---

### TC-339: Cancelling a booking that no longer exists shows an error
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; `/bookings` open in tab 1 showing booking X; booking X then cancelled in tab 2
**Steps**:
1. In tab 1 click "Cancel Booking" on X and confirm
**Expected Results**: Error toast "Booking with id X not found"; dialog closes
**Business Rule**: `cancelBooking` → NotFoundError; `BookingCard` `onError`
**Suggested Layer**: E2E

---

### TC-340: Admin bookings page shows an error state when the API fails
**Category**: Negative
**Priority**: P3
**Preconditions**: Logged in; `GET /api/bookings` fails (mock 500)
**Steps**:
1. Open `/admin/bookings`
**Expected Results**: "Couldn't load bookings" / "Failed to reach the server. Please retry." with a "Retry" button
**Business Rule**: `isError` branch in `AdminBookingsPage`
**Suggested Layer**: Component

---

### TC-341: Quantity cannot be pushed above 10 from the UI
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; event with more than 10 seats
**Steps**:
1. On `/events/:id` click "+" repeatedly
**Expected Results**: Counter never exceeds 10; "+" becomes disabled at 10
**Business Rule**: Quantity 1–10
**Suggested Layer**: Component / E2E

---

### TC-342: Register API accepts a password the UI would reject
**Category**: Negative
**Priority**: P2
**Preconditions**: A unique email
**Steps**:
1. `POST /api/auth/register` with password `abcdef`
**Expected Results**: ⚠ Discovered behaviour: 201 — the API enforces only a 6-character minimum, so the UI's strength policy can be bypassed. Confirm which rule is authoritative.
**Business Rule**: `validateAuth` vs. `PASSWORD_RULES`
**Suggested Layer**: API

---

### TC-343: Deleting an already-deleted event
**Category**: Negative
**Priority**: P2
**Preconditions**: Valid JWT; an own event
**Steps**:
1. `DELETE /api/events/:id` twice
**Expected Results**: First → 200; second → 404 "Event with id X not found"
**Business Rule**: `eventService.deleteEvent`
**Suggested Layer**: API

---

### TC-344: Clear all bookings when the user has none
**Category**: Negative
**Priority**: P2
**Preconditions**: Valid JWT; zero bookings
**Steps**:
1. `DELETE /api/bookings`
**Expected Results**: 200 `{ success: true, message: "0 booking(s) cleared" }`
**Business Rule**: `clearAllBookings`
**Suggested Layer**: API

---

### TC-345: Dismissing the "Clear all bookings" confirmation keeps the bookings
**Category**: Negative
**Priority**: P1
**Preconditions**: Logged in; at least one booking
**Steps**:
1. On `/bookings` click "Clear all bookings" and dismiss the browser confirm ("Clear all your bookings? This cannot be undone.")
**Expected Results**: No `DELETE /api/bookings` request; all cards remain
**Business Rule**: `handleClearAll` returns early when `confirm()` is false
**Suggested Layer**: E2E

---

### TC-346: Dismissing the delete-event dialog keeps the event
**Category**: Negative
**Priority**: P1
**Preconditions**: Logged in; own event listed on `/admin/events`
**Steps**:
1. Click "Delete", then "Cancel" in the dialog
**Expected Results**: Dialog closes; row remains; no DELETE request
**Business Rule**: `ConfirmDialog` `onClose`
**Suggested Layer**: E2E

---

### TC-347: Editing then cancelling leaves the event unchanged
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; own event listed on `/admin/events`
**Steps**:
1. Click "Edit", change the title, click "Cancel edit"
**Expected Results**: Form returns to empty "+ New Event" mode; row keeps the original title; no PUT request
**Business Rule**: `EventForm` "Cancel edit" → `onSuccess()` → `clearEdit`
**Suggested Layer**: E2E / Component

---

### TC-348: Editing an event to a past date is rejected
**Category**: Negative
**Priority**: P2
**Preconditions**: Logged in; own event
**Steps**:
1. Edit the event and set the date to yesterday; submit
2. `PUT /api/events/:id` with a past `eventDate`
**Expected Results**: UI → "Must be a future date"; API → 400 "Event date must be in the future"
**Business Rule**: Event date must be in the future (create validator reused on update)
**Suggested Layer**: E2E / API

---

## Edge Cases

### TC-400: Exactly 9 bookings — adding a 10th prunes oldest from a DIFFERENT event (preferred)
**Category**: Edge Case
**Priority**: P0
**Preconditions**: User has exactly 9 bookings across multiple events
**Steps**:
1. Note the ID of the oldest booking (different event from the new booking's event)
2. Create a new (10th) booking for Event X
3. Check the bookings list
**Expected Results**: Count stays at 9; oldest booking (different event) is gone; new booking is present
**Business Rule**: `findOldestUserBookingExcludingEvent` preferential pruning in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-401: Exactly 9 bookings all from same event — 10th triggers same-event fallback and burns seat
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has 9 bookings all for Event X
**Steps**:
1. Create a new booking for Event X (10th)
2. Re-fetch Event X's available seats
**Expected Results**: Oldest booking removed; new booking created; `availableSeats` is permanently decremented by the new quantity (seat burned via `eventRepository.decrementSeats`)
**Business Rule**: `sameEventFallback = true` → `decrementSeats` called in `bookingService.createBooking`
**Suggested Layer**: API

---

### TC-402: Booking with quantity = 1 (minimum) — full happy path
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is logged in; event has available seats
**Steps**:
1. Navigate to event detail page
2. Leave quantity at 1 (default minimum)
3. Fill customer form and confirm booking
**Expected Results**: Booking created with `quantity: 1`; `totalPrice = price × 1`; booking ref generated
**Business Rule**: quantity boundary: 1 is minimum
**Suggested Layer**: E2E

---

### TC-403: Booking with quantity = 10 (maximum)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User is logged in; event has >= 10 available seats
**Steps**:
1. Navigate to event detail; click "+" 9 times to reach quantity 10
2. Fill form and confirm booking
**Expected Results**: Booking created with `quantity: 10`; `totalPrice = price × 10`; increment button disabled at 10
**Business Rule**: quantity boundary: 10 is maximum; UI should prevent going above 10
**Suggested Layer**: E2E

---

### TC-404: Refund eligibility boundary — quantity = 2 is NOT eligible (just above threshold)
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has a booking with quantity = 2
**Steps**:
1. Navigate to booking detail
2. Click "Check eligibility for refund?"
3. Wait 4 seconds
**Expected Results**: Result shows "Not eligible for refund. Group bookings (2 tickets) are non-refundable."
**Business Rule**: Rule 8 — threshold is quantity === 1; quantity = 2 is the first ineligible value
**Suggested Layer**: E2E

---

### TC-405: Booking reference uniqueness — collision retry mechanism
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Many bookings exist with the same event title prefix (stress scenario)
**Steps**:
1. Create many bookings for events starting with the same letter
2. Verify each `bookingRef` is unique in DB
**Expected Results**: All booking references are unique; no duplicates; fallback timestamp-based ref used after 10 failed attempts
**Business Rule**: `generateUniqueRef` — up to 10 retries, then timestamp fallback
**Suggested Layer**: Unit

---

### TC-406: Clear all bookings when only one booking exists
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has exactly 1 booking
**Steps**:
1. Navigate to `/bookings`
2. Click "Clear all bookings" and confirm
**Expected Results**: Booking is deleted; page shows empty state; `DELETE /api/bookings` returns 200 `{ success: true, message: "1 booking(s) cleared" }`
**Business Rule**: `clearAllBookings` — `deleteAllForUser` returns count of deleted records
**Suggested Layer**: E2E / API

---

### TC-407: Pagination on bookings list (API) — page 2 with partial results
**Category**: Edge Case
**Priority**: P2
**Preconditions**: User has more than the default page limit of bookings visible in API
**Steps**:
1. Send `GET /api/bookings?page=2&limit=5`
**Expected Results**: Returns page 2 results; `pagination.page = 2`; `data` array contains at most 5 items
**Business Rule**: Pagination behavior in `bookingService.getBookings`
**Suggested Layer**: API

---

### TC-408: Event title starting with a number — booking ref prefix is uppercase of that character
**Category**: Edge Case
**Priority**: P2
**Preconditions**: An event exists whose title starts with a digit (e.g., "100 Days Festival")
**Steps**:
1. Book the event
2. Check the `bookingRef`
**Expected Results**: `bookingRef` starts with "1-XXXXXX" (digit is used as-is, `toUpperCase()` has no effect on digits)
**Business Rule**: `randomRef` — `prefix = (eventTitle?.[0] ?? 'E').toUpperCase()`
**Suggested Layer**: API / Unit

---

### TC-409: Event limit boundary — the 6th event does not prune
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User owns exactly 5 events
**Steps**:
1. Create one more event
2. List own events
**Expected Results**: User owns 6 events; all 5 earlier ones still exist
**Business Rule**: Rule 3 — prune only when `count >= 6` before insert
**Suggested Layer**: API

---

### TC-410: Booking limit boundary — the 9th booking does not prune
**Category**: Edge Case
**Priority**: P1
**Preconditions**: User has exactly 8 bookings
**Steps**:
1. Create one more booking
2. `GET /api/bookings`
**Expected Results**: `pagination.total` is 9; all 8 earlier bookings still exist
**Business Rule**: Rule 4 — prune only when `count >= 9` before insert
**Suggested Layer**: API

---

### TC-411: Single-seat event sells out after one ticket
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Logged in; own event with `totalSeats: 1`
**Steps**:
1. Open the event: note "(max 1)" and "+" disabled
2. Book 1 ticket
3. View the card on `/events` and reopen the detail page
**Expected Results**: Booking succeeds; card shows the "SOLD OUT" overlay and a disabled "Sold Out" link; detail shows "SOLD OUT" in red and a disabled "Sold Out" button
**Business Rule**: `availableSeats === 0` → sold out
**Suggested Layer**: E2E

---

### TC-412: Booking exactly the remaining seats
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Valid JWT; own event with exactly 4 seats left
**Steps**:
1. `POST /api/bookings` with `quantity: 4`
2. `POST /api/bookings` with `quantity: 1`
**Expected Results**: First → 201 and the event returns `availableSeats: 0`; second → 400 "Only 0 seat(s) available, but 1 requested"
**Business Rule**: `personalAvailable < quantity` check (equal is allowed)
**Suggested Layer**: API

---

### TC-413: Sold-out seats return after cancelling
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Logged in; an own event the user has sold out with one booking
**Steps**:
1. Cancel that booking
2. Reopen the event
**Expected Results**: Event is bookable again with its full seat count; "Sold Out" states are gone
**Business Rule**: Rule 4 — cancellation immediately frees seats
**Suggested Layer**: E2E / API

---

### TC-414: Low-seat thresholds on the seat indicator
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Own events with 11, 10, 2 and 1 available seats
**Steps**:
1. View each card on `/events` and each detail page
**Expected Results**: 11 → green "11 seats available"; 10 → amber "10 seats left!"; 2 → "2 seats left!"; 1 → "1 seat left!" (singular). Detail page uses amber for ≤ 10 and green above
**Business Rule**: `SeatsIndicator` thresholds (0, ≤ 10, > 10)
**Suggested Layer**: Component

---

### TC-415: Free event (price 0)
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. Create an event with Price `0`
2. Book 3 tickets
**Expected Results**: Event is created; price shows `$0`; booking succeeds with `totalPrice: 0` and "Total $0"
**Business Rule**: Event model — price ≥ 0
**Suggested Layer**: API / E2E

---

### TC-416: Fractional price — stored exactly, displayed rounded
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. Create an event with price `49.99`
2. Book 3 tickets and read the API response and the UI
**Expected Results**: API `price` is `49.99` and `totalPrice` is `149.97`; the UI formats with no decimals, so it shows `$50` per ticket and `$150` total. Confirm the rounding is intended.
**Business Rule**: `Decimal(10,2)` columns; `fmt_price` uses `maximumFractionDigits: 0`
**Suggested Layer**: API / Component

---

### TC-417: Large price is formatted differently on the card and the detail page
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Own event with price `100000`
**Steps**:
1. Compare the price on the `/events` card with `/events/:id`
**Expected Results**: ⚠ Discovered behaviour: the card uses the `en-IN` locale (`$1,00,000`) while the detail page, bookings and admin tables use `en-US` (`$100,000`). Confirm the intended format.
**Business Rule**: `EventCard.fmt_price` (`en-IN`) vs. other `fmt_price` helpers (`en-US`)
**Suggested Layer**: Component

---

### TC-418: Price above the column maximum
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with `price: 99999999.99`
2. `POST /api/events` with `price: 100000000`
**Expected Results**: First → 201. Second exceeds `Decimal(10,2)`: expected a 400 validation error; ⚠ the validator has no upper bound, so a database error (500) is likely
**Business Rule**: Schema `price Decimal @db.Decimal(10, 2)`; no max in `eventValidator`
**Suggested Layer**: API

---

### TC-419: Event date just inside and just outside the future boundary
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with `eventDate` = now + 1 minute
2. `POST /api/events` with `eventDate` = now − 1 second
**Expected Results**: First → 201; second → 400 "Event date must be in the future"
**Business Rule**: `new Date(value) <= new Date()` is rejected
**Suggested Layer**: API

---

### TC-420: Events whose date has passed can still be booked
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; a seeded event whose `eventDate` is in the past (the seed uses fixed 2026 dates)
**Steps**:
1. Open the event and book 1 ticket
**Expected Results**: ⚠ Discovered behaviour: booking succeeds — there is no date check on booking and the list is still titled "Upcoming Events". Confirm whether past events should be hidden or blocked.
**Business Rule**: `createBooking` has no date validation; `prisma/seed.js` fixed dates
**Suggested Layer**: API / E2E

---

### TC-421: Password length boundary on the API
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Two unique emails
**Steps**:
1. `POST /api/auth/register` with a 5-character password
2. `POST /api/auth/register` with a 6-character password
**Expected Results**: 5 → 400 "Password must be at least 6 characters"; 6 → 201
**Business Rule**: `validateAuth` — `password.length < 6`
**Suggested Layer**: API

---

### TC-422: Password length boundary on the register form
**Category**: Edge Case
**Priority**: P2
**Preconditions**: On `/register`
**Steps**:
1. Try `Abcde1!` (7 chars), then `Abcdef1!` (8 chars), with matching confirmation
**Expected Results**: 7 → "At least 8 characters" stays grey and submission is blocked; 8 → all rules green and registration proceeds
**Business Rule**: `PASSWORD_RULES` — length ≥ 8
**Suggested Layer**: Component

---

### TC-423: Customer name boundary and whitespace padding
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; event with seats
**Steps**:
1. Book with name `Al` (2 chars)
2. In the UI, book with name `A` followed by one space
**Expected Results**: `Al` succeeds. `"A "` passes the client check (length 2) but the server trims it and returns 400 "Validation failed", shown as an error toast — ⚠ client and server rules differ
**Business Rule**: Name min 2 chars — client checks raw length, server checks trimmed length
**Suggested Layer**: API / Component

---

### TC-424: Phone number formats and boundary
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Valid JWT; event with seats
**Steps**:
1. Book via UI with `9876543210` and with `+91 98765 43210`
2. Book via UI with `987654321` (9 digits)
3. `POST /api/bookings` with `customerPhone: "+91-(98)-76"` (10+ characters, fewer than 10 digits)
**Expected Results**: Step 1 both succeed; step 2 → "Enter a valid 10-digit phone"; step 3 → ⚠ accepted by the API (it checks character count ≥ 10, not digit count) although the UI would reject it
**Business Rule**: Phone min 10 digits — client counts digits, server counts characters
**Suggested Layer**: API / Component

---

### TC-425: Gmail addresses are canonicalised on bookings
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Valid JWT; event with seats
**Steps**:
1. `POST /api/bookings` with `customerEmail: "Test.User+promo@Gmail.com"`
**Expected Results**: 201; stored `customerEmail` is `testuser@gmail.com` (dots and `+tag` removed, lower-cased). Confirm that altering the customer's address is intended.
**Business Rule**: `normalizeEmail()` defaults in `bookingValidator`
**Suggested Layer**: API

---

### TC-426: Booking reference prefix for unusual titles
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Own events titled `jazz night`, `  Spaced Title`, `#Hashtag Fest`, `Élan Gala`, and `🎉 Party`
**Steps**:
1. Book each event and read `bookingRef`
**Expected Results**: `J-…` (lower-case is upper-cased); `S-…` (title is trimmed on save); `#-…`; `É-…`; for the emoji title the prefix is the first UTF-16 code unit only (half of the emoji) — ⚠ produces a malformed character; confirm expected handling. All refs are 8 characters apart from the emoji case and are unique
**Business Rule**: Rule 7 — first character of the title, upper-cased (`eventTitle[0]`)
**Suggested Layer**: API / Unit

---

### TC-427: Title length boundary
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Valid JWT
**Steps**:
1. `POST /api/events` with a 191-character title
2. `POST /api/events` with a 192-character title
**Expected Results**: 191 → 201. 192 → expected 400; ⚠ no length rule exists in the validator and the column is `VARCHAR(191)`, so a database error (500) is likely. In the UI, long titles are clamped to two lines on cards and truncated in tables
**Business Rule**: Prisma `String` default length on MySQL; no max in `eventValidator`
**Suggested Layer**: API

---

### TC-428: Search edge inputs
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; seeded events
**Steps**:
1. Search `zzzqqq` (no match)
2. Search `MARATHON` vs `marathon`
3. Search `%` and `_`
4. Search a word with a trailing space
**Expected Results**: 1 → "No events found" with the hint to adjust filters. 2 → same results (database collation is case-insensitive). 3 → treated as literal characters, not wildcards. 4 → the space is sent as typed (no trimming) and may return no results
**Business Rule**: `contains` filter in `eventRepository.findAll`; search input is not trimmed
**Suggested Layer**: API / E2E

---

### TC-429: Search input is debounced
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; on `/events`
**Steps**:
1. Type `conference` quickly while counting `GET /api/events` requests
**Expected Results**: The URL and list update once, about 300 ms after typing stops — not once per keystroke
**Business Rule**: `useDebounce(search, 300)`
**Suggested Layer**: E2E / Component

---

### TC-430: Changing a filter resets pagination
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; on `/events?page=2`
**Steps**:
1. Select a category
**Expected Results**: URL keeps the category and drops `page`; results start from page 1
**Business Rule**: `EventFilters.push` deletes the `page` param
**Suggested Layer**: E2E

---

### TC-431: Page number beyond the last page
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Logged in
**Steps**:
1. `GET /api/events?page=999`
2. Open `/events?page=999`
**Expected Results**: API → 200 with `data: []` and the real `total`/`totalPages`; UI → "No events found"
**Business Rule**: Pagination in `eventService.getEvents`
**Suggested Layer**: API / E2E

---

### TC-432: `limit` parameter boundaries
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Valid JWT
**Steps**:
1. `GET /api/events?limit=1`
2. `GET /api/events?limit=0` and `?limit=abc`
3. `GET /api/events?limit=100000`
**Expected Results**: 1 → one item, `totalPages = total`. 2 → falls back to 10. 3 → ⚠ no upper bound: every visible event is returned in one response; confirm whether a cap is required
**Business Rule**: `Number(filters.limit) || 10`
**Suggested Layer**: API

---

### TC-433: Filter value with no events and city not in the filter list
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; an own event created with city `Kolkata`
**Steps**:
1. On `/events` choose city "Pune" (no seeded events)
2. Look for a way to filter by `Kolkata`
3. `GET /api/events?city=Kolkata`
**Expected Results**: 1 → "No events found". 2 → the dropdown has no such option, so the event is only reachable unfiltered or by search. 3 → the API returns the event
**Business Rule**: Hard-coded `CITIES` list vs. free-text city on the event form
**Suggested Layer**: E2E / API

---

### TC-434: Double-clicking "Confirm Booking" creates one booking
**Category**: Edge Case
**Priority**: P1
**Preconditions**: Logged in; valid booking form filled in
**Steps**:
1. Double-click "Confirm Booking" rapidly
2. Open `/bookings`
**Expected Results**: Exactly one new booking; the button shows a loading state after the first click
**Business Rule**: `Button loading={isPending}` on the booking form
**Suggested Layer**: E2E

---

### TC-435: ⚠ Concurrent bookings for the last seats
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Valid JWT; own event with 2 seats left
**Steps**:
1. Send two `POST /api/bookings` requests with `quantity: 2` at the same time
**Expected Results**: Expected: one 201 and one 400. ⚠ Risk found in code: the seat check and insert are not in a transaction, so both may succeed and the event would show 0 seats with 4 booked
**Business Rule**: Non-transactional check-then-create in `createBooking`
**Suggested Layer**: API

---

### TC-436: ⚠ Concurrent creations at the sandbox limits
**Category**: Edge Case
**Priority**: P3
**Preconditions**: User has 9 bookings (and, separately, 6 events)
**Steps**:
1. Send three `POST /api/bookings` requests in parallel
2. Send three `POST /api/events` requests in parallel
**Expected Results**: Expected: totals remain 9 and 6. ⚠ Risk found in code: count-then-delete is not atomic, so totals may temporarily exceed the limits or the same oldest record may be deleted twice (second delete → 404 "Record not found")
**Business Rule**: Rule 3 & Rule 4 — FIFO pruning is not transactional
**Suggested Layer**: API

---

### TC-437: Image URL variants
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. Create an event with no image URL
2. Create an event with an `https://` image URL
3. Create an event with an `http://` image URL and view `/events`
**Expected Results**: 1 → placeholder ticket icon on card and detail. 2 → image renders. 3 → ⚠ the API accepts it, but the Next.js image config allows only `https` hosts, so rendering may error; the events page must still load for the user
**Business Rule**: `imageUrl` optional; `next.config.js` `remotePatterns` (https only)
**Suggested Layer**: E2E

---

### TC-438: ⚠ Reducing `totalSeats` below the seats already shown as available
**Category**: Edge Case
**Priority**: P3
**Preconditions**: Own event with `totalSeats: 50`
**Steps**:
1. Edit the event and set Total Seats to `10`
2. View the event
**Expected Results**: ⚠ Discovered behaviour: the UI shows "50 / 10 seats" and up to 50 can still be booked, because `availableSeats` is not adjusted. Confirm intended behaviour (see TC-135)
**Business Rule**: `eventService.updateEvent`
**Suggested Layer**: API

---

### TC-439: A newly created event lands on page 2 of the admin table
**Category**: Edge Case
**Priority**: P2
**Preconditions**: Logged in; 10 static events seeded
**Steps**:
1. Create an event on `/admin/events`
2. Look for it in the table
**Expected Results**: Page 1 shows the 10 static rows (all "Read-only"); the new event is on page 2, reached through the pagination control. Automation must paginate before using `edit-event-btn` / `delete-event-btn`
**Business Rule**: Admin table `limit: 10`; ordering static first
**Suggested Layer**: E2E

---

### TC-440: Registering an email that differs only by letter case
**Category**: Edge Case
**Priority**: P2
**Preconditions**: `user@example.com` is registered
**Steps**:
1. `POST /api/auth/register` with `USER@example.com`
2. `POST /api/auth/login` with `USER@example.com` and the original password
**Expected Results**: Registration is rejected as a duplicate ("Email already registered", or 409 "A record with this value already exists" if the unique index catches it); login succeeds — emails compare case-insensitively under the MySQL default collation. Verify against the deployed database
**Business Rule**: `User.email @unique`; `findByEmail`
**Suggested Layer**: API

---

### TC-441: Token expiry
**Category**: Edge Case
**Priority**: P2
**Preconditions**: A token whose `exp` has just passed (generated with a short lifetime in a test environment, or a mocked clock)
**Steps**:
1. Call `GET /api/events` with it
2. Load the UI with it in `localStorage`
**Expected Results**: API → 401 "Invalid or expired token"; UI → token removed and user sent to `/login`
**Business Rule**: JWT 7-day expiry
**Suggested Layer**: API / Unit

---

## UI State

### TC-500: Bookings list shows skeleton loading state while fetching
**Category**: UI State
**Priority**: P1
**Preconditions**: User navigates to `/bookings` (slow network or first load)
**Steps**:
1. Navigate to `/bookings` with throttled network
2. Observe the page before data loads
**Expected Results**: 5 `BookingCardSkeleton` placeholders are shown while `isLoading = true`; no real booking data yet
**Business Rule**: `isLoading` branch in `BookingsContent`
**Suggested Layer**: Component / E2E

---

### TC-501: Bookings list shows empty state when user has no bookings
**Category**: UI State
**Priority**: P1
**Preconditions**: User is logged in with zero bookings
**Steps**:
1. Navigate to `/bookings`
**Expected Results**: Empty state renders with "No bookings yet", "You haven't booked any events yet..." description, and "Browse Events" button linking to `/events`
**Business Rule**: `bookings.length === 0` branch in `BookingsContent`
**Suggested Layer**: E2E / Component

---

### TC-502: Booking detail page shows loading spinner while fetching
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to `/bookings/:id` on slow network
**Steps**:
1. Navigate to `/bookings/:id` with throttled network
2. Observe the page before data loads
**Expected Results**: Full-screen spinner (`Spinner size="lg"`) is visible while `isLoading = true`
**Business Rule**: `isLoading` branch in `BookingDetailPage`
**Suggested Layer**: Component

---

### TC-503: Cancel booking confirmation dialog appears before deletion
**Category**: UI State
**Priority**: P0
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Cancel Booking" button
2. Observe dialog
**Expected Results**: `ConfirmDialog` appears with title "Cancel this booking?", description mentioning the booking ref and seat count, "Yes, cancel it" and close buttons
**Business Rule**: Two-step confirmation prevents accidental cancellations
**Suggested Layer**: E2E / Component

---

### TC-504: Cancel booking dialog close without confirming does NOT cancel
**Category**: UI State
**Priority**: P1
**Preconditions**: User is on a booking detail page
**Steps**:
1. Click "Cancel Booking"
2. Click the close/dismiss button on the dialog (not "Yes, cancel it")
3. Observe booking status
**Expected Results**: Dialog closes; booking remains in the list; no API call made
**Business Rule**: `onClose` sets `confirm = false`; `handleCancel` only runs on confirm
**Suggested Layer**: E2E

---

### TC-505: Booking detail breadcrumb displays the booking reference
**Category**: UI State
**Priority**: P2
**Preconditions**: User navigates to a valid booking detail page
**Steps**:
1. Navigate to `/bookings/:id`
2. Observe the breadcrumb nav at the top
**Expected Results**: Breadcrumb shows "My Bookings / {bookingRef}" where bookingRef is in monospace font
**Business Rule**: Breadcrumb uses `booking.bookingRef`
**Suggested Layer**: E2E

---

### TC-506: Cancel booking success — toast and redirect
**Category**: UI State
**Priority**: P0
**Preconditions**: User confirms booking cancellation
**Steps**:
1. Confirm cancellation in the dialog
2. Observe page transition and notifications
**Expected Results**: Success toast "Booking cancelled successfully" appears; user is redirected to `/bookings`
**Business Rule**: `onSuccess` callback in `handleCancel`
**Suggested Layer**: E2E

---

### TC-507: "Clear all bookings" button shows "Clearing..." while in progress
**Category**: UI State
**Priority**: P2
**Preconditions**: User has bookings; network is slow
**Steps**:
1. Click "Clear all bookings" and confirm dialog
2. Observe the button state while request is in flight
**Expected Results**: Button text changes to "Clearing…" and is disabled (`disabled:opacity-50`) during the API call
**Business Rule**: `clearing` state variable in `BookingsContent`
**Suggested Layer**: Component / E2E

---

### TC-508: Refund eligibility — "Check eligibility" button hidden after result shown
**Category**: UI State
**Priority**: P2
**Preconditions**: User is on a booking detail page in idle refund state
**Steps**:
1. Click "Check eligibility for refund?"
2. Wait for result to appear
**Expected Results**: After status transitions from "idle" → "checking" → "eligible/ineligible", the initial button is no longer visible; spinner replaces it during check; result card replaces spinner after 4 seconds
**Business Rule**: `RefundEligibility` component status state machine: idle → checking → eligible/ineligible
**Suggested Layer**: E2E / Component

---

### TC-509: Booking detail shows "Access Denied" state for 403 errors
**Category**: UI State
**Priority**: P0
**Preconditions**: Another user's booking ID is known
**Steps**:
1. Log in as User B
2. Navigate to `/bookings/:userA_booking_id`
3. Observe the rendered state
**Expected Results**: `EmptyState` with title "Access Denied" and description "You are not authorized to view this booking." renders (not "Booking not found")
**Business Rule**: Frontend checks `error.status === 403` to differentiate Access Denied vs Not Found
**Suggested Layer**: E2E

---

### TC-510: Bookings page pagination UI renders when total exceeds page size
**Category**: UI State
**Priority**: P2
**Preconditions**: API returns `pagination.totalPages > 1`
**Steps**:
1. Navigate to `/bookings` with enough bookings to trigger multi-page response
2. Observe pagination controls
**Expected Results**: `Pagination` component renders with correct `currentPage` and `totalPages`; clicking next page updates URL `?page=N` and loads next page of bookings
**Business Rule**: Pagination in `BookingsContent` driven by `pagination` from API response
**Suggested Layer**: E2E / Component

---

### TC-511: Login and register pages render without the navbar and footer
**Category**: UI State
**Priority**: P2
**Preconditions**: Not logged in
**Steps**:
1. Open `/login`, then `/register`
2. Log in and observe `/`
**Expected Results**: Neither auth page shows the navbar (`nav-home`, `nav-events`) or footer; both appear once logged in
**Business Rule**: `AppShell` hides chrome on `/login` and `/register`
**Suggested Layer**: E2E / Component

---

### TC-512: Login and register buttons show a loading state while submitting
**Category**: UI State
**Priority**: P3
**Preconditions**: On `/login` (or `/register`); network throttled
**Steps**:
1. Submit valid credentials and observe the button before the response arrives
**Expected Results**: Button is in a loading/disabled state and cannot be submitted twice; it returns to normal if the request fails
**Business Rule**: `loading` state in the login and register pages
**Suggested Layer**: Component

---

### TC-513: Failed login with a demo email shows the "create your own account" notice
**Category**: UI State
**Priority**: P2
**Preconditions**: On `/login`
**Steps**:
1. Enter `rahulshetty1@gmail.com` (or `rahulshetty1@yahoo.com`) with a wrong password; submit
2. Repeat with a non-demo email and wrong password
**Expected Results**: Demo email → an inline amber notice with a link to `/register` appears and **no** error toast; non-demo email → error toast and no notice. The notice disappears on the next submit
**Business Rule**: `DEMO_EMAILS` / `demoWarning` in the login page
**Suggested Layer**: E2E / Component

---

### TC-514: Explore links on the login page follow the server feature flag
**Category**: UI State
**Priority**: P2
**Preconditions**: Ability to mock `GET /api/config`
**Steps**:
1. Open `/login` with config `{ showExploreLinks: true }`
2. Open `/login` with `{ showExploreLinks: false }`
3. Open `/login` with the config request failing
**Expected Results**: Links to rahulshettyacademy.com and techsmarthire.com are shown only in case 1; hidden in cases 2 and 3; the login form works in all three
**Business Rule**: `SHOW_EXPLORE_LINKS` → `/api/config` → `showLinks`
**Suggested Layer**: Component / E2E

---

### TC-515: Register password checklist updates as the user types
**Category**: UI State
**Priority**: P2
**Preconditions**: On `/register`
**Steps**:
1. Type `a`, then `aB`, then `aB1`, then `aB1!`, then `aB1!aaaa` in the password field, observing `#password-guidelines`
**Expected Results**: All four items are grey when empty; "One uppercase letter", "One number", "One special character" and "At least 8 characters" turn green one at a time as each is satisfied
**Business Rule**: `PASSWORD_RULES` live checklist
**Suggested Layer**: Component

---

### TC-516: Login ↔ register cross-links
**Category**: UI State
**Priority**: P3
**Preconditions**: Not logged in
**Steps**:
1. On `/login` click the register link; on `/register` click the login link
**Expected Results**: Navigates to `/register` and `/login` respectively; both pages show an API docs link to `{API base}/docs`
**Business Rule**: Flow 1
**Suggested Layer**: E2E

---

### TC-517: Full-screen spinner while the session is being validated
**Category**: UI State
**Priority**: P3
**Preconditions**: Valid token stored; `/api/auth/me` delayed
**Steps**:
1. Load `/events`
**Expected Results**: A centred large spinner is shown and no page content or redirect occurs until `/auth/me` resolves
**Business Rule**: `AuthGuard` `isLoading` branch
**Suggested Layer**: Component

---

### TC-518: ⚠ A logged-in user can still open the login and register pages
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in
**Steps**:
1. Navigate to `/login`
**Expected Results**: ⚠ Discovered behaviour: the login form is shown (no redirect to `/`) and the token is kept. Confirm whether authenticated users should be redirected home
**Business Rule**: `AuthGuard` only guards non-public paths
**Suggested Layer**: E2E

---

### TC-519: Navbar shows the signed-in user and highlights the active section
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; desktop viewport
**Steps**:
1. Inspect `user-email-display` and `logout-btn`
2. Visit `/events`, `/bookings`, `/admin/events`
**Expected Results**: The user's email is shown (truncated visually, full value in the `title` attribute) next to Logout; the matching nav item (Events, My Bookings, Admin) is styled active on each route
**Business Rule**: `Navbar` user area and `isActive`
**Suggested Layer**: E2E / Component

---

### TC-520: Admin dropdown opens, navigates and closes
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; desktop viewport
**Steps**:
1. Click "Admin": menu opens
2. Click outside the menu
3. Open it again and click "Manage Bookings"
**Expected Results**: Menu shows "Manage Events" and "Manage Bookings"; closes on outside click; closes after choosing an item and routes to `/admin/bookings`
**Business Rule**: `Navbar` admin dropdown with outside-click handler
**Suggested Layer**: E2E / Component

---

### TC-521: Mobile navigation drawer
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; viewport narrower than the `md` breakpoint (e.g. 390 px)
**Steps**:
1. Tap the "Toggle menu" button
2. Verify the items, then tap "My Bookings"
3. Reopen the drawer and tap Logout
**Expected Results**: Drawer lists Home, Events, My Bookings, Admin — Events, Admin — Bookings, API Docs, the user's email and Logout; choosing a link navigates and closes the drawer; Logout returns to `/login`. Note: `logout-btn` and `user-email-display` exist in both desktop and mobile markup, so locators must be scoped
**Business Rule**: `Navbar` mobile drawer
**Suggested Layer**: E2E

---

### TC-522: Skeletons while events load
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; `GET /api/events` delayed
**Steps**:
1. Open `/` and `/events`
**Expected Results**: Home shows 6 pulsing card skeletons; events page shows 12; they are replaced by real cards when data arrives
**Business Rule**: `EventCardSkeleton` in `FeaturedEvents` and `EventsContent`
**Suggested Layer**: Component

---

### TC-523: "Clear filters" appears only when a filter is active
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; on `/events` with no filters
**Steps**:
1. Confirm the button is absent
2. Type in search (or pick a category or city)
**Expected Results**: "Clear filters" appears as soon as any of the three controls has a value and disappears when all are empty
**Business Rule**: `hasFilters` in `EventFilters`
**Suggested Layer**: Component / E2E

---

### TC-524: Filters are restored from the URL
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. Open `/events?search=music&category=Concert&city=Mumbai` directly
2. Reload; then use browser Back after changing a filter
**Expected Results**: Search box and both dropdowns are pre-filled from the URL and results match; state survives reload
**Business Rule**: `EventFilters` initialises from `useSearchParams`
**Suggested Layer**: E2E

---

### TC-525: "Featured" marking on static events only
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; one static and one own event
**Steps**:
1. Compare both on `/events`, on their detail pages and in the `/admin/events` table
**Expected Results**: Static event: "Featured" badge on the card, detail page and table, plus the detail-page notice "This is a featured event — always available for practice". Own event: none of these
**Business Rule**: `event.isStatic`
**Suggested Layer**: E2E / Component

---

### TC-526: Category badge on cards and detail page
**Category**: UI State
**Priority**: P3
**Preconditions**: Events in each of the five categories, plus one API-created event with category `Meetup`
**Steps**:
1. View each event's badge
**Expected Results**: Conference, Concert, Sports, Workshop and Festival each have a distinct colour variant; an unknown category still renders its text with the default style
**Business Rule**: `CATEGORY_VARIANT` with `?? 'default'` (API accepts any non-empty category)
**Suggested Layer**: Component

---

### TC-527: Event detail loading spinner
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in; `GET /api/events/:id` delayed
**Steps**:
1. Open `/events/:id`
**Expected Results**: Centred large spinner until data arrives, then the detail layout
**Business Rule**: `isLoading` branch of `EventDetailPage`
**Suggested Layer**: Component

---

### TC-528: Description section is hidden when the event has no description
**Category**: UI State
**Priority**: P3
**Preconditions**: Own event created without a description
**Steps**:
1. Open its detail page
**Expected Results**: No "About this event" heading; the rest of the page renders normally. With a multi-line description, line breaks are preserved
**Business Rule**: `event.description &&` guard; `whitespace-pre-wrap`
**Suggested Layer**: Component

---

### TC-529: Quantity stepper button states
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; event with ≥ 10 seats
**Steps**:
1. Observe "−" at quantity 1
2. Click "+" to 10; observe "+"
3. Click "−" once
**Expected Results**: "−" is disabled at 1; "+" is disabled at the maximum; both are enabled in between; `#ticket-count` always reflects the value
**Business Rule**: Quantity 1–10
**Suggested Layer**: Component / E2E

---

### TC-530: Price summary wording follows the quantity
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in; on an event detail page
**Steps**:
1. Read the summary at quantity 1, then at quantity 2
**Expected Results**: "{price} × 1 ticket" then "{price} × 2 tickets"; Total updates each time
**Business Rule**: Rule 9; pluralisation in `BookingForm`
**Suggested Layer**: Component

---

### TC-531: "Confirm Booking" loading state
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; valid form; `POST /api/bookings` delayed
**Steps**:
1. Click "Confirm Booking"
**Expected Results**: Button shows its loading state until the response; then the confirmation card replaces the form
**Business Rule**: `loading={isPending}`
**Suggested Layer**: Component

---

### TC-532: Booking the same event again requires reopening the page
**Category**: UI State
**Priority**: P3
**Preconditions**: Booking confirmation card is shown
**Steps**:
1. Observe the booking panel
2. Reload the page
**Expected Results**: The panel shows only the confirmation (no form) until the page is reloaded or revisited; after reload a fresh form shows the reduced seat count
**Business Rule**: `confirmed` state in `BookingForm`
**Suggested Layer**: E2E

---

### TC-533: Seat counts refresh on the events list after booking and cancelling
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; event with N seats
**Steps**:
1. Book 2 tickets, click "Browse More Events" (no reload)
2. Cancel the booking from `/bookings`, return to `/events` via the navbar
**Expected Results**: Card shows N − 2 after booking and N after cancelling, without a manual reload
**Business Rule**: Booking mutations invalidate both `['bookings']` and `['events']`
**Suggested Layer**: E2E

---

### TC-534: ⚠ Seat counts after "Clear all bookings" without a reload
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; a booking on an event; `/events` visited within the last 30 seconds
**Steps**:
1. On `/bookings` click "Clear all bookings" and confirm
2. Navigate to `/events` via the navbar immediately
**Expected Results**: Expected: the event shows its restored seat count. ⚠ Risk found in code: clear-all calls `refetch()` on bookings only and does not invalidate `['events']`, so the old count may show until the 30 s stale time passes or the page reloads
**Business Rule**: `handleClearAll` vs. `useCancelBooking` invalidation
**Suggested Layer**: E2E

---

### TC-535: ⚠ Bookings list after deleting an event that had bookings
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; own event with one booking; `/bookings` visited within the last 30 seconds
**Steps**:
1. Delete the event on `/admin/events`
2. Navigate to `/bookings` via the navbar immediately
**Expected Results**: Expected: the booking is gone. ⚠ Risk found in code: deleting an event invalidates only `['events']`, so the cascaded booking may still be listed briefly; opening it shows "Booking not found"
**Business Rule**: `useDeleteEvent` invalidation; cascade delete
**Suggested Layer**: E2E

---

### TC-536: Event form switches between create and edit modes
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; own event on `/admin/events`
**Steps**:
1. Observe the form in its initial state
2. Click "Edit" on the own event
**Expected Results**: Create mode: heading "+ New Event", button "+ Add Event", no "Cancel edit". Edit mode: heading "✏️ Edit Event", all fields pre-filled (date shown in local time), button "💾 Update Event", "Cancel edit" visible, page scrolls to the form, previous validation errors cleared
**Business Rule**: `EventForm` `isEditing`
**Suggested Layer**: Component / E2E

---

### TC-537: Admin events table row states
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; own event exists
**Steps**:
1. Inspect a static row and the own event's row (`event-table-row`)
**Expected Results**: Columns Title, Category, City, Date, Price, Seats, Actions. Static row: "Featured" tag and italic "Read-only", no buttons. Own row: "Edit" and "Delete" buttons. Seats cell shows `available/total` coloured red at 0, amber at ≤ 10, green otherwise. Header shows "N total"
**Business Rule**: Static events are immutable; `AdminEventsPage` table
**Suggested Layer**: E2E / Component

---

### TC-538: Delete-event confirmation dialog
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; own event listed
**Steps**:
1. Click "Delete"
**Expected Results**: Dialog titled "Delete this event?" with "This will permanently delete the event and all associated bookings. This cannot be undone.", buttons "Cancel" and "Delete event"
**Business Rule**: Two-step confirmation; cascade warning
**Suggested Layer**: E2E / Component

---

### TC-539: Admin events loading and pagination
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in; more than 10 visible events
**Steps**:
1. Open `/admin/events` with a delayed API, then let it load
2. Use the table pagination
**Expected Results**: Large spinner while loading; pagination appears only when `totalPages > 1`; changing page does not change the URL (state is local)
**Business Rule**: `AdminEventsPage` `page` state
**Suggested Layer**: Component

---

### TC-540: Admin bookings status filter and empty state
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; at least one booking
**Steps**:
1. On `/admin/bookings` choose "Confirmed", then "Cancelled", then "All Statuses"
**Expected Results**: Confirmed → all bookings; Cancelled → "No bookings found" / "There are no bookings matching your filters." and "0 total bookings" (cancelled bookings are deleted, never stored); All → full list. Changing the filter resets to page 1
**Business Rule**: Status is always "confirmed"; `STATUS_OPTIONS`
**Suggested Layer**: E2E / Component

---

### TC-541: Admin bookings empty state for a user with no bookings
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in; zero bookings
**Steps**:
1. Open `/admin/bookings`
**Expected Results**: "0 total bookings" and the "No bookings found" empty state; no table
**Business Rule**: `bookings.length === 0` branch
**Suggested Layer**: Component

---

### TC-542: Modals close via the X button, Escape and backdrop click
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; a booking exists
**Steps**:
1. On `/admin/bookings` open "View" and close it with the X button
2. Reopen and press Escape
3. Reopen and click the dark backdrop
**Expected Results**: The modal closes each time and no data changes
**Business Rule**: `Modal` close handlers
**Suggested Layer**: Component / E2E

---

### TC-543: Confirmation dialogs cannot be dismissed while the action is in flight
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in; cancel-booking request delayed
**Steps**:
1. Click "Cancel Booking" → "Yes, cancel it"
2. While pending, press Escape and click the backdrop
**Expected Results**: The dialog's "Cancel" button is disabled and the confirm button shows loading; the dialog stays open until the request settles
**Business Rule**: `ConfirmDialog` passes `onClose` only when not loading
**Suggested Layer**: Component

---

### TC-544: Toast behaviour
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. Trigger a success toast (e.g. create an event) and wait
2. Trigger another and click its "Dismiss" (×) button
3. Trigger two toasts in quick succession
**Expected Results**: A toast disappears on its own after about 4.5 seconds; dismiss removes it immediately; multiple toasts stack in the top-right; success is green, error is red; the container is an `aria-live="polite"` region
**Business Rule**: `ToastProvider` / `ToastItem`
**Suggested Layer**: Component

---

### TC-545: "Clear all bookings" is shown even when there are no bookings
**Category**: UI State
**Priority**: P3
**Preconditions**: Logged in; zero bookings
**Steps**:
1. Open `/bookings`
2. Click "Clear all bookings" and accept the confirm
**Expected Results**: The link is visible above the "No bookings yet" empty state; clicking it succeeds silently and the empty state remains (API: "0 booking(s) cleared")
**Business Rule**: Link is rendered unconditionally in `BookingsContent`
**Suggested Layer**: E2E / Component

---

### TC-546: Booking card contents
**Category**: UI State
**Priority**: P1
**Preconditions**: Logged in; one 1-ticket and one 3-ticket booking
**Steps**:
1. Inspect both `booking-card` elements on `/bookings`
**Expected Results**: Each shows the ref (`.booking-ref`), a green "confirmed" badge, `#<id>` (`booking-id`), event title, event date, "1 ticket" / "3 tickets", city, "Booked <date>", total price, and "View Details" and "Cancel Booking" buttons
**Business Rule**: `BookingCard`
**Suggested Layer**: E2E / Component

---

### TC-547: Booking detail page sections
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; a booking exists
**Steps**:
1. Open `/bookings/:id`
**Expected Results**: Sections in order: Event Details, Customer Details, Payment Summary, Refund, Booking Information ("Booked on", "Booking ID #<id>"); header shows the ref, a "confirmed" badge, the event title and a "Cancel Booking" button
**Business Rule**: `BookingDetailPage`
**Suggested Layer**: E2E

---

### TC-548: Pagination control states
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; a list with at least 2 pages (e.g. `/events` with 13+ events)
**Steps**:
1. Observe page 1, go to the last page
2. With a single page of results, look for the control
**Expected Results**: "← Prev" disabled on page 1; "Next →" disabled on the last page; current page has `aria-current="page"`; the control is not rendered when there is only one page
**Business Rule**: `Pagination` component (`totalPages <= 1` → null)
**Suggested Layer**: Component

---

### TC-549: Pagination ellipsis with many pages
**Category**: UI State
**Priority**: P3
**Preconditions**: Component rendered with `totalPages = 10`
**Steps**:
1. Render with `currentPage` 1, 5 and 10
**Expected Results**: Page 1 → `1 2 3 … 10`; page 5 → `1 … 3 4 5 6 7 … 10`; page 10 → `1 … 8 9 10`
**Business Rule**: `buildPages` (delta of 2)
**Suggested Layer**: Unit / Component

---

### TC-550: Events empty state after filtering
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in
**Steps**:
1. On `/events` search for a string that matches nothing
**Expected Results**: "No events found" with "Try adjusting your filters or search terms to find what you're looking for."; no sandbox banner and no pagination; the "Add New Event" button linking to `/admin/events` is still shown below
**Business Rule**: `events.length === 0` branch in `EventsContent`
**Suggested Layer**: E2E / Component

---

### TC-551: Inline form errors clear after a valid resubmit
**Category**: UI State
**Priority**: P2
**Preconditions**: Logged in; a form (booking or event) currently showing validation errors
**Steps**:
1. Correct every field and submit
**Expected Results**: All inline error messages disappear and the request is sent; errors do not clear merely by typing (they are re-evaluated on submit)
**Business Rule**: `setErrors({})` on successful validation
**Suggested Layer**: Component
