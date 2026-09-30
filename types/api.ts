import type { Category, Priority, Ticket, TicketStatus } from "./ticket";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface ApiErrorResponse {
  error: ApiErrorPayload;
  ticket?: Ticket;
}

export interface GetTicketsResponse {
  tickets: Ticket[];
  nextCursor: string | null;
  total: number;
  serverTime: string;
  instanceId: string;
  duplicatesRemoved: number;
}

export interface GetTicketResponse {
  ticket: Ticket;
  serverTime: string;
  instanceId: string;
}

export interface ClaimTicketBody {
  agentId: string;
}

export interface PatchStatusBody {
  agentId: string;
  status: TicketStatus;
}

export type PatchTriageBody =
  | {
      agentId: string;
      decision: "accept";
    }
  | {
      agentId: string;
      decision: "change";
      category?: Category;
      priority?: Priority;
      reason: string;
    };

export interface PostRetriageBody {
  agentId: string;
}

export interface TicketMutationResponse {
  ticket: Ticket;
}

export interface GetUpdatesResponse {
  created: Ticket[];
  updated: Ticket[];
  serverTime: string;
  hasMore: boolean;
  instanceId: string;
}
