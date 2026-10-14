import { test, expect } from '@playwright/test';

const BASE_URL      = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL    = 'rahulshetty1@gmail.com';
const USER_PASSWORD = 'Magiclife1!';
// Second account, used only to prove cross-user isolation (TC-200)
const OTHER_USER_EMAIL    = 'rahulshetty1@yahoo.com';
const OTHER_USER_PASSWORD = 'Magiclife1!';

const CUSTOMER = {
  name:  'Test User',
  email: 'testuser@example.com',
  phone: '9876543210',
};

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page, email = USER_EMAIL, password = USER_PASSWORD) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('#login-btn').click();
  // Home page loads after login — "Browse Events →" link confirms successful auth
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
  await expect(page.getByTestId('user-email-display')).toContainText(email);
}

/**
 * Clears all bookings. Safe to call when already empty.
 * Every test starts with this so the account never sits at the 9-booking limit,
 * where a new booking would prune (and could burn seats on a seeded event).
 */
async function clearBookings(page) {
  await page.goto(`${BASE_URL}/bookings`);
  const emptyState  = page.getByText('No bookings yet');
  const clearButton = page.getByRole('button', { name: /clear all bookings/i });
  await expect(emptyState.or(clearButton).first()).toBeVisible();
  if (await emptyState.isVisible()) return;

  page.once('dialog', (dialog) => dialog.accept());
  await clearButton.click();
  await expect(emptyState).toBeVisible();
}

/** Fills the customer fields of the booking form on /events/:id. */
async function fillBookingForm(page) {
  await page.getByLabel('Full Name').fill(CUSTOMER.name);
  await page.getByTestId('customer-email').fill(CUSTOMER.email);
  await page.getByPlaceholder('+91 98765 43210').fill(CUSTOMER.phone);
}

/** A label/value row on the confirmation card, e.g. "Tickets" → "1". */
function confirmationRow(page, label) {
  return page.locator('div').filter({ has: page.getByText(label, { exact: true }) }).last();
}

/** Text the event card shows for a given seat count (mirrors SeatsIndicator). */
function seatsLabel(seats) {
  if (seats === 0) return 'SOLD OUT';
  if (seats <= 10) return `${seats} seat${seats > 1 ? 's' : ''} left!`;
  return `${seats} seats available`;
}

