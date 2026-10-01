# Support Ticket Dashboard

An enterprise-ready customer support ticket dashboard built for support agents to triage, review, claim, and resolve customer tickets with real-time updates and AI-assisted workflows.

## Live Demo

**Live Deployment:** [https://support-ticket-dashboard-phi.vercel.app/](https://support-ticket-dashboard-phi.vercel.app/)

---

## Overview & Key Problems Solved

In high-volume customer support operations, agents struggle with:
1. **Queue Jumps and Context Loss**: Incoming tickets often reshuffle tables while agents are reading. This dashboard queues new arrivals behind a gentle banner notification so work is never interrupted.
2. **SLA Breach Risks**: Visual countdown timers and dynamic status pills ("On track", "At risk", "Late") alert agents before deadlines expire.
3. **Untrusted AI Recommendations**: Generative AI classifications are treated strictly as proposals. Ambiguous or edge-case tickets are routed to a human review queue with mandatory reasoning before updates apply.
4. **Data Race Conditions**: Optimistic concurrency control (`expectedVersion`) prevents conflicting overwrites when multiple agents claim or triage the same ticket.
5. **Malicious Content**: Customer text and AI summaries are rendered as escaped plain text to prevent stored Cross-Site Scripting (XSS), and attachment links are sanitized against malicious schemes (e.g. `javascript:`).

---

## Main Features

- **Ticket Workspace & Search**: High-performance ticket table and mobile stacked list with instant search (debounced at 300ms) and multi-parameter filtering (status, priority, customer plan, category, AI decision).
- **Shareable URL Filter State**: Search queries and active filter configurations are reflected directly in the URL query string for effortless bookmarking and team sharing.
- **Ticket Details & Actions**: Comprehensive ticket view displaying customer information, SLA targets, sanitised attachments, and lifecycle transition controls (`Open` ↔ `In Progress` ↔ `Resolved`).
- **One-Click Ticket Claiming**: Allows agents to claim unassigned tickets with optimistic UI updates and instant conflict detection.
- **AI Human-in-the-Loop Review Queue**: Dedicated `/review` queue for tickets flagged as `manual_review`. Agents can approve AI triage suggestions or override category and priority with a documented rationale.
- **Live SLA Countdowns**: Real-time ticker tracking remaining SLA windows based on ticket priority (P0: 1h, P1: 4h, P2: 24h, P3: 72h). Enters "At risk" when <20% of time remains, and tags "Late" once breached.
- **Bulk Operations**: Multi-select actions bar allowing agents to claim or update status for dozens of tickets simultaneously with real-time batch progress tracking and retry handling.
- **Live Updates & Non-Disruptive Polling**: 10-second background polling for ticket deltas. New tickets appear in a top banner ("N new tickets arrived") rather than shifting the active view.
- **Simulated Chaos Engineering**: Fake API layer simulates real-world conditions (300–1500ms network latency and 10% random 500 errors) to verify UI resilience and error handling.
- **Hardened Security**: Strict plain-text rendering (banned `dangerouslySetInnerHTML`), attachment URL protocol whitelist (`http:`, `https:` only), and HTTP security headers (Content Security Policy, X-Frame-Options, nosniff).

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Route Handlers)
- **UI & Components**: [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) v4, [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Redux Toolkit](https://redux-toolkit.js.org/) (RTK) with `react-redux`
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Testing**: [Vitest](https://vitest.dev/), [@testing-library/react](https://testing-library.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## Requirements & Local Setup

### System Prerequisites
- **Node.js**: `>= 20.0.0` (tested on Node v20/v22)
- **Package Manager**: `npm >= 10.0.0`

### Installation & Running Locally

1. **Clone the repository:**
   ```sh
   git clone https://github.com/RohiniKumari62/support-ticket-dashboard.git
   cd support-ticket-dashboard
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Start the development server:**
   ```sh
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

**No environment variables are required to run the application locally or evaluate the project.** All features, test tickets, and AI triage simulations operate completely offline out of the box.

Optional environment variables can be configured in `.env.local`:

| Variable | Scope | Default | Description |
|---|---|---|---|
| `FAKE_API_CHAOS` | Server-only | `on` | Set to `"off"` to disable simulated 300–1500ms delays and 10% HTTP 500 errors. Recommended for automated tests and Lighthouse audits. |
| `TRIAGE_API_KEY` | Server-only | *None* | Optional secret if connecting a real external AI triage provider. **Never** prefix with `NEXT_PUBLIC_`. |

> **Note on AI Keys**: A real AI provider key is unnecessary for testing. The dashboard includes a fully functional, deterministic simulated AI triage service.

---

## Available Scripts

The following scripts are defined in `package.json`:

| Script | Command | Purpose |
|---|---|---|
| Development | `npm run dev` | Starts local Next.js dev server on port 3000 |
| Production Build | `npm run build` | Compiles optimized production bundle |
| Production Start | `npm run start` | Runs the compiled production server |
| Linting | `npm run lint` | Runs ESLint checks (enforcing security and React rules) |
| Type Check | `npm run typecheck` | Runs TypeScript compiler validation (`tsc --noEmit`) |
| Run Tests | `npm run test` | Runs the full Vitest suite once (`vitest run --passWithNoTests`) |
| Watch Tests | `npm run test:watch` | Starts Vitest in interactive watch mode |

---

## Architecture & Project Structure

```
support-ticket-dashboard/
├── app/                          # Next.js App Router
│   ├── api/                      # Backend Route Handlers (Fake API)
│   │   └── tickets/
│   │       ├── route.ts          # GET list tickets (pagination & filters)
│   │       ├── updates/          # GET delta updates for live polling
│   │       └── [id]/             # GET single ticket
│   │           ├── claim/        # POST claim ticket
│   │           ├── status/       # POST update ticket status
│   │           ├── triage/       # POST submit manual review
│   │           └── retriage/     # POST trigger AI re-triage
│   ├── tickets/                  # Ticket list workspace & [id] detail page
│   ├── review/                   # AI human-in-the-loop review queue
│   ├── layout.tsx                # Root layout with StoreProvider & header
│   └── globals.css               # Design tokens, Tailwind v4 theme, base styles
├── components/
│   ├── layout/                   # AppHeader, AgentSelect, NavLinks
│   ├── tickets/                  # TicketList, TicketTable, TicketListItem, Filters, BulkActionBar
│   ├── review/                   # ReviewQueue, ReviewItem, ChangeReviewForm
│   ├── providers/                # StoreProvider, LiveUpdatesController
│   └── ui/                       # Accessible UI elements (buttons, badges, inputs)
├── data/                         # Seed data generators, test tickets (T-2001 to T-2012), agents
├── lib/
│   ├── api/                      # HTTP ticket client, response parsers
│   ├── server/                   # In-memory TicketStore, seed builder
│   ├── store/                    # Redux Toolkit store, slices (tickets, agent, live, filters)
│   └── tickets/                  # Business logic: SLA countdowns, filters, sanitization, validation
├── tests/                        # 46 Vitest test suites (318 unit, security, & render tests)
├── DECISIONS.md                  # Comprehensive architectural decisions & edge case matrix
├── next.config.ts                # Next.js config, CSP, asset compression, security headers
└── package.json
```

---

## Simulated API (Next.js Route Handlers)

The application simulates a production backend using Next.js Route Handlers with in-memory state:

- **`GET /api/tickets`**: List tickets with cursor-based pagination, text search (`q`), and multi-field filters (`status`, `priority`, `category`, `decision`, `scope=counts`).
- **`GET /api/tickets/[id]`**: Fetch full details for a single ticket.
- **`POST /api/tickets/[id]/claim`**: Assign ticket to an agent. Requires `agentId` and `expectedVersion`.
- **`POST /api/tickets/[id]/status`**: Update ticket status (`open`, `in_progress`, `resolved`). Validates agent assignment and version.
- **`POST /api/tickets/[id]/triage`**: Submit manual review decision (`accept` or `change` with mandatory reason >= 10 chars).
- **`POST /api/tickets/[id]/retriage`**: Trigger server-side AI re-evaluation for ticket classification and summary.
- **`GET /api/tickets/updates`**: Delta updates endpoint for live polling (`since=<ISO timestamp>`).

---

## Testing & Quality Assurance

The codebase is backed by **318 passing automated tests across 46 test files** using Vitest and React Testing Library:

- **Security Tests**: Verified immunity to XSS (`tests/xssRendering.test.tsx`), attachment link protocol whitelist (`tests/safeUrlHarden.test.ts`), and HTTP security headers (`tests/securityHeaders.test.ts`).
- **Edge Case Audit Matrix**: Complete test suite (`tests/auditMatrix.test.ts`) validating all 12 test tickets (T-2001 to T-2012) including duplicates, prompt injection, invalid plans, and malformed dates.
- **Render-Performance Proofs**: Tests in `tests/renderPerformance.test.tsx` verify that mutating a single ticket or advancing the 1s SLA ticker re-renders only the target element without re-rendering sibling rows.
- **Concurrency & Live State**: Optimistic update rollback and race condition recovery verified in `tests/liveEdgeCases.test.ts` and `tests/transitions.test.ts`.

To run all tests:
```sh
npm run test
```

---

## Important Implementation Notes

- **In-Memory Server State**: Because this is a demonstration project, ticket state is maintained in-memory on the server (`globalThis.__ticketStore__`). Serverless cold starts or new deployments will reset ticket state to the initial seed.
- **Simulated Authentication**: The agent selector dropdown in the header simulates switching between active agents (Priya, Rahul, Meera). No real authentication backend or passwords are used.
- **Lighthouse Performance Verification**: When auditing with Lighthouse, set `FAKE_API_CHAOS=off` in `.env.local` and build with `npm run build && npm run start` to measure pure frontend performance without artificial network delays.

---

## Project Decisions & Architecture Documentation

For complete documentation on requirements resolutions, edge cases, data ownership, AI trust, and design tradeoffs, refer to:

👉 **[DECISIONS.md](./DECISIONS.md)**
