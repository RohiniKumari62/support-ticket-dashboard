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

- **Polling Transport with Incremental Cursors**: Live updates operate via an incremental polling mechanism hitting `GET /api/tickets/updates?since=<cursor>&limit=200`. The cursor tracks the server's ISO timestamp (`serverTime`) of the last processed update.
- **Background Event Simulation**: On the server, background events periodically mutate the in-memory ticket store (new tickets arrive, agents close tickets, etc.) with monotonic microsecond timestamps.
- **List Stability & No-Jump Guarantee**: When newly arrived tickets are detected during live polling, they are accumulated into `live.pendingNewIds` without disrupting or re-sorting the active ticket list. A polite banner ("N new tickets available — Show") alerts the user; clicking promotes them cleanly. In-place status or assignment changes update visible tickets immediately without re-sorting or scroll jumps.
- **Active Ticket Modification Protection**: If another agent or background job claims, changes status, or resolves a ticket that the current agent is currently viewing on `/tickets/[id]`, an assertive banner alerts the agent immediately ("Rahul claimed this ticket while you were viewing it.") without discarding the agent's work.
- **Resilient Polling & Exponential Backoff**: `LiveUpdatesController` polls every 5 seconds under normal conditions. On failure, it transitions to `error` and then `retrying`, backing off gracefully (5s → 10s → 20s → capped at 30s) before resuming normal cadence on reconnection.
- **Instance Restart Detection**: Each server instance generates a unique `instanceId`. If a poll returns a different `instanceId` (e.g. server reload or cold start), the client resets its cursor cleanly to avoid missing data or mismatched version counters.

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

## Phase 3: Search + Filters + URL State Decisions

- **URL as Single Source of Truth**: Filter state (q, status, priority, category, decision) lives entirely in the URL query string. No Redux slice for filter state in this phase; the server component reads `searchParams` directly and the `TicketFilters` client component pushes updates via `router.replace`/`router.push`.
- **Server-side Filtering**: Filtering is applied server-side by the `TicketFilters` page in Phase 3 using the mock in-memory data. The same `filterTickets` pure function will be usable in Phase 8 when replaced with API query-string forwarding.
- **parseTicketFilters Safety**: URL parameters are treated as untrusted user input. Unknown enum values silently become `null` (treated as "All"). The `q` parameter is trimmed, has internal whitespace collapsed, and is capped at 100 characters. The function never throws.
- **Native `<select>` for Filters**: Radix/shadcn Select was intentionally skipped. Native `<select>` provides full keyboard nav, mobile OS sheet pickers, and zero JS weight.
- **300 ms Debounce on Search**: The text input updates local React state immediately for responsiveness. A `setTimeout`-based 300 ms debounce controls URL navigation, preventing excessive renders and Next.js transitions. The debounce is cleaned up on unmount. Pressing Enter applies the search immediately.
- **`useTransition` for Non-blocking Navigation**: Filter select changes and debounced search pushes are wrapped in `startTransition` so they never block high-priority UI interactions; the `aria-busy` attribute signals loading to assistive technologies.
- **Two Empty States**: `TicketList` distinguishes "no tickets at all" (global empty state) from "no tickets match the active filters" (filter empty state). The filter empty state includes a "Clear filters" link back to `/tickets`.
- **`serializeTicketFilters` Stable Order**: Params are written in a fixed order (`q, status, priority, category, decision`) so serialized URLs are deterministic and comparable in tests.
- **Searchable Fields**: Only `subject` and `body` are searched per assignment spec (A14). The `summary`, `reviewReason`, and customer ID are intentionally excluded.
- **Null-body Safety**: `filterTickets` checks `ticket.body != null` before calling `.toLowerCase()`, preventing crashes on tickets with null bodies (e.g. T-2006).
- **Result Count Bar**: A `role="status" aria-live="polite"` paragraph shows "Showing N of M tickets" when any filter is active, or "Showing N tickets" when no filter is active, replacing the previous per-component count display.
- **DECISION_LABELS Re-export**: `TRIAGE_DECISION_LABELS` and `getTriageDecisionLabel` were added to `lib/tickets/labels.ts` to match the pattern for status/priority/category, keeping all display-name logic in a single file.

## Phase 4: Ticket Details + Ticket Actions Decisions

