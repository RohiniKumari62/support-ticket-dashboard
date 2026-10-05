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

  // Compute effective selection as intersection of selected IDs with visible IDs,
  // strictly preserving visible ticket order and using stable ticket IDs
  const effectiveSelectedIds = useMemo(() => {
    return visibleTicketIds.filter((id) => selectedIds.has(id));
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
      for (const id of visibleIds) {
        if (next.size >= MAX_BULK_SELECTION) break;
        next.add(id);
      }
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
