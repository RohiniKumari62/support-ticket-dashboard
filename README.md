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
- `components/`: Reusable React components (`layout/`, `tickets/`, `review/`, `ui/`)
- `store/`: Redux Toolkit store and feature slices
- `lib/`: API client wrappers and utilities
- `data/`: Seed data and in-memory ticket store
- `types/`: Shared TypeScript types and interfaces
- `validation/`: Plain TypeScript validators and business rules (no Zod)
- `tests/`: Vitest test files

## Status

Status: in progress

## Links & Metrics

- Live URL: _[Pending deployment]_
- Lighthouse Score: _[Screenshot to be added after production deployment]_