- **Customer Content Plain-Text Rendering**: Customer text (subject, body, AI summary, review reason) is rendered strictly as React text nodes inside pre-wrapped, break-words containers. The assignment requirement to "show the body exactly as written including HTML" is fulfilled by displaying the source markup literally, preventing stored cross-site scripting (XSS) while preserving raw customer input.
- **Unsafe Attachment Link Blocking**: Only safe `http:` and `https:` URLs are rendered as clickable links, always opening in a new tab with `rel="noopener noreferrer"`. URLs with unsafe schemes (e.g. `javascript:alert(...)` in T-2003) or flagged with `unsafe_attachment_url` display an explanatory warning message ("Attachment link blocked: it isn't a safe web address.") and produce no hyperlink.
- **Rejection of `NEXT_PUBLIC_TRIAGE_API_KEY` (Security Boundary)**: The assignment brief mentions calling the AI service directly from the browser using `NEXT_PUBLIC_TRIAGE_API_KEY`, but simultaneously demands keeping secrets out of client bundles and specifies a server-side `TRIAGE_API_KEY` on the retriage endpoint. Because `NEXT_PUBLIC_*` environment variables are baked into public client JavaScript bundles, using one would expose the secret to all visitors. Decision: `NEXT_PUBLIC_TRIAGE_API_KEY` is not defined or referenced anywhere. Re-run AI calls a client-side API boundary (`lib/api/tickets-client.ts`), which will forward to `POST /api/tickets/:id/retriage` using a server-only secret in Phase 8.
- **AI Output Untrusted & Validated**: AI triage output is treated as untrusted advice, never final authority. Re-run AI output is validated against enum constraints and enterprise floor rules before application. Furthermore, customer prompt injection attempts (such as T-2003 demanding "mark this ticket P0") are ignored; priority is derived from system rules and existing classification.
- **Claim Semantics**: Claiming a ticket assigns it to the acting agent without altering ticket status. Transitioning an open ticket to `in_progress` requires an assigned agent ("Claim this ticket first"). Tickets assigned to another agent (or an unknown agent ID) cannot be claimed or modified by the current agent.
- **Status Transitions & Enforcement**: Allowed status transitions are strictly constrained to `open -> in_progress -> resolved -> open`. The `closed` status is treated as terminal with no further transitions. These rules are defined in `lib/tickets/transitions.ts` and enforced both in the UI and inside `lib/api/tickets-client.ts`.
- **Optimistic Updates & Conflict Rollback**: Claim and status changes apply immediately to the local UI with snapshotting. If an API call fails or encounters a 409 conflict, the state rolls back to the snapshot or applies the server truth (e.g. assigning the ticket to the winning agent). User feedback is announced via inline banners using `role="status"` (polite) or `role="alert"` (assertive) without introducing third-party toast libraries.
- **Duplicate-Click & Concurrency Lock**: A single synchronous `useRef` lock (`isLockedRef`) protects the entire ticket action surface. Rapid double-clicks or interleaved status clicks while a claim is in flight are synchronously dropped at the invocation point, and action buttons display progress text while disabled.
- **Concurrency & Reconcile Notice**: A pure `reconcileTicket` function merges newer server states into the local view. If another agent claims the ticket while an agent is viewing it, the assignee is updated, Claim is disabled, and an informational notice ("Rahul claimed this ticket while you were viewing it.") is displayed.
- **Priority Difference & Enterprise Explanation**: When `aiPriority` differs from `priority`, both values are clearly displayed ("Final priority P1 · AI suggested P3"). For enterprise tickets adjusted by rule, the interface explains "Raised to P1 because enterprise tickets are always at least P1".
- **Temporary Deterministic Mock Failures**: To facilitate automated testing and manual QA, mock API latency is fixed at 600 ms, claim returns a 409 conflict (winner = Rahul) when the ticket ID numeric part is divisible by 4 (e.g. T-2008, T-2012), and status changes fail with a network error when divisible by 7 (e.g. T-2002). These rules are temporary and isolated to `lib/api/tickets-client.ts`.
- **Temporary Current Agent**: Current agent identity is supplied via a temporary constant `CURRENT_AGENT_ID = "agent-1"` (Priya) in `lib/agents/current-agent.ts`, passed down to the client component as a prop until the global header selector and Redux store are wired in Phase 6.
- **Local Component State Persistence**: Detail-page mutations live strictly in local React component state and reset on navigation/refresh. Cross-page consistency is deferred to the in-memory API and Redux in Phases 6 and 8.
- **Back Navigation & Filters**: The top back link points directly to `/tickets`. Filter state preservation across visits is supported by native browser Back/Forward navigation.
- **Static Deadlines**: Deadlines on the detail page are calculated and displayed statically as UTC timestamps; live countdowns and late/at-risk styling arrive in Phase 7.
- **Resilient Route Param Handling**: Route parameters in `/tickets/[id]` are safely decoded with length capped at 64 characters. Malformed URI sequences or unrecognized ticket IDs immediately trigger Next.js `notFound()`, rendering the dedicated ticket not-found page without crashing.

