import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let currentSnapshot: number = Math.floor(Date.now() / 1000) * 1000;

function tick() {
  currentSnapshot = Math.floor(Date.now() / 1000) * 1000;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (listeners.size === 1 && intervalId === null) {
    currentSnapshot = Math.floor(Date.now() / 1000) * 1000;
    intervalId = setInterval(tick, 1000);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function getSnapshot(): number {
  return currentSnapshot;
}

export function getServerSnapshot(): null {
  return null;
}

/**
 * Shared clock hook providing whole-second timestamp across the app.
 * Returns null during SSR/hydration to avoid hydration mismatches,
 * and current timestamp once mounted on client.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Testing helper to inspect active listeners count.
 */
export function getActiveListenersCount(): number {
  return listeners.size;
}

/**
 * Testing helper to check if interval is running.
 */
export function isTickerRunning(): boolean {
  return intervalId !== null;
}
