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

## Phase 2: Ticket List + Mock Data Decisions

- **Where Data Lives**: Raw fixtures reside in `data/`, normalization in `lib/tickets/`, UI components in `components/tickets/`, and type contracts in `types/`. Raw data is intentionally kept raw and unmodified so edge cases and malicious inputs remain directly testable; the UI layer only ever receives normalized, safely typed tickets.
- **Dataset Scale**: The assignment specifies generating ~5,000 tickets for stress testing, but Phase 2 introduces ~40 deterministic mock tickets combined with the 13 raw test tickets. The full high-scale generator and streaming architecture arrive with the fake API in Phase 8.
- **Duplicate T-2001**: Deduplicated by `external_id`, keeping the first occurrence and dropping subsequent instances. The UI displays a small muted notice ("1 duplicate ticket ignored") so operators are informed without corrupting list keys or counts.
- **Untrusted Customer Content**: Rendered strictly as plain text through React escaping. The brief contains a conflict between "show the body exactly as the customer wrote it, including any HTML formatting" and non-negotiable security requirements. Decision: display the raw HTML source text literally as escaped text without executing or rendering it as HTML (preserving "exactly as written" without stored XSS). This applies to subject, body, and AI summary (T-2002, T-2011).
- **Unsafe Attachment URL (T-2003)**: Only `http:` and `https:` URLs are permitted; unsafe schemes like `javascript:`, `data:`, or `vbscript:` are dropped to `null` and flagged as `unsafe_attachment_url`. Prompt-injection payloads in ticket text are treated as inert strings and never influence priorities or system behavior.
- **Invalid Field Values (T-2004, T-2009)**: Unknown plans ("platinum"), categories ("urgent_billing"), priorities ("P5"), and agents ("agent-99") are sanitized to `null` (or unknown agent tracking), labeled as "Unknown" in the UI, and flagged in `dataIssues`. They are never trusted; the Phase 8 API will reject them on mutations.
- **Invalid Triage Decision (T-2012)**: Unrecognized triage decisions (such as "maybe") fail safe to `manual_review` and are flagged with `invalid_triage_decision`.
- **Status Enum Conflict (T-2010)**: The brief specifies `open`, `in_progress`, and `resolved` for standard transitions, but T-2010 uses `closed` and live updates describe closing a ticket. Decision: `closed` is accepted as a valid terminal status with no further transitions.
- **Timezone Normalization (T-2007, T-2009)**: Timestamps without timezone information (T-2007) are assumed to be UTC and flagged `assumed_utc`. Offset timestamps such as `+05:30` (T-2009) are converted to their exact UTC instant (`03:15:00Z`). All timestamps are formatted in fixed UTC on both SSR and client to prevent hydration mismatches; agent-local timezone conversions can be layered in later phases.
- **Future Dates (T-2008)**: Future created dates are preserved and flagged with `future_created_at`, and sorted after normal chronological tickets so they do not artificially float to the top of the queue.
- **Empty Subject and Body (T-2006)**: Empty subjects are displayed as a muted italic `(No subject)` rather than breaking layout or hiding the row.
- **Long Unbroken Text and RTL Support (T-2005, T-2007)**: Long unbroken strings are truncated with full text preserved in `title` attributes and styled with `break-all`/overflow prevention. Customer text elements include `dir="auto"` to correctly support Arabic and other bidirectional scripts.
- **Accessible Badges**: Priority and status badges use distinct text labels alongside restrained semantic tinting so meaning is never communicated through color alone.
- **Single Scrollable List**: Displays all tickets on one scrollable page without pagination, consistent with intern assignment requirements. Virtualization is deferred to Phase 11 when testing with 5,000 tickets.
- **Static Deadlines in Phase 2**: Deadlines are calculated and displayed as fixed dates; countdown tickers and dynamic late/at-risk/on-track styling are slated for Phase 7.
- **Loading and Error States**: Local mock data is synchronous, so async loading and error UI states are deferred to Phase 8 when HTTP client fetching is implemented; an empty state component is provided for empty queues.
- **Enterprise Minimum Priority Rule**: The rule requiring Enterprise tickets to be at least P1 is not enforced destructively in the raw data layer; it will be validated and enforced by the API in Phase 8 and the review form in Phase 5.