## Phase 5: AI Review Queue Decisions

- **Queue Selection & Integrity**: The review queue lists tickets where normalized `triageDecision === "manual_review"` and `humanReview === null`. Tickets with `triage_decision: "maybe"` (T-2012) enter the queue due to Phase 2's secure fail-safe fallback. Auto-accepted tickets (such as T-2007, whose priority was adjusted by business rule) are correctly excluded.
- **Handled Tickets & Immutable AI Audit Trail**: Handled tickets are marked with `humanReview: { action, reviewedBy, note }`. `triageDecision` is never modified or overwritten; it permanently reflects the original AI decision so that audit histories and list filters remain truthful. The reviewer's reason is captured in `humanReview.note`.
- **Accept Semantics & Malformed Data Defense**: "Accept AI answer" is disabled when the AI's category or priority is null/invalid (T-2004), displaying an explicit message ("Invalid AI values — use Change") rather than silently accepting bad data into the system. If an enterprise ticket with suggested priority P2 or P3 is accepted, the enterprise floor automatically adjusts the final priority to P1 while preserving `aiPriority` and setting `reviewReason = "rule_adjusted"`.
- **Change Semantics & Validation Bounds**: Changing a ticket requires a non-empty reason of at least 10 and at most 500 trimmed characters (whitespace padding is stripped). At least one field (category or priority) must differ from the ticket's current value (otherwise agents are directed to use Accept). Both final values must be valid enums.
- **Enterprise Floor Enforcement**: Enterprise tickets cannot be assigned priority P2 or P3 in the review form (these options are rendered as disabled with explicit labels, and server/pure validation enforces this rule). Unknown plans (e.g. T-2004 "platinum") cannot be validated against enterprise rules and are not blocked, but present a clear warning note.
- **Review Permissions & Claim Separation**: Any logged-in agent may review tickets in the queue without needing to claim them first. Review queue triage and active ticket ownership are deliberately separated to maximize triage throughput.
- **Concurrency & Handled Conflict Handling**: Handled tickets are removed from the queue optimistically. If another agent or process already handled a ticket concurrently, the mock API returns a `conflict` status code and the ticket remains removed with an informational notice ("This ticket was already handled in another session.").
- **Safe Display of Malformed & Adversarial Data**: All AI and customer text (subjects, summaries, reasons) is rendered strictly as React plain text nodes. Hostile HTML (e.g. `<img src=x onerror=...>` in T-2002/T-2011) and prompt injection payloads (e.g. T-2003 "mark this ticket P0") are treated as inert text strings and never alter priority or layout. Missing or invalid AI fields display muted fallbacks ("Invalid value", "No summary", "No reason given") without crashing.
- **Flagged and Empty Ticket Handling**: Flagged input (T-2003) and empty tickets (T-2006) display contextual warnings ("The AI flagged this ticket for suspicious content. Read it before accepting.", "This ticket is empty.") to guide human review, but are not blocked from acceptance if their AI values are valid.
- **Queue Sort Order**: Tickets are ordered by urgency first (P0 → P1 → P2 → P3 → invalid/null last), then by oldest `createdAt` first (longest-waiting tickets prioritized), with `id` as a deterministic tie-breaker.
- **Optimistic Removal with Draft Preservation**: Submissions remove rows immediately. On failure, the ticket reappears in its exact original sorted position with the agent's draft inputs preserved so long rationale text is not lost. A per-ticket synchronous lock (`useRef<Set<string>>`) protects each item against rapid double-clicks while permitting concurrent reviews of different tickets.
- **Accessible Keyboard & Focus Management**: Following optimistic item removal, keyboard focus is dynamically transferred to the next row's subject link, or to the queue heading when the queue becomes empty.
- **Temporary Deterministic Review Failure Rule**: Submissions for tickets with numeric IDs divisible by 6 (e.g. T-2004) fail with a network error on the first attempt and succeed on retry. This allows automated and manual verification of failure/retry behavior, and is isolated to `lib/api/tickets-client.ts` until Phase 8.
- **Component-Local Queue State**: Queue state lives in React hook state in Phase 5 and resets on refresh; cross-page synchronization and store persistence arrive with Redux (Phase 6) and the fake API (Phase 8).

