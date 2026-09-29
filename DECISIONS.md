# Engineering Decisions

## Project

Support Ticket Dashboard

## Goal

Build a production-style support-agent dashboard based on
the Frontend Intern Assignment.

## Development Strategy

The project is being developed incrementally.

Frontend functionality, testing and deployment will be
completed before introducing the separate Backend + AI
assignment.

## Architecture

The project uses:

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Redux Toolkit

The frontend, shared state, API client, validation,
data and components are separated so the project remains
easy to understand and maintain.

## API Strategy

The fake API will eventually be implemented using
Next.js Route Handlers in the same project.

The UI should communicate through a clear API/data layer
rather than directly depending on implementation details
of the fake data.

## Design

The UI follows DESIGN.md.

The product should look like a realistic internal
support application rather than a generic AI-generated
dashboard.

## Requirement Decisions

This section will be updated whenever an assignment
requirement is unclear, conflicting, unsafe or unrealistic.

| ID | Issue | Decision | Status |
|---|---|---|---|
| U1 | Re-run AI calls the AI service from the browser with NEXT_PUBLIC_TRIAGE_API_KEY, exposing the secret to every visitor. | The browser calls our own POST /api/tickets/:id/retriage. Only the server reads TRIAGE_API_KEY (never NEXT_PUBLIC_). | Decided |
| U2 | "Show body exactly as written including HTML" allows stored XSS. | All customer and AI text (subject, body, summary, review_reason) is rendered as plain text through React escaping, so HTML tags appear literally. No dangerouslySetInnerHTML (the ESLint rule enforces this) and no sanitizer library. | Decided |
| U3 | attachment_url can be javascript: (T-2003). | Make it a link only for http/https. Anything else is shown as inert text with a warning. External links use target="_blank" rel="noopener noreferrer". | Decided |
| U4 | Prompt injection in ticket text (T-2003) and in AI output. | Ticket text is data only. AI output is untrusted and validated. Text can never change behaviour or priority. | Decided |
| U5 | Rules enforced only on screen. | The API is the authority (status transitions, enterprise >= P1, valid agents, valid enums, reason length). The UI mirrors rules only for UX. | Decided |
| C1 | "One page, no next-page click" vs a paginated endpoint, "no duplicates/skips while tickets arrive", about 5,000 rows and Lighthouse >= 90. | Cursor-based API pagination. The UI loads the next chunk automatically on scroll. No offset pagination. | Proposed, Phase 2/8 |
| C2 | Filters "kept in Redux" vs "survive refresh and shareable link". | The URL is the source of truth. Redux holds a synced copy so any component can read it. | Proposed, Phase 3 |
| C3 | "Keep the list up to date" vs "the list must not jump". | New tickets appear behind a "N new tickets - show" banner. Changes to visible tickets update in place without re-sorting. | Proposed, Phase 9 |
| C4 | Lighthouse >= 90 vs artificial 0.3-1.5 s latency and 10% failures. | The page shell renders instantly with skeletons and data loads client-side. Lighthouse is measured on a production build. FAKE_API_CHAOS=off is for tests only. | Proposed, Phase 11 |
| C5 | In-memory data on Vercel serverless can reset or differ between instances. | Keep the store on globalThis. Document the limitation and its effect on live updates. | Decided |
| C6 | Only 3 agents exist, but T-2009 is assigned to agent-99. | Show "Unknown agent (agent-99)". Never count it in anyone's My tickets. The API rejects unknown agents on writes. | Proposed, Phase 10 |
| A1 | Status "closed" (T-2010; "closes a ticket" in live updates) is not in the allowed moves. | closed is terminal. Allowed moves: open -> in_progress -> resolved, and resolved -> open. | Decided |
| A2 | Does Claim change status? | Claim only sets assigned_to. Only unassigned, non-closed tickets can be claimed; otherwise 409. | Proposed, Phase 4 |
| A3 | Who may change status? | Only the assigned agent. | Proposed, Phase 4 |
| A4 | Deadline for resolved or closed tickets. | No late/at-risk state; show "Done". The deadline uses the final priority and is recomputed from created_at when priority changes. | Proposed, Phase 7 |
| A5 | Future created_at (T-2008, year 2027). | Treated as on track and flagged "Future date". Never a negative countdown. | Proposed, Phase 10 |
| A6 | Timestamps: T-2007 has no timezone, T-2009 has +05:30. | The server normalises to UTC ISO. Values without a timezone are assumed UTC. Display in browser local time with the absolute time on hover. | Proposed, Phase 8 |
| A7 | Count definitions. | "My tickets (N)" = assigned to the current agent with status open or in_progress. "To review (N)" = all manual_review tickets not yet handled (global). Counts come from the API, not from loaded rows, because the browser never holds all 5,000 tickets. | Proposed, Phase 6 |
| A8 | What "handled" means in review. | Accept or Change marks the ticket reviewed (reviewed_by/at). It leaves the queue and is never re-queued. The original triage_decision is kept for audit. | Proposed, Phase 5 |
| A9 | Enterprise >= P1 enforcement. | Agent changes to P2/P3 on enterprise tickets are rejected by the API (422 with a clear message). AI re-triage output is clamped to P1 and marked rule_adjusted. | Proposed, Phase 8 |
| A10 | Reason validation. | Trimmed length >= 10 (max 500). Category and priority are validated against fixed lists on both client and server. | Proposed, Phase 5 |
| A11 | Failing requests (1 in 10) and retries. | GETs show an error with a Retry button. Mutations are never auto-retried (avoids double actions). Double-click is guarded. | Proposed, Phase 4 |
| A12 | Route id and duplicates. | :id is the ticket external_id (e.g. T-2001). T-2001 appears twice in the brief; duplicates are removed at seed time and the first occurrence wins. | Proposed, Phase 8 |
| A13 | Invalid AI output (T-2004: category urgent_billing, priority P5, plan platinum, null summary; T-2012: triage_decision "maybe"). | Validated at the API boundary. Invalid values are flagged, not trusted. An unknown decision is treated as manual_review (fail closed). | Proposed, Phase 10 |
| A14 | Search behaviour. | Debounced (about 300 ms), case-insensitive on subject and body (body may be null), stale requests cancelled. | Proposed, Phase 3 |

