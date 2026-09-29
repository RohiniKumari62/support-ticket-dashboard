import { NavLinks } from "./NavLinks";
import { AgentSelect } from "./AgentSelect";

// Server component — no interactivity needed at this level.
// NavLinks and AgentSelect are client components and handle their own state.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[oklch(0.902_0.007_264.5)]">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6">
        {/*
         * Desktop (≥ sm): single row
         *   - Left: Brand + NavLinks
         *   - Right: My tickets (–) + AgentSelect
         * Mobile (< sm): two rows
         *   - Row 1: Brand + AgentSelect
         *   - Row 2: NavLinks + My tickets (–)
         */}
        <div className="flex flex-wrap items-center justify-between min-h-[48px] py-1 gap-y-1 sm:gap-y-0">
          {/* Brand — order 1 on mobile & desktop */}
          <span className="order-1 text-sm font-semibold text-[oklch(0.129_0.014_254.6)] whitespace-nowrap select-none">
            Support Desk
          </span>

          {/* AgentSelect — order 2 on mobile (top right), order 4 on desktop (far right) */}
          <div className="order-2 sm:order-4">
            <AgentSelect />
          </div>

          {/* Line break on mobile (< sm) to force row 2 */}
          <div className="w-full h-0 basis-full sm:hidden order-2" aria-hidden="true" />

          {/* NavLinks — order 3 on mobile (bottom left), order 2 on desktop (next to brand) */}
          <div className="order-3 sm:order-2 sm:ml-4">
            <NavLinks />
          </div>

          {/* My tickets — order 4 on mobile (bottom right), order 3 on desktop (right-aligned before agent) */}
          <div className="order-4 sm:order-3 sm:ml-auto sm:mr-4">
            <span
              className="inline-flex items-center h-10 text-sm text-[oklch(0.44_0.019_264.4)] whitespace-nowrap tabular"
              aria-label="My tickets count placeholder"
            >
              My tickets (–)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