## Phase 6 & Phase 7: Redux State + Agent State + Live Deadlines + Bulk Actions Decisions

- **Redux Toolkit Architecture**: Unified Redux store (`makeStore`) housing `tickets`, `agent`, and `filters` slices, made accessible via `<StoreProvider>`. Store instance is initialized once per client session using lazy `useState` initialization seeded with SSR data (`ticketsSeeded`), avoiding ref-during-render issues under React compiler rules.
- **Global Agent State & Hydration Safety**: Current agent identity (`currentAgentId`) lives in `agentSlice`, defaulting to `"agent-1"` (Priya) with `"agent-2"` (Rahul) and `"agent-3"` (Meera) as options. Agent selections are persisted to `localStorage` under key `support_ticket_dashboard_agent_id` and hydrated safely on client mount via `agentHydrated`. Header badge counters ("My tickets: N", "To review: M") display a placeholder (`—`) during SSR/initial render to eliminate React hydration mismatch warnings.
- **Optimistic Thunks with Per-Ticket Lock**: All mutations (`claimTicketThunk`, `changeStatusThunk`, `reviewTicketThunk`, `retriageTicketThunk`) run through Redux `createAppAsyncThunk`. In-flight operations are tracked in `state.inFlight[ticketId]`, and the thunk's `condition` callback synchronously drops duplicate dispatches on the same ticket while an operation is pending.
- **Authoritative Server Conflict Reconciliation**: On rejection, `ticketsSlice` restores the ticket from its pre-mutation snapshot, or applies the authoritative server ticket state if provided by the error response (e.g. 409 conflict where another agent claimed the ticket).
- **Module-Level Shared SLA Ticker**: `lib/tickets/ticker.ts` provides a single module-singleton ticker interval running at 1000 ms only when active listeners exist (subscriber count > 0). Components subscribe via `subscribeTicker()`; when all components unmount, the timer is cleared immediately. Zero per-row intervals prevents timer drift and minimizes CPU usage.
- **Live SLA Deadlines (`DeadlineCell`)**: Computes remaining time dynamically via `computeDeadline(createdAt, priority)` and categorizes status into `on_track` (> 1h), `at_risk` (<= 1h), or `late` (<= 0s). Resolved and closed tickets display a neutral static completion label ("Resolved" / "Closed") without countdowns or late styling.
- **Bulk Action Eligibility & Limits**: Bulk actions (`claim`, `status`) are capped at `MAX_BULK_SELECTION = 50` tickets. Eligibility is computed per ticket via pure rules in `lib/tickets/bulk.ts`: claiming requires an unassigned ticket not already owned by the agent; status updates require the ticket to already be assigned to the acting agent and follow valid state transitions. Ineligible tickets are marked `skipped` with clear explanations.
- **Bulk Execution & Retry Panel**: `bulkRunThunk` executes actions sequentially with live progress (`done / total`), reporting itemized results (`success`, `skipped`, `failed`). Results are presented in `BulkResultPanel` with error details, live dismissal, and a targeted "Retry failed" action that only re-runs failed items without duplicating successful ones.
- **Selection Isolation on Agent Switch**: When the active agent changes in `AppHeader`, any active bulk selection and bulk result panel are cleared immediately, preventing accidental actions under an unintended agent identity.

## Phase 8 & Phase 9: Fake API, Route Handlers & Live Updates Decisions

