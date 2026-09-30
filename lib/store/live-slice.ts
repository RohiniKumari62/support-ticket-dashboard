import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type LiveStatus =
  | "idle"
  | "polling"
  | "error"
  | "retrying";

export interface LiveState {
  /** ISO string cursor — server time of last successful poll */
  cursor: string | null;
  /** Server instance ID — used to detect restarts */
  instanceId: string | null;
  status: LiveStatus;
  /** Count of consecutive poll failures */
  failCount: number;
  /**
   * IDs of newly arrived tickets not yet shown in the list.
   * Cleared when the user clicks "Show N new tickets".
   */
  pendingNewIds: string[];
}

const initialState: LiveState = {
  cursor: null,
  instanceId: null,
  status: "idle",
  failCount: 0,
  pendingNewIds: [],
};

export const liveSlice = createSlice({
  name: "live",
  initialState,
  reducers: {
    /** Called when a poll succeeds */
    pollSucceeded(
      state,
      action: PayloadAction<{
        serverTime: string;
        instanceId: string;
        newIds: string[];
      }>
    ) {
      const { serverTime, instanceId, newIds } = action.payload;
      state.cursor = serverTime;
      state.instanceId = instanceId;
      state.status = "polling";
      state.failCount = 0;
      if (newIds.length > 0) {
        // Append newly arrived IDs (avoid duplicates)
        const existing = new Set(state.pendingNewIds);
        for (const id of newIds) {
          if (!existing.has(id)) {
            existing.add(id);
            state.pendingNewIds.push(id);
          }
        }
      }
    },
    /** Called when a poll request fails */
    pollFailed(state) {
      state.failCount += 1;
      state.status = state.failCount >= 2 ? "retrying" : "error";
    },
    /** Agent clicks "Show N new tickets" — promote pending IDs into the visible list */
    pendingTicketsAccepted(state) {
      state.pendingNewIds = [];
    },
    /** Mark live updates as idle (e.g. on unmount) */
    liveReset(state) {
      state.status = "idle";
      state.failCount = 0;
    },
    /** Bootstrap the cursor from the server seed time */
    cursorInitialized(
      state,
      action: PayloadAction<{ cursor: string; instanceId: string }>
    ) {
      if (!state.cursor) {
        state.cursor = action.payload.cursor;
        state.instanceId = action.payload.instanceId;
        state.status = "polling";
      }
    },
  },
});

export const {
  pollSucceeded,
  pollFailed,
  pendingTicketsAccepted,
  liveReset,
  cursorInitialized,
} = liveSlice.actions;

export default liveSlice.reducer;
