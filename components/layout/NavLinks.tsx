"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/store/hooks";
import { selectReviewCount } from "@/lib/store/tickets-selectors";

export function NavLinks() {
  const pathname = usePathname();
  const reviewCount = useAppSelector(selectReviewCount);

  function isActive(href: string): boolean {
    if (href === "/tickets") {
      // Keep active on /tickets and all /tickets/[id] sub-routes.
      return pathname === "/tickets" || pathname.startsWith("/tickets/");
    }
    return pathname === href;
  }

  const navItems = [
    { label: "Tickets", href: "/tickets" },
    { label: `To review (${reviewCount})`, href: "/review" },
  ];

  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-1" role="list">
        {navItems.map(({ label, href }) => {
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
