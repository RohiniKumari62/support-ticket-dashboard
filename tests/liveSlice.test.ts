import { describe, it, expect } from "vitest";
import liveReducer, {
  pollSucceeded,
  pollFailed,
  pendingTicketsAccepted,
  liveReset,
  cursorInitialized,
  LiveState,
} from "@/lib/store/live-slice";

const initial: LiveState = {
  cursor: null,
  instanceId: null,
  status: "idle",
  failCount: 0,
  pendingNewIds: [],
};

describe("liveSlice reducer", () => {
  it("initializes cursor and instanceId", () => {
    const state = liveReducer(
      initial,
      cursorInitialized({ cursor: "2026-09-30T10:00:00Z", instanceId: "inst-1" })
    );
    expect(state.cursor).toBe("2026-09-30T10:00:00Z");
    expect(state.instanceId).toBe("inst-1");
    expect(state.status).toBe("polling");
  });

  it("handles pollSucceeded and accumulates new pending ticket IDs without duplicates", () => {
    const afterInit: LiveState = {
      cursor: "2026-09-30T10:00:00Z",
      instanceId: "inst-1",
      status: "polling",
      failCount: 1,
      pendingNewIds: ["T-1"],
    };

    const nextState = liveReducer(
      afterInit,
      pollSucceeded({
        serverTime: "2026-09-30T10:00:05Z",
        instanceId: "inst-1",
        newIds: ["T-2", "T-1", "T-3"],
      })
    );

    expect(nextState.cursor).toBe("2026-09-30T10:00:05Z");
    expect(nextState.failCount).toBe(0);
    expect(nextState.pendingNewIds).toEqual(["T-1", "T-2", "T-3"]);
  });

  it("handles pollFailed with retrying state after multiple failures", () => {
    let state = liveReducer(initial, pollFailed());
    expect(state.failCount).toBe(1);
    expect(state.status).toBe("error");

    state = liveReducer(state, pollFailed());
    expect(state.failCount).toBe(2);
    expect(state.status).toBe("retrying");
  });

  it("clears pending IDs when agent accepts them", () => {
    const stateWithPending: LiveState = {
      ...initial,
      pendingNewIds: ["T-1", "T-2"],
    };

    const nextState = liveReducer(stateWithPending, pendingTicketsAccepted());
    expect(nextState.pendingNewIds).toEqual([]);
  });

  it("resets status and fail count on liveReset", () => {
    const erroredState: LiveState = {
      ...initial,
      status: "error",
      failCount: 3,
    };

    const resetState = liveReducer(erroredState, liveReset());
    expect(resetState.status).toBe("idle");
    expect(resetState.failCount).toBe(0);
  });
});
