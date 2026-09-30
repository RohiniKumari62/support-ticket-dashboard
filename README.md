# Support Ticket Dashboard

Internal support-agent dashboard for triaging, reviewing, claiming, and updating customer tickets.

## Live Demo

**[https://support-ticket-dashboard-phi.vercel.app/](https://support-ticket-dashboard-phi.vercel.app/)**

## Requirements

- Node.js >= 20.0.0
- npm >= 10.0.0

## Setup & Running Locally

```sh
npm install
cp .env.example .env.local
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `TRIAGE_API_KEY` | Server-only secret for external AI triage service (never prefix with `NEXT_PUBLIC_`) |
| `FAKE_API_CHAOS` | Chaos engineering toggle; set to `"off"` to disable random delays and 10% failures for tests and Lighthouse |

## Scripts

- `npm run dev`: Start local Next.js development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint checks (including `react/no-danger` and security rules)
- `npm run typecheck`: Run TypeScript compiler type-checking (`tsc --noEmit`)
- `npm run test`: Run Vitest test suite (`vitest run --passWithNoTests`)
- `npm run test:watch`: Run Vitest in interactive watch mode

## Production Build & Start

```sh
npm run build
npm run start
```

## How to Check Row Redraws Manually

1. Start development server (`npm run dev`) or production server (`npm run start`).
2. Open Chrome DevTools and select the **React Developer Tools** → **Profiler** tab (or **Components** tab settings).
3. In React DevTools Settings (gear icon) → **General**, enable **"Highlight updates when components render"**.
4. Navigate to `/tickets` at [http://localhost:3000/tickets](http://localhost:3000/tickets).
5. Click **Claim** on any ticket in the table:
   - Notice that **only that specific row flashes green**. Other rows do not re-render.
6. Toggle a single checkbox on any row:
   - Only that row (plus the bulk bar and table header checkbox) flashes. Unselected rows do not re-render.
7. Observe the countdown timer in the Deadline column:
   - The countdown ticks every second, but **only the individual DeadlineCell repaints**; the parent row, table, and workspace do not re-render.
8. Automated regression tests for all 5 criteria are verified in `tests/renderPerformance.test.tsx`.

## Lighthouse Audit Procedure

To measure true application performance without interference from simulated network chaos:

1. In `.env.local`, set:
   ```sh
   FAKE_API_CHAOS=off
   ```
2. Build and start the production server:
   ```sh
   npm run build
   npm run start
   ```
3. Open Google Chrome in **Incognito mode** (disabling all extensions).
4. Navigate to `http://localhost:3000/tickets`.
5. Open Chrome DevTools → **Lighthouse** tab.
6. Select **Mobile** form factor and check **Performance**, **Accessibility**, and **Best Practices**.
7. Run the audit 3 times and take the median result.
8. Save the report screenshot to `docs/lighthouse-tickets-mobile.png`.

> **Note on Chaos Mode**: Running Lighthouse with `FAKE_API_CHAOS=on` will reflect artificial 300–1500 ms delays and simulated 500 errors injected by the fake API layer. This measures synthetic network latency rather than React rendering efficiency.

## Security Notes

- **Rendering Model**: All customer-provided text (titles, descriptions, customer names, notes, raw payloads) is rendered strictly as plain text through React JSX children. No `dangerouslySetInnerHTML`, `innerHTML`, or HTML-interpreting parsers are used anywhere in the codebase.
- **Attachment URL Sanitization**: URLs are validated at normalization and rendering time using [`lib/safe-url.ts`](file:///c:/Users/ry679/support-ticket-dashboard/lib/safe-url.ts). Only `http:` and `https:` protocols are permitted. `javascript:`, `data:`, `vbscript:`, and file protocols are rejected. Userinfo/credentials are stripped, control characters are blocked, and lengths are capped at 2048 characters. External links always open with `rel="noopener noreferrer"`.
- **Server Secret Isolation**: `TRIAGE_API_KEY` is isolated to the server route handler runtime. It is never prefixed with `NEXT_PUBLIC_` and never included in client bundles.
- **Client & Server Input Validation**: Incoming ticket payloads undergo runtime shape validation via [`lib/api/parse-ticket.ts`](file:///c:/Users/ry679/support-ticket-dashboard/lib/api/parse-ticket.ts) and server input validators prevent prototype pollution (`__proto__`, `constructor`, `prototype`).
- **Content Security Policy (CSP)**: Strict HTTP security headers are enforced in [`next.config.ts`](file:///c:/Users/ry679/support-ticket-dashboard/next.config.ts), including `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, and `X-Content-Type-Options: nosniff`.
- **Security Tests**: Run `npm test` to execute the complete test suite.
