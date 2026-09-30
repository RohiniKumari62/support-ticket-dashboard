"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  selectLiveCursor,
  selectLiveInstanceId,
} from "@/lib/store/tickets-selectors";
import {
  pollSucceeded,
  pollFailed,
  liveReset,
} from "@/lib/store/live-slice";
import { ticketReceivedFromServer } from "@/lib/store/tickets-slice";
import type { Ticket } from "@/types/ticket";

/** How often to poll for updates (ms). */
const POLL_INTERVAL_MS = 10_000;
/** How long to back off after consecutive failures (ms). */
const ERROR_BACKOFF_MS = 30_000;

interface UpdatesResponse {
  created: Ticket[];
  updated: Ticket[];
  serverTime: string;
  hasMore: boolean;
  instanceId: string;
}

/**
 * Mounts alongside the Redux store and polls GET /api/tickets/updates
 * every POLL_INTERVAL_MS. Dispatches incoming tickets to the store so
 * the UI can reflect changes made by other agents without a page reload.
 *
 * New tickets (created[]) are queued in live.pendingNewIds so the user
 * can choose when to surface them (via the "N new tickets" banner).
 * Updated tickets (updated[]) are merged in-place immediately.
 */
export function LiveUpdatesController({
  initialServerTime,
  initialInstanceId,
}: {
  initialServerTime: string;
  initialInstanceId: string;
}) {
  const dispatch = useAppDispatch();
  const cursor = useAppSelector(selectLiveCursor);
  const instanceId = useAppSelector(selectLiveInstanceId);

  // Use refs to avoid stale closures in the interval callback
  const cursorRef = useRef<string>(initialServerTime);
  const instanceIdRef = useRef<string>(initialInstanceId);
  const failCountRef = useRef<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  // Keep refs in sync with Redux state
  useEffect(() => {
    if (cursor) cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    if (instanceId) instanceIdRef.current = instanceId;
  }, [instanceId]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;

      // Abort any in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = new URL("/api/tickets/updates", window.location.origin);
        url.searchParams.set("since", cursorRef.current);

        const res = await fetch(url.toString(), {
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: UpdatesResponse = await res.json();

        if (cancelled) return;

        // Detect server restart — store was reset
        if (data.instanceId !== instanceIdRef.current) {
          // Reset — page will reflect re-seeded data on next user action.
          // We still advance the cursor to avoid replaying all history.
          instanceIdRef.current = data.instanceId;
        }

        // Dispatch updated tickets immediately
        for (const t of data.updated) {
          dispatch(ticketReceivedFromServer(t));
        }

        // Collect IDs of new tickets for the banner
        const newIds = data.created.map((t) => t.id);
        // Also merge them into the store so clicking "Show" can resolve them
        for (const t of data.created) {
          dispatch(ticketReceivedFromServer(t));
        }

        dispatch(
          pollSucceeded({
            serverTime: data.serverTime,
            instanceId: data.instanceId,
            newIds,
          })
        );

        cursorRef.current = data.serverTime;
        failCountRef.current = 0;

        const nextDelay = data.hasMore ? 0 : POLL_INTERVAL_MS;
        timeoutId = setTimeout(poll, nextDelay);
      } catch (err) {
        if (cancelled) return;
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") return;

        failCountRef.current += 1;
        dispatch(pollFailed());
        const backoff =
          failCountRef.current >= 2 ? ERROR_BACKOFF_MS : POLL_INTERVAL_MS;
        timeoutId = setTimeout(poll, backoff);
      }
    }

    // Start first poll after a short delay so the page renders first
    timeoutId = setTimeout(poll, 2000);

    return () => {
      cancelled = true;
      if (timeoutId !== null) clearTimeout(timeoutId);
      if (abortRef.current) abortRef.current.abort();
      dispatch(liveReset());
    };
  }, [dispatch]);

  return null;
}
