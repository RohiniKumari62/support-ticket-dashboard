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
import {
  getCategoryLabel,
  getPriorityLabel,
  getStatusLabel,
  getTriageDecisionLabel,
} from "@/lib/tickets/labels";

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

  const removeFilter = useCallback(
    (key: keyof TicketFilters) => {
      const newFilters: TicketFilters = {
        ...filters,
        [key]: key === "q" ? "" : null,
      };
      if (key === "q") {
        setInputValue("");
        lastPushedQ.current = "";
      }
      const qs = serializeTicketFilters(newFilters);
      const href = qs ? `${pathname}?${qs}` : pathname;
      startTransition(() => {
        router.push(href, { scroll: false });
      });
    },
    [filters, pathname, router]
  );

  const handleClearAll = useCallback(() => {
    setInputValue("");
    lastPushedQ.current = "";
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }, [pathname, router]);

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
    "h-11 md:h-10 w-full rounded bg-white border border-slate-200 px-3 text-base md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 transition-colors";
  const inputActive = "border-blue-500 bg-blue-50/30";

  const selectBase =
    "h-11 md:h-10 w-full rounded bg-white border border-slate-200 pl-3 pr-8 text-base md:text-sm text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-0 transition-colors appearance-none cursor-pointer";
  const selectActive = "border-blue-500 bg-blue-50/30 font-medium";

  const isFiltersActive = hasActiveFilters(filters);

  // Active filter chips list
  const chips: { key: keyof TicketFilters; displayLabel: string; fullLabel: string }[] = [];

  if (filters.q) {
    const truncatedQ = filters.q.length > 30 ? `${filters.q.slice(0, 30)}…` : filters.q;
    chips.push({
      key: "q",
      displayLabel: `Search: "${truncatedQ}"`,
      fullLabel: `Search: "${filters.q}"`,
    });
  }

  if (filters.status) {
    const label = getStatusLabel(filters.status);
    chips.push({
      key: "status",
      displayLabel: `Status: ${label}`,
      fullLabel: `Status: ${label}`,
    });
  }

  if (filters.priority) {
    const label = getPriorityLabel(filters.priority);
    chips.push({
      key: "priority",
      displayLabel: `Priority: ${label}`,
      fullLabel: `Priority: ${label}`,
    });
  }

  if (filters.category) {
    const label = getCategoryLabel(filters.category);
    chips.push({
      key: "category",
      displayLabel: `Category: ${label}`,
      fullLabel: `Category: ${label}`,
    });
  }

  if (filters.decision) {
    const label = getTriageDecisionLabel(filters.decision);
    chips.push({
      key: "decision",
      displayLabel: `AI decision: ${label}`,
      fullLabel: `AI decision: ${label}`,
    });
  }

  const chevronSvg = (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div
      className="space-y-2.5"
      aria-busy={isPending}
    >
      {/* Filter bar */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:gap-2">
        {/* Search input */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <label
            htmlFor="ticket-search"
            className="text-xs font-medium text-slate-600 block"
          >
            Search
          </label>
          <input
            id="ticket-search"
            type="search"
            aria-label="Search subject and body"
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

        {/* Four selects — 2-col grid on mobile, row on md+ */}
        <div className="grid grid-cols-2 gap-2 md:flex md:items-end md:gap-2">
          {/* Status */}
          <div className="flex flex-col gap-1 min-w-0">
            <label htmlFor="filter-status" className="text-xs font-medium text-slate-600 block">
              Status
            </label>
            <div className="relative">
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
              {chevronSvg}
            </div>
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-1 min-w-0">
            <label htmlFor="filter-priority" className="text-xs font-medium text-slate-600 block">
              Priority
            </label>
            <div className="relative">
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
              {chevronSvg}
            </div>
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1 min-w-0">
            <label htmlFor="filter-category" className="text-xs font-medium text-slate-600 block">
              Category
            </label>
            <div className="relative">
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
              {chevronSvg}
            </div>
          </div>

          {/* AI Decision */}
          <div className="flex flex-col gap-1 min-w-0">
            <label htmlFor="filter-decision" className="text-xs font-medium text-slate-600 block">
              AI decision
            </label>
            <div className="relative">
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
              {chevronSvg}
            </div>
          </div>
        </div>
      </div>

      {/* Active filter chips row */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {chips.map(({ key, displayLabel, fullLabel }) => (
            <button
              key={key}
              type="button"
              aria-label={`Remove filter ${fullLabel}`}
              onClick={() => removeFilter(key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-slate-200/80 px-2.5 py-1 text-xs md:text-sm text-slate-700 min-h-[44px] md:min-h-[28px] focus-visible:outline-2 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-offset-1 transition-colors motion-reduce:transition-none cursor-pointer"
            >
              <span>{displayLabel}</span>
              <span
                aria-hidden="true"
                className="text-slate-500 font-semibold leading-none text-sm select-none"
              >
                ×
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs md:text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-2 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-offset-1 min-h-[44px] md:min-h-[28px] flex items-center px-1 cursor-pointer transition-colors motion-reduce:transition-none"
          >
            Clear all
          </button>
        </div>
      )}

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