## Test Ticket Decisions

Each provided test ticket will be handled explicitly
and documented with the reason for the chosen behavior.

| Ticket | Problem | Handling | Why |
|---|---|---|---|

## Time Constraints

The implementation is prioritized according to:

1. Correct functionality
2. Edge cases
3. Security
4. Clean architecture
5. Testing
6. Performance
7. Visual polish

Unnecessary features will not be prioritized.

## Incomplete

This section will be updated during development.

## Phase 1: Shell & Header Decisions

- **Native `<select>` for Agent Selection**: Kept `<select>` native rather than a custom menu component to ensure standard mobile OS select interaction, reduce JS weight, and maintain full keyboard and screen reader accessibility.
- **Header State**: AgentSelect remains uncontrolled with `defaultValue="agent-1"` until Redux store and local persistence are wired in Phase 6.
- **Responsive Layout**: Designed a 2-tier flex-wrap layout for mobile (<640px) that groups brand + agent select on row 1 and navigation + count placeholders on row 2, guaranteeing minimum 40px touch targets and zero horizontal scroll.

## Where Data Lives

filters -> URL (plus Redux copy); current agent -> Redux plus localStorage; tickets and counts -> server, fetched; form inputs -> component state; bulk selection and live-update cursor -> decided in Phases 7 and 9.

## Live Updates Design (filled in Phase 9)

To be filled in.

## Trust in AI Output

AI output is a suggestion, never authority. It is validated, escaped and rule-checked server-side. manual_review always needs a human. Flagged or invalid output goes to human review.

## Skipped and One More Week

To be filled in.

## Where an AI Tool Was Wrong

Prompt 1 assumed a src/ folder, but the project uses a root app/ folder. Noticed by comparing the file explorer with the plan before running it. Fixed with a path-mapping note in every prompt.