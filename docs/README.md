# Lighthouse Verification & Screenshots

This directory stores performance audit artifacts for the Support Ticket Dashboard.

## Screenshot File
- **Target File**: `docs/lighthouse-tickets-mobile.png`
- **Target Route**: `http://localhost:3000/tickets` (Mobile form-factor)

## Procedure to Run
1. Set chaos to off in `.env.local`:
   ```sh
   FAKE_API_CHAOS=off
   ```
2. Build and start production server:
   ```sh
   npm run build
   npm run start
   ```
3. Open Google Chrome Incognito (extensions disabled).
4. Navigate to `http://localhost:3000/tickets`.
5. Open Chrome DevTools → **Lighthouse** tab.
6. Select **Mobile** mode and check **Performance**, **Accessibility**, and **Best Practices**.
7. Run the audit 3 times and record the median scores.
8. Capture a full-page screenshot of the report and save it as `docs/lighthouse-tickets-mobile.png`.
