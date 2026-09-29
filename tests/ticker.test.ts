import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActiveListenersCount,
  getServerSnapshot,
  getSnapshot,
  isTickerRunning,
  subscribe,
} from "@/lib/tickets/ticker";

describe("Shared Ticker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("getServerSnapshot always returns null for SSR safety", () => {
    expect(getServerSnapshot()).toBeNull();
  });

  it("starts the shared timer on first subscriber and stops on last unsubscribe", () => {
    expect(getActiveListenersCount()).toBe(0);
    expect(isTickerRunning()).toBe(false);

    const listener1 = vi.fn();
    const unsub1 = subscribe(listener1);

    expect(getActiveListenersCount()).toBe(1);
    expect(isTickerRunning()).toBe(true);

    const listener2 = vi.fn();
    const unsub2 = subscribe(listener2);

    expect(getActiveListenersCount()).toBe(2);
    expect(isTickerRunning()).toBe(true);

    // Advance 3 seconds
    vi.advanceTimersByTime(3000);

    expect(listener1).toHaveBeenCalledTimes(3);
    expect(listener2).toHaveBeenCalledTimes(3);

    // Unsubscribe first listener
    unsub1();
    expect(getActiveListenersCount()).toBe(1);
    expect(isTickerRunning()).toBe(true);

    // Unsubscribe second listener
    unsub2();
    expect(getActiveListenersCount()).toBe(0);
    expect(isTickerRunning()).toBe(false);

    // Advance time further — neither listener should fire
    vi.advanceTimersByTime(2000);
    expect(listener1).toHaveBeenCalledTimes(3);
    expect(listener2).toHaveBeenCalledTimes(3);
  });

  it("handles double-unsubscribe safely without throwing", () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);

    expect(getActiveListenersCount()).toBe(1);
    unsub();
    expect(getActiveListenersCount()).toBe(0);

    // Second call should be no-op
    expect(() => unsub()).not.toThrow();
    expect(getActiveListenersCount()).toBe(0);
  });

  it("getSnapshot returns a numeric timestamp", () => {
    const snap = getSnapshot();
    expect(typeof snap).toBe("number");
    expect(snap).toBeGreaterThan(0);
  });
});
