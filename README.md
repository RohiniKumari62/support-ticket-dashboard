# Support Ticket Dashboard

Internal support-agent dashboard for triaging, reviewing, claiming, and updating customer tickets.

## Requirements

- Node.js >= 20.0.0
- npm >= 10.0.0

## Setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `TRIAGE_API_KEY` | Server-only secret for external AI triage service (never prefix with `NEXT_PUBLIC_`) |
| `FAKE_API_CHAOS` | Chaos engineering toggle; set to `"off"` to disable random delays and 10% failures for tests |

## Scripts

- `npm run dev`: Start local Next.js development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint checks (including `react/no-danger`)
- `npm run typecheck`: Run TypeScript compiler type-checking (`tsc --noEmit`)
- `npm run test`: Run Vitest test suite (`vitest run --passWithNoTests`)

## Folder Overview

- `app/`: Next.js App Router pages and layouts (no `src/`)
- `components/`: Reusable React components (`layout/`, `tickets/`, `tickets/detail/`, `review/`, `ui/`)
- `store/`: Redux Toolkit store and feature slices
- `lib/`: API client wrappers (`lib/api/tickets-client.ts`), normalization and helpers (`lib/tickets/`, `lib/tickets/transitions.ts`), utilities
- `data/`: Seed data, test tickets, and mock data (`data/`)
- `types/`: Shared TypeScript types and interfaces (`types/ticket.ts`)
- `validation/`: Plain TypeScript validators and business rules (no Zod)
- `tests/`: Vitest test files

## Temporary Mock Failure Rules (Manual Testing)

During Phases 4 & 5, `lib/api/tickets-client.ts` uses deterministic mock failure rules with fixed 600 ms latency:
- **Claim conflict (409)**: Triggered when the numeric portion of the ticket ID is divisible by 4 (e.g. `T-2008`, `T-2012`), returning winner `agent-2` (Rahul).
- **Status network failure**: Triggered when the numeric portion of the ticket ID is divisible by 7 (e.g. `T-2002`).
- **Review network failure**: Triggered when the numeric portion of the ticket ID is divisible by 6 (e.g. `T-2004`, `T-2010`, `T-2016`, `T-2022`). Fails on the first attempt with a simulated network error and succeeds on subsequent retries.
These rules will be replaced by the fake API with chaos controls in Phase 8.

## Security Notes

- **Rendering Model**: All customer-provided text (titles, descriptions, customer names, notes, raw payloads) is rendered strictly as plain text through React JSX children. No `dangerouslySetInnerHTML`, `innerHTML`, or HTML-interpreting parsers are used anywhere in the codebase.
- **Attachment URL Sanitization**: URLs are validated at normalization and rendering time using [`lib/safe-url.ts`](file:///c:/Users/ry679/support-ticket-dashboard/lib/safe-url.ts). Only `http:` and `https:` protocols are permitted. `javascript:`, `data:`, `vbscript:`, and file protocols are rejected. Userinfo/credentials are stripped, control characters are blocked, and lengths are capped at 2048 characters. External links always open with `rel="noopener noreferrer"`.
- **Server Secret Isolation**: `TRIAGE_API_KEY` is isolated to the server route handler runtime. It is never prefixed with `NEXT_PUBLIC_` and never included in client bundles.
- **Client & Server Input Validation**: Incoming ticket payloads undergo runtime shape validation via [`lib/api/parse-ticket.ts`](file:///c:/Users/ry679/support-ticket-dashboard/lib/api/parse-ticket.ts) and server input validators prevent prototype pollution (`__proto__`, `constructor`, `prototype`).
- **Content Security Policy (CSP)**: Strict HTTP security headers are enforced in [`next.config.ts`](file:///c:/Users/ry679/support-ticket-dashboard/next.config.ts), including `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, and `X-Content-Type-Options: nosniff`.
- **Security Tests**: Run `npm test` to execute the complete test suite, including dedicated security test suites:
  - `tests/safeUrlHarden.test.ts` — Safe URL validation & protocol injection prevention
  - `tests/parseTicketGuard.test.ts` — Client-side runtime validation & malformed payload rejection
  - `tests/xssRendering.test.tsx` — JSX text rendering & XSS payload safety
  - `tests/auditMatrix.test.ts` — T-2001 through T-2012 test ticket safety audit
  - `tests/apiValidationMatrix.test.ts` — Route handler input validation & prototype pollution
  - `tests/retriageSecurity.test.ts` — Retriage route handler access, 422 empty guard, and 409 conflict
  - `tests/duplicateSafety.test.ts` — Store ID deduplication & collision prevention
  - `tests/securityHeaders.test.ts` — CSP and HTTP response headers verification
  - `tests/sourceSecurityScan.test.ts` — Static AST scan verifying absence of `dangerouslySetInnerHTML`

## Status

Status: in progress

## Links & Metrics

- Live URL: _[Pending deployment]_
- Lighthouse Score: _[Screenshot to be added after production deployment]_