function eventCardByTitle(page, title) {
  return page.getByTestId('event-card').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  }).first();
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('Booking Flow — E2E', () => {

  // TC-020 + TC-402 ──────────────────────────────────────────────────────────
  test('TC-020: books one ticket and shows the confirmation card with a booking ref', async ({ page }) => {
    // -- Step 1: Login and clear state --
    await login(page);
    await clearBookings(page);

    // -- Step 2: Open the first bookable event from the events list --
    await page.goto(`${BASE_URL}/events`);
    const eventCard = page.getByTestId('event-card').filter({
      has: page.getByRole('link', { name: 'Book Now' }),
    }).first();
    await expect(eventCard).toBeVisible();
    const eventTitle = (await eventCard.getByRole('heading').textContent())?.trim() ?? '';
    await eventCard.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);
    await expect(page.getByRole('heading', { level: 1, name: eventTitle })).toBeVisible();

    // -- Step 3: Leave quantity at the default of 1 and capture the price --
    await expect(page.locator('#ticket-count')).toHaveText('1');
    const priceLine = page.getByText(/× 1 ticket$/);
    await expect(priceLine).toBeVisible();
    const eventPrice = ((await priceLine.textContent()) ?? '').split('×')[0].trim();
    console.log(`Booking event: "${eventTitle}" at ${eventPrice}`);

    // -- Step 4: Fill the customer form and confirm --
    await fillBookingForm(page);
    await page.locator('#confirm-booking').click();

    // -- Step 5: Assert the form is replaced by the confirmation card --
    await expect(page.getByRole('heading', { name: /Booking Confirmed!/ })).toBeVisible();
    await expect(page.locator('#confirm-booking')).not.toBeVisible();

    // -- Step 6: Assert booking ref format (first char of event title + 6 alphanumerics) --
    const refEl = page.locator('.booking-ref');
    await expect(refEl).toBeVisible();
    const bookingRef = (await refEl.textContent())?.trim() ?? '';
    console.log(`Booking confirmed. Ref: ${bookingRef}`);
    expect(bookingRef).toMatch(new RegExp(`^${eventTitle[0].toUpperCase()}-[A-Z0-9]{6}$`));

    // -- Step 7: Assert customer, quantity (1) and total (price × 1) --
    await expect(confirmationRow(page, 'Customer')).toContainText(CUSTOMER.name);
    await expect(confirmationRow(page, 'Tickets')).toHaveText('Tickets1');
    await expect(confirmationRow(page, 'Total')).toHaveText(`Total${eventPrice}`);

    // -- Step 8: Assert both follow-up actions are offered --
    await expect(page.getByRole('link', { name: 'View My Bookings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse More Events' })).toBeVisible();
  });

  // TC-533 ───────────────────────────────────────────────────────────────────
  test('TC-533: event card seat count drops after booking and is restored after cancelling', async ({ page }) => {
    // -- Step 1: Login and clear state --
    await login(page);
    await clearBookings(page);

    // -- Step 2: Pick an event with plenty of seats and record its count --
    await page.goto(`${BASE_URL}/events`);
    const firstCard = page.getByTestId('event-card').filter({ hasText: /\d+ seats available/ }).first();
    await expect(firstCard).toBeVisible();
    const eventTitle  = (await firstCard.getByRole('heading').textContent())?.trim() ?? '';
    const seatsText   = (await firstCard.getByText(/\d+ seats available/).textContent()) ?? '';
    const seatsBefore = Number(seatsText.match(/\d+/)?.[0]);
    console.log(`Event: "${eventTitle}", seats before: ${seatsBefore}`);

    // -- Step 3: Book 2 tickets --
    await firstCard.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);
    await page.getByRole('button', { name: '+', exact: true }).click();
    await expect(page.locator('#ticket-count')).toHaveText('2');
    await fillBookingForm(page);
    await page.locator('#confirm-booking').click();
    const refEl = page.locator('.booking-ref');
    await expect(refEl).toBeVisible();
    const bookingRef = (await refEl.textContent())?.trim() ?? '';
    await expect(confirmationRow(page, 'Tickets')).toHaveText('Tickets2');

    // -- Step 4: Return to the list via "Browse More Events" (client-side, no reload) --
    await page.getByRole('link', { name: 'Browse More Events' }).click();
    await expect(page).toHaveURL(`${BASE_URL}/events`);

    // -- Step 5: Assert the card shows 2 fewer seats --
    const eventCard = eventCardByTitle(page, eventTitle);
    await expect(eventCard.getByText(seatsLabel(seatsBefore - 2), { exact: true })).toBeVisible();
    console.log(`Seats after booking: ${seatsBefore - 2}`);

    // -- Step 6: Cancel the booking from the bookings list --
    await page.getByTestId('nav-bookings').click();
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);
    const bookingCard = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(bookingCard).toContainText('2 tickets');
    await bookingCard.getByTestId('cancel-booking-btn').click();
    await expect(page.getByText('Cancel this booking?')).toBeVisible();
    await page.getByTestId('confirm-dialog-yes').click();
    await expect(page.getByText('Booking cancelled successfully')).toBeVisible();
    await expect(bookingCard).not.toBeVisible();

    // -- Step 7: Return to the list via the navbar and assert the seats are restored --
    await page.getByTestId('nav-events').click();
    await expect(page).toHaveURL(`${BASE_URL}/events`);
    await expect(eventCard.getByText(seatsLabel(seatsBefore), { exact: true })).toBeVisible();
    console.log(`Seats after cancelling: ${seatsBefore}`);
  });

  // TC-200 ───────────────────────────────────────────────────────────────────
  test('TC-200: another user opening the booking URL sees "Access Denied"', async ({ page }) => {
    // -- Step 1: Login as User A and clear state --
    await login(page);
    await clearBookings(page);

    // -- Step 2: User A books one ticket --
    await page.goto(`${BASE_URL}/events`);
    const eventCard = page.getByTestId('event-card').filter({
      has: page.getByRole('link', { name: 'Book Now' }),
    }).first();
    await expect(eventCard).toBeVisible();
    await eventCard.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);
    await fillBookingForm(page);
    await page.locator('#confirm-booking').click();
    const refEl = page.locator('.booking-ref');
    await expect(refEl).toBeVisible();
    const bookingRef = (await refEl.textContent())?.trim() ?? '';

    // -- Step 3: User A opens the booking and its detail URL is captured --
    await page.getByRole('link', { name: 'View My Bookings' }).click();
    const bookingCard = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await bookingCard.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+$/);
    await expect(page.getByText('Customer Details')).toBeVisible();
    const bookingUrl = page.url();
    console.log(`User A booking ${bookingRef} at ${bookingUrl}`);

    // -- Step 4: Log out User A and log in as User B --
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await login(page, OTHER_USER_EMAIL, OTHER_USER_PASSWORD);

    // -- Step 5: User B opens User A's booking URL --
    await page.goto(bookingUrl);

    // -- Step 6: Assert access is denied and no booking data is shown --
    await expect(page.getByRole('heading', { name: 'Access Denied' })).toBeVisible();
    await expect(page.getByText('You are not authorized to view this booking.')).toBeVisible();
    await expect(page.getByText(bookingRef)).not.toBeVisible();
    await expect(page.getByText('Customer Details')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).not.toBeVisible();
  });

});
