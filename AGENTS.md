
## Project

Support Ticket Dashboard

## Primary References

Before changing code, read:

- CLAUDE.md
- DESIGN.md
- DECISIONS.md
- README.md
- existing project files

The official assignment requirements are the source of truth.

## Implementation Rules

Implement only the requested task.

Before changing code:

1. Inspect the existing architecture.
2. Reuse existing components where appropriate.
3. Do not duplicate functionality.
4. Do not rewrite unrelated code.
5. Do not add unnecessary dependencies.
6. Follow the existing design system.
7. Keep TypeScript strict.
8. Avoid `any` unless genuinely necessary.
9. Consider mobile layout.
10. Consider accessibility.
11. Handle relevant loading/error/empty states.

## UI

Follow DESIGN.md exactly.

The product should look like a realistic support-agent
application.

Avoid:

- gradients unless justified
- glassmorphism
- excessive rounded cards
- excessive animations
- decorative UI
- unnecessary icons
- generic AI dashboard styling

## Security

Treat customer-written ticket content as untrusted.

Never execute customer-provided HTML.

Validate URLs before making them clickable.

Do not expose secrets.

## Architecture

Keep responsibilities separated.

Do not put unrelated logic into page components.

Do not create unnecessary abstraction layers.

## Testing

After implementation:

- run lint
- run relevant tests
- run production build when appropriate

Fix errors before finishing.

## Final Response

After completing a task, report:

1. What was changed
2. Files changed
3. Tests/checks performed
4. Any remaining issues
5. Any decision that should be added to DECISIONS.md

Do not make unrelated changes.