"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Tickets", href: "/tickets" },
  // "(–)" is a placeholder; real count arrives in Phase 6 via Redux.
  { label: "To review (–)", href: "/review" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/tickets") {
      // Keep active on /tickets and all /tickets/[id] sub-routes.
      return pathname === "/tickets" || pathname.startsWith("/tickets/");
    }
    return pathname === href;
  }

  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-1" role="list">
        {NAV_ITEMS.map(({ label, href }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex items-center h-10 px-3 rounded text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2",
                  active
                    ? "bg-[oklch(0.93_0.01_264.5)] text-[oklch(0.546_0.245_262.9)]"
                    : "text-[oklch(0.44_0.019_264.4)] hover:bg-[oklch(0.968_0.003_264.5)] hover:text-[oklch(0.129_0.014_254.6)]",
                ].join(" ")}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
