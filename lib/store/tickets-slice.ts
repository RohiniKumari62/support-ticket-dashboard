import {
  createSlice,
  current,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { Ticket } from "@/types/ticket";
import { applyReview } from "@/lib/tickets/review";
import {
  claimTicketThunk,
  changeStatusThunk,
  reviewTicketThunk,
  retriageTicketThunk,
} from "./tickets-thunks";

export interface InFlightAction {
  action: "claim" | "status" | "review" | "retriage" | "bulk";
  requestId: string;
  snapshot: Ticket;
}

export interface TicketsState {
  byId: Record<string, Ticket>;
  ids: string[];
  duplicatesRemoved: number;
  inFlight: Record<string, InFlightAction>;
  bulk: {
    running: boolean;
    done: number;
    total: number;
  };
}

const initialState: TicketsState = {
  byId: {},
  ids: [],
  duplicatesRemoved: 0,
  inFlight: {},
  bulk: {
    running: false,
    done: 0,
    total: 0,
  },
};

export const ticketsSlice = createSlice({
  name: "tickets",
  initialState,
  reducers: {
    ticketsSeeded(
      state,
      action: PayloadAction<{ tickets: Ticket[]; duplicatesRemoved?: number }>
    ) {
      const { tickets, duplicatesRemoved = 0 } = action.payload;
      const byId: Record<string, Ticket> = {};
      const ids: string[] = [];
      for (const t of tickets) {
        if (!t?.id || t.id === "__proto__" || t.id === "constructor" || t.id === "prototype") {
          continue;
        }
        if (!byId[t.id]) {
          ids.push(t.id);
        }
        byId[t.id] = t;
      }
      state.byId = byId;
      state.ids = ids;
      state.duplicatesRemoved = duplicatesRemoved;
    },
    ticketReceivedFromServer(state, action: PayloadAction<Ticket>) {
      const incoming = action.payload;
      const id = incoming.id;
      if (!id || id === "__proto__" || id === "constructor" || id === "prototype") {
        return;
      }
      const inFlight = state.inFlight[id];

      if (inFlight) {
        // Update the snapshot to newer server truth while preserving active optimistic view
        inFlight.snapshot = incoming;
      } else {
        state.byId[id] = incoming;
        if (!state.ids.includes(id)) {
          state.ids.push(id);
        }
      }
    },
    setBulkRunning(state, action: PayloadAction<boolean>) {
      state.bulk.running = action.payload;
    },
    setBulkProgress(
      state,
      action: PayloadAction<{ done: number; total: number }>
    ) {
      state.bulk.done = action.payload.done;
      state.bulk.total = action.payload.total;
    },
  },
  extraReducers: (builder) => {
    // ─── Claim ─────────────────────────────────────────────────────────────
    builder
      .addCase(claimTicketThunk.pending, (state, action) => {
        const { ticketId, agentId } = action.meta.arg;
        const ticket = state.byId[ticketId];
        if (ticket) {
          state.inFlight[ticketId] = {
            action: "claim",
            requestId: action.meta.requestId,
            snapshot: current(ticket),
          };
          ticket.assignedTo = agentId;
        }
      })
      .addCase(claimTicketThunk.fulfilled, (state, action) => {
        const { ticketId } = action.meta.arg;
        state.byId[ticketId] = action.payload.ticket;
        delete state.inFlight[ticketId];
      })
      .addCase(claimTicketThunk.rejected, (state, action) => {
        const { ticketId } = action.meta.arg;
        const inFlight = state.inFlight[ticketId];
        if (inFlight && inFlight.requestId === action.meta.requestId) {
          state.byId[ticketId] = inFlight.snapshot;
          if (action.payload?.ticket) {
            state.byId[ticketId] = action.payload.ticket;
          } else if (action.payload?.assignedTo) {
            state.byId[ticketId].assignedTo = action.payload.assignedTo;
          }
          delete state.inFlight[ticketId];
        }
      });

    // ─── Change Status ──────────────────────────────────────────────────────
    builder
      .addCase(changeStatusThunk.pending, (state, action) => {
        const { ticketId, status } = action.meta.arg;
        const ticket = state.byId[ticketId];
        if (ticket) {
          state.inFlight[ticketId] = {
            action: "status",
            requestId: action.meta.requestId,
            snapshot: current(ticket),
          };
          ticket.status = status;
        }
      })
      .addCase(changeStatusThunk.fulfilled, (state, action) => {
        const { ticketId } = action.meta.arg;
        state.byId[ticketId] = action.payload.ticket;
        delete state.inFlight[ticketId];
      })
      .addCase(changeStatusThunk.rejected, (state, action) => {
        const { ticketId } = action.meta.arg;
        const inFlight = state.inFlight[ticketId];
        if (inFlight && inFlight.requestId === action.meta.requestId) {
          state.byId[ticketId] = inFlight.snapshot;
          if (action.payload?.ticket) {
            state.byId[ticketId] = action.payload.ticket;
          }
          delete state.inFlight[ticketId];
        }
      });

    // ─── Review ─────────────────────────────────────────────────────────────
    builder
      .addCase(reviewTicketThunk.pending, (state, action) => {
        const { ticketId, decision, reviewerId } = action.meta.arg;
        const ticket = state.byId[ticketId];
        if (ticket) {
          state.inFlight[ticketId] = {
            action: "review",
            requestId: action.meta.requestId,
            snapshot: current(ticket),
          };
          state.byId[ticketId] = applyReview(ticket, decision, reviewerId);
        }
      })
      .addCase(reviewTicketThunk.fulfilled, (state, action) => {
        const { ticketId } = action.meta.arg;
        state.byId[ticketId] = action.payload.ticket;
        delete state.inFlight[ticketId];
      })
      .addCase(reviewTicketThunk.rejected, (state, action) => {
        const { ticketId } = action.meta.arg;
        const inFlight = state.inFlight[ticketId];
        if (inFlight && inFlight.requestId === action.meta.requestId) {
          state.byId[ticketId] = inFlight.snapshot;
          if (action.payload?.ticket) {
            state.byId[ticketId] = action.payload.ticket;
          }
          delete state.inFlight[ticketId];
        }
      });

    // ─── Retriage ───────────────────────────────────────────────────────────
    builder
      .addCase(retriageTicketThunk.pending, (state, action) => {
        const { ticketId } = action.meta.arg;
        const ticket = state.byId[ticketId];
        if (ticket) {
          state.inFlight[ticketId] = {
            action: "retriage",
            requestId: action.meta.requestId,
            snapshot: current(ticket),
          };
        }
      })
      .addCase(retriageTicketThunk.fulfilled, (state, action) => {
        const { ticketId } = action.meta.arg;
        state.byId[ticketId] = action.payload.ticket;
        delete state.inFlight[ticketId];
      })
      .addCase(retriageTicketThunk.rejected, (state, action) => {
        const { ticketId } = action.meta.arg;
        delete state.inFlight[ticketId];
      });
  },
});

export const {
  ticketsSeeded,
  ticketReceivedFromServer,
  setBulkRunning,
  setBulkProgress,
} = ticketsSlice.actions;

export default ticketsSlice.reducer;
