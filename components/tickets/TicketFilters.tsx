"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { TicketFilters } from "@/lib/tickets/filters";
import {
  CATEGORY_OPTIONS,
  DECISION_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
  hasActiveFilters,
  serializeTicketFilters,
} from "@/lib/tickets/filters";
import Link from "next/link";

interface TicketFiltersProps {
  filters: TicketFilters;
  totalCount: number;
  resultCount: number;
}

export function TicketFilters({
  filters,
  totalCount,
  resultCount,
}: TicketFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Local input value (text the user is typing)
  const [inputValue, setInputValue] = useState(filters.q);

  // Track the last q value this component pushed to the URL (to avoid sync loops)
  const lastPushedQ = useRef(filters.q);

  // Sync input text when the URL q changes externally (back/forward, clear)
  useEffect(() => {
    if (filters.q !== lastPushedQ.current) {
      setInputValue(filters.q);
      lastPushedQ.current = filters.q;
    }
  }, [filters.q]);

  // ─── Navigation helpers ──────────────────────────────────────────────────

  const navigateWithQ = useCallback(
    (newQ: string, replace: boolean) => {
      const newFilters: TicketFilters = { ...filters, q: newQ };
      const qs = serializeTicketFilters(newFilters);
      const href = qs ? `${pathname}?${qs}` : pathname;
      lastPushedQ.current = newQ;
      startTransition(() => {
        if (replace) {
          router.replace(href, { scroll: false });
        } else {
          router.push(href, { scroll: false });
        }
      });
    },
    [filters, pathname, router]
  );

  const navigateWithFilter = useCallback(
    (key: keyof Omit<TicketFilters, "q">, value: string) => {
      const newFilters: TicketFilters = {
        ...filters,
        [key]: value || null,
      };
      const qs = serializeTicketFilters(newFilters);
      const href = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [filters, pathname, router]
  );

  // ─── Debounce ────────────────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (value: string) => {
      setInputValue(value);

      // Clear existing debounce
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // Skip useless navigation if value equals what's already in URL
      if (value === filters.q) return;

      debounceRef.current = setTimeout(() => {
        navigateWithQ(value, true);
      }, 300);
    },
    [filters.q, navigateWithQ]
  );

  const applySearchImmediately = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value !== filters.q) {
        navigateWithQ(value, true);
      }
    },
    [filters.q, navigateWithQ]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Styles ──────────────────────────────────────────────────────────────

  const inputBase =
    "h-10 w-full rounded bg-white border border-slate-200 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 transition-colors";
  const inputActive = "border-blue-500 bg-blue-50/30";

  const selectBase =
    "h-10 w-full rounded bg-white border border-slate-200 px-2.5 text-sm text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 transition-colors appearance-none cursor-pointer";
  const selectActive = "border-blue-500 bg-blue-50/30 font-medium";

  const isFiltersActive = hasActiveFilters(filters);

  return (
    <div
      className="space-y-2"
      aria-busy={isPending}
    >
      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-2">
        {/* Search input */}
        <div className="flex-1 min-w-0">
          <label
            htmlFor="ticket-search"
            className="sr-only"
          >
            Search subject and body
          </label>
          <input
            id="ticket-search"
            type="search"
            autoComplete="off"
            maxLength={100}
            placeholder="Search subject or body"
            value={inputValue}
            className={`${inputBase} ${inputValue ? inputActive : ""}`}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applySearchImmediately(inputValue);
              }
            }}
          />
        </div>

        {/* Four selects + Clear button — 2-col grid on mobile, row on md+ */}
        <div className="grid grid-cols-2 gap-2 md:flex md:items-end md:gap-2">
          {/* Status */}
          <div>
            <label htmlFor="filter-status" className="sr-only">
              Status
            </label>
            <select
              id="filter-status"
              className={`${selectBase} ${filters.status ? selectActive : ""}`}
              value={filters.status ?? ""}
              onChange={(e) => navigateWithFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="filter-priority" className="sr-only">
              Priority
            </label>
            <select
              id="filter-priority"
              className={`${selectBase} ${filters.priority ? selectActive : ""}`}
              value={filters.priority ?? ""}
              onChange={(e) => navigateWithFilter("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="filter-category" className="sr-only">
              Category
            </label>
            <select
              id="filter-category"
              className={`${selectBase} ${filters.category ? selectActive : ""}`}
              value={filters.category ?? ""}
              onChange={(e) => navigateWithFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* AI Decision */}
          <div>
            <label htmlFor="filter-decision" className="sr-only">
              AI decision
            </label>
            <select
              id="filter-decision"
              className={`${selectBase} ${filters.decision ? selectActive : ""}`}
              value={filters.decision ?? ""}
              onChange={(e) => navigateWithFilter("decision", e.target.value)}
            >
              <option value="">All decisions</option>
              {DECISION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear button — only shown when any filter is active */}
        {isFiltersActive && (
          <div className="md:shrink-0">
            <Link
              href={pathname}
              className="flex h-10 items-center justify-center whitespace-nowrap rounded border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 transition-colors w-full md:w-auto"
              onClick={() => {
                setInputValue("");
                lastPushedQ.current = "";
              }}
            >
              Clear filters
            </Link>
          </div>
        )}
      </div>

      {/* Result count */}
      <p
        role="status"
        aria-live="polite"
        className="text-xs text-slate-500 tabular px-0.5"
      >
        {isFiltersActive
          ? `Showing ${resultCount} of ${totalCount} tickets`
          : `Showing ${totalCount} ${totalCount === 1 ? "ticket" : "tickets"}`}
      </p>
    </div>
  );
}
