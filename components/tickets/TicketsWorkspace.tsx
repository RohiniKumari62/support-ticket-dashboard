"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TicketFilters as TicketFiltersType } from "@/lib/tickets/filters";
import type { TicketStatus } from "@/types/ticket";
import {
  filterTickets,
  hasActiveFilters,
  serializeTicketFilters,
} from "@/lib/tickets/filters";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectBulkState,
  selectCurrentAgentId,
  selectDuplicatesRemoved,
  selectTicketsSorted,
  selectPendingNewCount,
  selectLiveStatus,
} from "@/lib/store/tickets-selectors";
import { filtersChanged } from "@/lib/store/filters-slice";
import { pendingTicketsAccepted } from "@/lib/store/live-slice";
import { bulkRunThunk } from "@/lib/store/tickets-thunks";
import type { BulkActionKind, BulkTicketResult } from "@/lib/tickets/bulk";
import { TicketFilters } from "./TicketFilters";
import { TicketList } from "./TicketList";
import { BulkActionBar } from "./BulkActionBar";
import { BulkResultPanel } from "./BulkResultPanel";
import { useBulkSelection } from "./useBulkSelection";

export interface TicketsWorkspaceProps {
  filters: TicketFiltersType;
}

export function TicketsWorkspace({ filters }: TicketsWorkspaceProps) {
  const dispatch = useAppDispatch();
  const sortedTickets = useAppSelector(selectTicketsSorted);
  const duplicatesRemoved = useAppSelector(selectDuplicatesRemoved);
  const currentAgentId = useAppSelector(selectCurrentAgentId);
  const bulkState = useAppSelector(selectBulkState);
  const pendingNewCount = useAppSelector(selectPendingNewCount);
  const liveStatus = useAppSelector(selectLiveStatus);

  // Sync URL filters into Redux for consumer components (e.g. TicketDetail back link)
  const serializedFilters = serializeTicketFilters(filters);
  useEffect(() => {
    dispatch(filtersChanged(filters));
  }, [dispatch, filters, serializedFilters]);

  // Compute filtered tickets from sorted store tickets
  const filteredTickets = useMemo(() => {
    return filterTickets(sortedTickets, filters);
  }, [sortedTickets, filters]);

  const visibleTicketIds = useMemo(() => {
    return filteredTickets.map((t) => t.id);
  }, [filteredTickets]);

  const {
    selectedIds,
    effectiveSelectedIds,
    toggle,
    selectAllVisible,
    clearSelection,
    removeIds,
    isAllVisibleSelected,
    isPartiallySelected,
  } = useBulkSelection({
    currentAgentId,
    visibleTicketIds,
  });

  const [bulkResults, setBulkResults] = useState<BulkTicketResult[]>([]);
  const [lastBulkKind, setLastBulkKind] = useState<BulkActionKind>("claim");
  const [lastBulkTarget, setLastBulkTarget] = useState<TicketStatus | undefined>();
  const [prevAgentId, setPrevAgentId] = useState(currentAgentId);

  if (prevAgentId !== currentAgentId) {
    setPrevAgentId(currentAgentId);
    setBulkResults([]);
  }


  const handleBulkClaim = useCallback(async () => {
    if (effectiveSelectedIds.length === 0 || bulkState.running) return;
    setLastBulkKind("claim");
    setLastBulkTarget(undefined);

    const resAction = await dispatch(
      bulkRunThunk({
        kind: "claim",
        ticketIds: effectiveSelectedIds,
        agentId: currentAgentId,
      })
    );

    if (bulkRunThunk.fulfilled.match(resAction)) {
      const results = resAction.payload;
      setBulkResults(results);
      const successfulIds = results
        .filter((r) => r.outcome === "success")
        .map((r) => r.ticketId);
      removeIds(successfulIds);
    }
  }, [bulkState.running, currentAgentId, dispatch, effectiveSelectedIds, removeIds]);

  const handleBulkStatus = useCallback(
    async (status: TicketStatus) => {
      if (effectiveSelectedIds.length === 0 || bulkState.running) return;
      setLastBulkKind("status");
      setLastBulkTarget(status);

      const resAction = await dispatch(
        bulkRunThunk({
          kind: "status",
          target: status,
          ticketIds: effectiveSelectedIds,
          agentId: currentAgentId,
        })
      );

      if (bulkRunThunk.fulfilled.match(resAction)) {
        const results = resAction.payload;
        setBulkResults(results);
        const successfulIds = results
          .filter((r) => r.outcome === "success")
          .map((r) => r.ticketId);
        removeIds(successfulIds);
      }
    },
    [bulkState.running, currentAgentId, dispatch, effectiveSelectedIds, removeIds]
  );

  const handleRetryFailed = useCallback(async () => {
    const failedIds = bulkResults
      .filter((r) => r.outcome === "failed")
      .map((r) => r.ticketId);

    if (failedIds.length === 0 || bulkState.running) return;

    const resAction = await dispatch(
      bulkRunThunk({
        kind: lastBulkKind,
        target: lastBulkTarget,
        ticketIds: failedIds,
        agentId: currentAgentId,
      })
    );

    if (bulkRunThunk.fulfilled.match(resAction)) {
      const newResults = resAction.payload;
      // Merge results: replace previous failed item results with new ones
      setBulkResults((prev) => {
        const map = new Map(prev.map((r) => [r.ticketId, r]));
        for (const nr of newResults) {
          map.set(nr.ticketId, nr);
        }
        return Array.from(map.values());
      });
      const successfulIds = newResults
        .filter((r) => r.outcome === "success")
        .map((r) => r.ticketId);
      removeIds(successfulIds);
    }
  }, [
    bulkResults,
    bulkState.running,
    currentAgentId,
    dispatch,
    lastBulkKind,
    lastBulkTarget,
    removeIds,
  ]);

  const handleDismissResults = useCallback(() => {
    setBulkResults([]);
  }, []);

  const handleSelectAllToggle = useCallback(() => {
    if (isAllVisibleSelected) {
      clearSelection();
    } else {
      selectAllVisible(visibleTicketIds);
    }
  }, [clearSelection, isAllVisibleSelected, selectAllVisible, visibleTicketIds]);

  const filtersActive = hasActiveFilters(filters);

  const handleShowNewTickets = useCallback(() => {
    dispatch(pendingTicketsAccepted());
  }, [dispatch]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 break-words">
          Tickets
        </h1>
        <p className="text-sm text-slate-600">
          Find, triage, and manage customer support tickets.
        </p>
      </div>

      {pendingNewCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800"
        >
          <span className="font-medium">
            {pendingNewCount === 1
              ? "1 new ticket arrived"
              : `${pendingNewCount} new tickets arrived`}
          </span>
          <button
            type="button"
            onClick={handleShowNewTickets}
            className="ml-auto rounded border border-blue-300 bg-white px-3 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Show
          </button>
        </div>
      )}

      {liveStatus === "retrying" && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
        >
          Live updates paused — retrying connection…
        </div>
      )}

      <TicketFilters
        filters={filters}
        totalCount={sortedTickets.length}
        resultCount={filteredTickets.length}
      />

      <BulkActionBar
        selectedCount={effectiveSelectedIds.length}
        isRunning={bulkState.running}
        progress={{ done: bulkState.done, total: bulkState.total }}
        onClaim={handleBulkClaim}
        onStatusApply={handleBulkStatus}
        onClear={clearSelection}
      />

      <BulkResultPanel
        actionKind={lastBulkKind}
        results={bulkResults}
        onRetryFailed={handleRetryFailed}
        onDismiss={handleDismissResults}
        isRetrying={bulkState.running}
      />

      <TicketList
        tickets={filteredTickets}
        duplicatesRemoved={duplicatesRemoved}
        hasActiveFilters={filtersActive}
        selectedIds={selectedIds}
        onToggle={toggle}
        onSelectAll={handleSelectAllToggle}
        isAllSelected={isAllVisibleSelected}
        isIndeterminate={isPartiallySelected}
      />
    </div>
  );
}