- **In-Memory Store Singleton (`TicketStore`)**: In-memory ticket storage resides on `globalThis.__ticketStore__` (`lib/server/get-store.ts`) preserving mutated ticket state across Next.js Turbopack HMR recompilations in development and serverless invocations within the same container.
- **Seeded Scale & Deduplication**: The store is initialized with ~5,000 deterministic tickets generated by `buildSeed` in `lib/server/seed.ts`, embedding all 13 canonical assignment test tickets (T-2001 to T-2012). Duplicates (such as duplicate T-2001) are resolved at seed time keeping first occurrence, with count recorded in `duplicatesRemoved` and reported in API responses.
- **Next.js App Router Route Handlers**:
  - `GET /api/tickets`: Cursor-based pagination (`cursor=<id>&limit=<n>`), full text query (`q`), filters (`status, priority, category, decision`), and total count computation.
  - `GET /api/tickets/[id]`: Retrieval of single ticket with `notFound` fallback (404). In Next 15+, route `params` is handled as an awaited Promise (`await params`).
  - `POST /api/tickets/[id]/claim`: Atomic claim with 409 conflict detection, idempotency check, and version increments.
  - `PATCH /api/tickets/[id]/status`: Enforces assignment requirement (`claim_required`), assignee verification (`not_assignee`), valid lifecycle transitions (`open -> in_progress -> resolved -> open`), and enterprise priority invariants.
  - `POST /api/tickets/[id]/triage`: Manual review triage endpoint supporting `accept` and `change` with length validation and enterprise floor enforcement.
  - `POST /api/tickets/[id]/retriage`: Re-runs AI triage server-side with simulated latency and validation; prevents leaking AI API keys to client bundles.
  - `GET /api/tickets/updates`: Incremental delta endpoint (`since=<iso>&limit=<n>`) returning newly arrived and updated tickets with instance identification.
- **Client API Adapter (`HttpTicketsApiClient`)**: Seamless drop-in replacement implementing `TicketsApiClient` interface over native `fetch`. In browser environments, store thunks dispatch HTTP calls to Route Handlers, while integration tests can test mock or HTTP implementations interchangeably.
- **Zero New Runtime Dependencies**: Implemented strictly using Next.js 16 built-in Web standard APIs (`Request`, `Response`, `NextResponse`, `fetch`, `ReadableStream`, `Headers`) and native TypeScript types without external schema libraries (no zod), external query managers (no SWR/TanStack Query), or extra helper packages.
- **Live Polling Controller (`LiveUpdatesController`)**: Mounted once in root layout (`app/layout.tsx`) under `<StoreProvider>`. Polls `GET /api/tickets/updates?since=<cursor>` periodically, syncing server updates into Redux:
  - Updates existing tickets in place without disrupting list scroll position or active focus.
  - Newly arrived tickets buffer quietly into `live.pendingNewIds`, triggering the non-intrusive new tickets banner.
  - Active ticket view (`/tickets/[id]`) detects foreign claims and raises the concurrency alert banner immediately.

## Phase 10: Security, Edge Cases & Test Tickets

### Trust Model

Customer-submitted ticket content (subject, body, summary) is treated as **untrusted user input** at all rendering and processing boundaries:

- **Rendering**: All ticket text is rendered as plain text via React's default JSX escaping. No `dangerouslySetInnerHTML` is used anywhere in the application. Unicode bidirectional override characters are neutralised with `unicode-bidi: plaintext` CSS on all text containers.
- **URLs**: Attachment URLs are validated by `lib/safe-url.ts` at normalisation time (server-side) and by the client before rendering as anchor tags. Only `http:`/`https:` schemes are allowed; credentials, protocol-relative `//`, and control characters are rejected. Maximum URL length is capped at 2,048 characters.
- **Server secret isolation**: `TRIAGE_API_KEY` is read only inside Route Handlers and `lib/server/` code; it is never imported from `lib/api/` or any client bundle. A source scan test (`tests/sourceSecurityScan.test.ts`) statically verifies no `TRIAGE_API_KEY` string appears in client-facing source files.

### Content Security Policy (next.config.ts)

Applied on `/:path*` (every route):

