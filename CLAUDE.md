# Support Ticket Dashboard - Claude Instructions

## Project

Support Ticket Dashboard

This is a Frontend Intern assignment for building a
support-agent ticket management application.

## Source of Truth

The official Frontend Intern Assignment PDF is the primary
source of requirements.

Do not silently invent or change requirements from the PDF.

If a requirement is unclear, conflicting, unsafe or
unrealistic:

1. identify it
2. explain the issue
3. propose a sensible decision
4. document the decision in DECISIONS.md

## Development Strategy

The project is being developed frontend-first.

The current priority is:

1. Build frontend
2. Test frontend
3. Fix edge cases
4. Run production build
5. Check performance
6. Deploy to Vercel
7. Verify production application
8. Only then introduce the separate Backend + AI assignment

Do not start implementing the separate backend assignment
until the frontend phase is completed and verified.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Redux Toolkit

## Architecture

Keep the architecture simple and understandable.

Separate:

- pages
- reusable UI components
- Redux state
- API client
- validation
- ticket data
- types
- tests

Do not put the entire application into one component.

Do not create unnecessary tiny files.

Do not overengineer the application.

## UI Direction

Follow DESIGN.md.

The UI must look like a real support-agent product.

It should be:

- simple
- professional
- attractive
- practical
- information-focused
- easy to scan

It should NOT look like:

- AI-generated/vibe coding
- generic SaaS landing page
- futuristic AI dashboard
- analytics dashboard
- portfolio design
- excessive gradients
- glassmorphism
- excessive cards
- excessive animations

## Important Development Rule

Do not implement the whole application in one step.

Work feature-by-feature.

Each major feature should be:

1. implemented
2. tested
3. reviewed
4. committed

## Code Quality

Prefer:

- clear names
- strict TypeScript
- reusable components
- small understandable functions
- predictable state management
- accessible UI
- responsive design
- Prefer server components; add 'use client' only when a component needs state, effects or browser APIs.

Avoid unnecessary dependencies.

## Security

Customer ticket content is untrusted.

Never assume customer-written:

- subject
- body
- summary
- attachment URL

is safe.

Do not execute customer HTML.

Do not expose secrets unnecessarily.

## Performance

The assignment requires a fast ticket dashboard.

Pay attention to:

- unnecessary re-renders
- search debouncing
- list rendering
- unnecessary client components
- unnecessary dependencies

## Testing

Tests should focus on important behavior and edge cases.

Do not write meaningless tests just to increase test count.

## Git

Prefer small meaningful commits.

Examples:

feat: add ticket list
feat: add ticket filters
feat: add ticket details
fix: handle invalid ticket data
test: add ticket action tests

## Agent Workflow

Claude should primarily:

- analyze requirements
- identify ambiguity
- plan architecture
- identify edge cases
- create precise implementation tasks
- review implementation

Antigravity will perform the actual code changes.

Implementation prompts for Antigravity should be specific and should
not request unrelated changes.

## Folder Layout (root = project root, no src/)

```
app/            Next.js App Router pages and layouts
components/     Reusable React components
  layout/       Header and navigation
  tickets/      Ticket list, row, filters
  review/       Review queue components
  ui/           shadcn/ui wrappers (added per phase)
store/          Redux Toolkit slices and store setup
lib/            API client (fetch wrappers), utilities
data/           Seed / in-memory ticket data
types/          Shared TypeScript types and interfaces
validation/     Plain TypeScript validators and business rules, shared by client and server (no Zod)
tests/          All Vitest test files
```

Do not create empty folders. Create a folder only when a file is
being added to it.

## Data Flow

UI component → dispatches Redux action or calls lib/api client
→ lib/api client → fetches Next.js Route Handler (app/api/...)
→ Route Handler → validates with validation/ schemas
→ Route Handler → reads/writes data/ in-memory store
→ response flows back up

## Security Rules (non-negotiable)

- `dangerouslySetInnerHTML` is banned (`react/no-danger` ESLint error).
- Customer ticket content (subject, body, summary, attachment URL)
  must be rendered as plain text only — never injected as HTML.
- `TRIAGE_API_KEY` is server-only. Never prefix it `NEXT_PUBLIC_`.
- Validate attachment URLs before making them clickable.
- Do not add sanitizer libraries; avoid the problem by design.

## Pre-commit Checklist

Run these before every commit and fix all failures:

```sh
npm run lint       # ESLint (react/no-danger included)
npm run typecheck  # tsc --noEmit
npm run test       # vitest run --passWithNoTests
npm run build      # production build must succeed
```