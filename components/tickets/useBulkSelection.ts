"use client";

import { useCallback, useMemo, useState } from "react";
import { MAX_BULK_SELECTION } from "@/lib/tickets/bulk";

export interface UseBulkSelectionProps {
  currentAgentId: string;
  visibleTicketIds: string[];
}

export function useBulkSelection({
  currentAgentId,
  visibleTicketIds,
}: UseBulkSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [prevAgentId, setPrevAgentId] = useState(currentAgentId);

  // Synchronously reset selection when agent changes
  if (prevAgentId !== currentAgentId) {
    setPrevAgentId(currentAgentId);
    setSelectedIds(new Set());
  }

  // Compute effective selection as intersection of selected IDs with visible IDs
  const effectiveSelectedIds = useMemo(() => {
    const visibleSet = new Set(visibleTicketIds);
    return Array.from(selectedIds).filter((id) => visibleSet.has(id));
  }, [selectedIds, visibleTicketIds]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_BULK_SELECTION) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllVisible = useCallback((visibleIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const capped = visibleIds.slice(0, MAX_BULK_SELECTION);
      for (const id of capped) next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const removeIds = useCallback((idsToRemove: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of idsToRemove) next.delete(id);
      return next;
    });
  }, []);

  const isAllVisibleSelected =
    visibleTicketIds.length > 0 &&
    visibleTicketIds.every((id) => selectedIds.has(id));

  const isPartiallySelected =
    effectiveSelectedIds.length > 0 && !isAllVisibleSelected;

  return {
    selectedIds,
    effectiveSelectedIds,
    toggle,
    selectAllVisible,
    clearSelection,
    removeIds,
    isAllVisibleSelected,
    isPartiallySelected,
  };
}
