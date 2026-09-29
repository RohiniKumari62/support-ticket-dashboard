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

## Status

Status: in progress

## Links & Metrics

- Live URL: _[Pending deployment]_
- Lighthouse Score: _[Screenshot to be added after production deployment]_
