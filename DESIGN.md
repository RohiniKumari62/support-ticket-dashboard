# Support Ticket Dashboard - Design Direction

## Product

Internal support-agent dashboard for finding, reviewing,
claiming and updating customer support tickets.

## Primary Design Goal

The application should look like a real production support
tool used by support agents.

It should be simple, professional, attractive and practical.

The interface should prioritize usability and information
scanning over visual decoration.

## Visual Direction

Use:

- clean light surfaces
- neutral background
- subtle borders
- restrained accent colors
- clear typography hierarchy
- compact but readable ticket rows
- meaningful status and priority colors
- consistent spacing
- clear hover and focus states

Avoid:

- excessive gradients
- glassmorphism
- futuristic AI dashboard styling
- excessive rounded cards
- giant headings
- unnecessary animations
- excessive icons
- decorative charts
- excessive colors
- huge empty spaces
- portfolio/landing-page styling

## Product Feel

The dashboard should feel like an actual internal
customer-support application rather than a demo.

The user should be able to scan many tickets quickly.

## Main Screen

The `/tickets` page is the primary screen.

Important information:

- subject
- plan
- category
- priority
- status
- assigned agent
- created time
- deadline
- AI decision when relevant

## Main Pages

- `/tickets`
- `/tickets/[id]`
- `/review`

## Responsive Design

The application must work properly at 375px width.

Mobile should prioritize useful information rather than
simply shrinking the desktop layout.

## Interaction

Interactions should be clear and predictable.

Loading, empty, error, disabled and success states should
look intentional.

## Important

Do not redesign the product into a generic analytics dashboard.

This is a support-ticket management application.

## Design Tokens

### Color Palette

Light theme only.

| Role | Value |
|---|---|
| Page background | slate-50 |
| Surfaces (header, cards) | white |
| Borders | slate-200 (1px, no shadows) |
| Primary text | slate-900 |
| Secondary text | slate-600 |
| Accent (links, focus ring, primary button) | blue-600 |

### Semantic Colors

Use ONLY for meaning. Subtle tinted text + background — no saturated fills.

| Token | Meaning | Text | Background |
|---|---|---|---|
| `--deadline-late` | Late / P0 | red | red-50 tint |
| `--deadline-risk` | At risk | amber | amber-50 tint |
| `--deadline-ok` | On track / success | green | green-50 tint |

### Typography

- Font: Inter (next/font, display swap)
- Base: 14px
- Numbers, counts, countdowns: `font-variant-numeric: tabular-nums`

### Shape & Borders

- Max border-radius: 6px (use less where appropriate)
- Borders: 1px, slate-200 — not box shadows
- Borders only. No box shadows.
- No gradients, glass effects, or decorative animations

### Interactivity

- Visible focus ring on every interactive element (blue-600, 2px)
- Touch targets: minimum 40px height on mobile
- Density: table rows ~44px on desktop

### Layout

- Content max-width: 1400px
- Side padding: 16px mobile / 24px desktop (px-4 / sm:px-6)