| Directive | Value (production) |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev for HMR) |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data:` |
| `font-src` | `'self' data:` |
| `connect-src` | `'self'` (+ `ws: wss:` in dev for HMR) |
| `object-src` | `'none'` |
| `base-uri` | `'self'` |
| `form-action` | `'self'` |
| `frame-ancestors` | `'none'` |
| `upgrade-insecure-requests` | (production only) |

Additional headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, payment, usb all denied).

`'unsafe-inline'` in `script-src` is required by Next.js's built-in inline chunk strategy.

### Server-Side Input Guards

- **Prototype pollution prevention**: `parseTicketId` and `parseListQuery` in `lib/server/validation.ts` reject `__proto__`, `constructor`, and `prototype`. The Redux `tickets-slice.ts` applies the same guard before writing to `byId`.
- **Empty-ticket retriage guard** (retriage route): Returns 422 `unprocessable` when both `subject` and `body` are blank, without calling the triage service.
- **Human-reviewed overwrite guard** (retriage route): Returns 409 `already_reviewed` when `ticket.humanReview !== null`, preventing AI from overwriting a human decision.
- **Unknown-assignee claim guard** (ticket store): Returns 409 `conflict` when `ticket.assignedToUnknown` is set.

### Client-Side API Runtime Guard (lib/api/parse-ticket.ts)

Every ticket entering Redux state from the HTTP layer is validated by `parseTicket`:

- `id`: must match `/^[A-Za-z0-9_-]{1,64}$/`; prototype-pollution keys rejected.
- `version`: positive integer only.
- Enum fields (`status`, `priority`, `plan`, `category`, `triageDecision`): allowlist-only.
- String lengths: `body ≤ 20,000`, `subject ≤ 2,000`, `summary ≤ 2,000` characters.
- ISO 8601 date fields validated with `Date.parse`.
- `humanReview.action`: wire values `"accept"` and `"change"` are normalised to `"accepted"` and `"changed"`.
- Invalid items are dropped with a counter and never enter Redux state.

### Test Ticket Handling Table (T-2001 to T-2012)

| ID | Scenario | Expected Behaviour |
|---|---|---|
| T-2001 (×2) | Duplicate external ID in seed | Deduplicated; one entry in store; `duplicatesRemoved = 1` |
| T-2002 | XSS in subject/body | Rendered as plain text; no `<img onerror=…>` element in DOM |
| T-2003 | Prompt injection + `javascript:` attachment URL | Priority stays P3; attachment URL rejected as unsafe |
| T-2004 | Invalid plan + priority + category | Normalised with multiple `dataIssues`; rendered safely |
| T-2005 | Very long subject (underscores) | Truncated in table; full text in detail view |
| T-2006 | Empty subject + null body | 422 `unprocessable` on retriage; flagged `manual_review` |
| T-2007 | Arabic + emoji subject; no-timezone date; enterprise | Date flagged `assumed_utc`; enterprise floor raises AI P3 → P1 |
| T-2008 | Future `created_at` (2027) | Flagged `future_created_at`; processed normally otherwise |
| T-2009 | Unknown `assigned_to` | Flagged `invalid_agent`; claim returns 409 |
| T-2010 | Closed status | 409 `invalid_transition` on retriage |
| T-2011 | Human-reviewed ticket | 409 `already_reviewed` on retriage |
| T-2012 | Missing `created_at` (null) | Flagged `invalid_created_at`; deadline cell shows "—" |

### Test Suite Coverage (Phase 10)

10 new test files, 72 new tests added:

| File | Focus |
|---|---|
| `tests/safeUrlHarden.test.ts` | URL allowlist edge cases |
| `tests/parseTicketGuard.test.ts` | Client runtime ticket validation |
| `tests/auditMatrix.test.ts` | Per-ticket normalisation outcomes (T-2001 – T-2012) |
| `tests/xssRendering.test.tsx` | DOM confirms no `<img onerror>` is constructed |
| `tests/apiValidationMatrix.test.ts` | Route-level input validation |
| `tests/retriageSecurity.test.ts` | Retriage guards (triage service mocked for determinism) |
| `tests/duplicateSafety.test.ts` | Deduplication at seed, pagination, Redux, live polling |
| `tests/liveEdgeCases.test.ts` | Header counts for edge-case tickets |
| `tests/securityHeaders.test.ts` | CSP in prod vs dev via `vi.stubEnv` |
| `tests/sourceSecurityScan.test.ts` | Static scan: `TRIAGE_API_KEY` absent from client files |

### Intentional Omissions

- **No DOMPurify**: React renders all content as text nodes by default; no HTML rendering intended.
- **No nonce-based CSP**: Requires Next.js middleware plumbing; deferred.
- **No real authentication**: Agent switcher is a UI simulation; auth is Phase 11 scope.
- **`'unsafe-inline'` in script-src**: Required by Next.js's inline hydration chunks.
