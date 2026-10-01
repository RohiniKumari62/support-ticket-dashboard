import type {
  Category,
  Plan,
  Priority,
  Ticket,
  TicketStatus,
} from "@/types/ticket";
import { isValidAgentId } from "@/data/agents";
import { canTransition } from "@/lib/tickets/transitions";
import {
  applyReview,
  isAcceptable,
  validateReviewChange,
} from "@/lib/tickets/review";
import { ticketMatchesFilters, type TicketFilters } from "@/lib/tickets/filters";
import { isCountedTicket } from "@/lib/tickets/counts";
import { compareTickets } from "@/lib/tickets/sort";
import { createRng } from "./rng";

export type StoreResult<T> =
  | ({ ok: true } & T)
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      ticket?: Ticket;
      details?: Record<string, string>;
    };

export interface CreateTicketStoreOptions {
  tickets: Ticket[];
  duplicatesRemoved?: number;
  now?: number;
  random?: () => number;
  instanceId?: string;
}

export interface ListQuery {
  q?: string;
  status?: TicketStatus | null;
  priority?: Priority | null;
  category?: Category | null;
  decision?: "auto_accept" | "manual_review" | null;
  scope?: "counts" | null;
  limit?: number;
  cursor?: string | null;
}

export class TicketStore {
  private tickets: Map<string, Ticket>;
  private orderedIds: string[];
  private arrivals: Map<string, number>;
  private seedTime: number;
  private lastStamp: number;
  public instanceId: string;
  private rand: () => number;
  private duplicatesRemoved: number;
  private nextEventAt: number;
  private nextGeneratedId: number;

  constructor(options: CreateTicketStoreOptions) {
    const nowMs = options.now ?? Date.now();
    this.seedTime = nowMs;
    this.lastStamp = nowMs;
    this.rand = options.random ?? createRng(1337);
    this.instanceId =
      options.instanceId ??
      `inst_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    this.duplicatesRemoved = options.duplicatesRemoved ?? 0;
    this.nextEventAt = nowMs + Math.floor(5000 + this.rand() * 5000);
    this.nextGeneratedId = 50000;

    this.tickets = new Map();
    this.arrivals = new Map();

    for (const t of options.tickets) {
      this.tickets.set(t.id, t);
    }

    // Sort initially by the canonical comparator
    this.orderedIds = [...options.tickets]
      .sort(compareTickets)
      .map((t) => t.id);
  }

  private stamp(preferredMs?: number): string {
    const target = preferredMs ?? Date.now();
    const s = Math.max(target, this.lastStamp + 1);
    this.lastStamp = s;
    return new Date(s).toISOString();
  }

  public getSeedTime(): number {
    return this.seedTime;
  }

  public getDuplicatesRemoved(): number {
    return this.duplicatesRemoved;
  }

  public list(query: ListQuery): StoreResult<{
    tickets: Ticket[];
    nextCursor: string | null;
    total: number;
    serverTime: string;
    instanceId: string;
    duplicatesRemoved: number;
  }> {
    const isCountsScope = query.scope === "counts";
    const limit = query.limit ?? (isCountsScope ? Number.MAX_SAFE_INTEGER : 50);

    const filterObj: TicketFilters = {
      q: query.q ?? "",
      status: query.status ?? null,
      priority: query.priority ?? null,
      category: query.category ?? null,
      decision: query.decision ?? null,
    };

    // Helper predicate
    const matches = (t: Ticket): boolean => {
      if (isCountsScope && !isCountedTicket(t)) {
        return false;
      }
      return ticketMatchesFilters(t, filterObj);
    };

    // Calculate total matching tickets
    let total = 0;
    const matchingIds: string[] = [];

    for (const id of this.orderedIds) {
      const t = this.tickets.get(id);
      if (t && matches(t)) {
        total++;
        matchingIds.push(id);
      }
    }

    let startIndex = 0;
    if (query.cursor) {
      // Unknown cursor check: must exist in the store
      if (!this.tickets.has(query.cursor)) {
        return {
          ok: false,
          status: 400,
          code: "invalid_cursor",
          message: "Cursor not found in tickets list.",
        };
      }
      const idxInMatching = matchingIds.indexOf(query.cursor);
      if (idxInMatching === -1) {
        // Find cursor position in orderedIds and scan forward
        const cursorOrderedIdx = this.orderedIds.indexOf(query.cursor);
        let foundStart = matchingIds.length;
        for (let i = 0; i < matchingIds.length; i++) {
          const ordIdx = this.orderedIds.indexOf(matchingIds[i]);
          if (ordIdx > cursorOrderedIdx) {
            foundStart = i;
            break;
          }
        }
        startIndex = foundStart;
      } else {
        startIndex = idxInMatching + 1;
      }
    }

    const pageIds = matchingIds.slice(startIndex, startIndex + limit);
    const pageTickets: Ticket[] = [];
    for (const id of pageIds) {
      const t = this.tickets.get(id);
      if (t) pageTickets.push(t);
    }

    const hasMore = startIndex + limit < matchingIds.length;
    const nextCursor =
      hasMore && pageTickets.length > 0
        ? pageTickets[pageTickets.length - 1].id
        : null;

    return {
      ok: true,
      tickets: pageTickets,
      nextCursor,
      total,
      serverTime: this.stamp(),
      instanceId: this.instanceId,
      duplicatesRemoved: this.duplicatesRemoved,
    };
  }

  public get(id: string): StoreResult<{
    ticket: Ticket;
    serverTime: string;
    instanceId: string;
  }> {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: `Ticket ${id} not found.`,
      };
    }

    return {
      ok: true,
      ticket,
      serverTime: this.stamp(),
      instanceId: this.instanceId,
    };
  }

  public claim(
    id: string,
    agentId: string,
    options: { forceConflict?: boolean } = {}
  ): StoreResult<{ ticket: Ticket }> {
    if (!isValidAgentId(agentId)) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "Invalid agent ID.",
      };
    }

    const ticket = this.tickets.get(id);
    if (!ticket) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: `Ticket ${id} not found.`,
      };
    }

    if (ticket.status === "closed" || ticket.status === "resolved") {
      return {
        ok: false,
        status: 409,
        code: "invalid_transition",
        message: `Cannot claim a ${ticket.status} ticket.`,
        ticket,
      };
    }

    // Idempotent claim by the same agent
    if (ticket.assignedTo === agentId) {
      return {
        ok: true,
        ticket,
      };
    }

    // Already assigned to someone else
    if (ticket.assignedTo && ticket.assignedTo !== agentId) {
      return {
        ok: false,
        status: 409,
        code: "conflict",
        message: "Ticket is already claimed by another agent.",
        ticket,
      };
    }

    // Already assigned to an unknown agent
    if (ticket.assignedToUnknown) {
      return {
        ok: false,
        status: 409,
        code: "conflict",
        message: "Ticket is already assigned to an unknown agent.",
        ticket,
      };
    }

    // If forced claim conflict: assign to a different agent and bump version
    if (options.forceConflict) {
      const otherAgents = ["agent-1", "agent-2", "agent-3"].filter(
        (a) => a !== agentId
      );
      const winner =
        otherAgents[Math.floor(this.rand() * otherAgents.length)] || "agent-2";
      const updatedTicket: Ticket = {
        ...ticket,
        assignedTo: winner,
        version: ticket.version + 1,
        updatedAt: this.stamp(),
      };
      this.tickets.set(id, updatedTicket);

      return {
        ok: false,
        status: 409,
        code: "conflict",
        message: "Ticket was claimed by another agent concurrently.",
        ticket: updatedTicket,
      };
    }

    // Normal claim
    const updatedTicket: Ticket = {
      ...ticket,
      assignedTo: agentId,
      version: ticket.version + 1,
      updatedAt: this.stamp(),
    };
    this.tickets.set(id, updatedTicket);

    return {
      ok: true,
      ticket: updatedTicket,
    };
  }

  public setStatus(
    id: string,
    agentId: string,
    status: TicketStatus
  ): StoreResult<{ ticket: Ticket }> {
    if (!isValidAgentId(agentId)) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "Invalid agent ID.",
      };
    }

    const ticket = this.tickets.get(id);
    if (!ticket) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: `Ticket ${id} not found.`,
      };
    }

    if (!canTransition(ticket.status, status)) {
      return {
        ok: false,
        status: 409,
        code: "invalid_transition",
        message: `Cannot transition from ${ticket.status} to ${status}.`,
        ticket,
      };
    }

    // Assignee check
    if (!ticket.assignedTo) {
      if (ticket.status === "open" && status === "in_progress") {
        return {
          ok: false,
          status: 409,
          code: "claim_required",
          message: "Ticket must be claimed before starting progress.",
          ticket,
        };
      }
      return {
        ok: false,
        status: 403,
        code: "not_assignee",
        message: "Only the assigned agent can update status.",
        ticket,
      };
    }

    if (ticket.assignedTo !== agentId) {
      return {
        ok: false,
        status: 403,
        code: "not_assignee",
        message: "Only the assigned agent can update status.",
        ticket,
      };
    }

    const updatedTicket: Ticket = {
      ...ticket,
      status,
      version: ticket.version + 1,
      updatedAt: this.stamp(),
    };
    this.tickets.set(id, updatedTicket);

    return {
      ok: true,
      ticket: updatedTicket,
    };
  }

  public review(
    id: string,
    agentId: string,
    decision:
      | { type: "accept" }
      | {
          type: "change";
          category: Category;
          priority: Priority;
          reason: string;
        }
  ): StoreResult<{ ticket: Ticket }> {
    if (!isValidAgentId(agentId)) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "Invalid agent ID.",
      };
    }

    const ticket = this.tickets.get(id);
    if (!ticket) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: `Ticket ${id} not found.`,
      };
    }

    if (ticket.triageDecision !== "manual_review" || ticket.humanReview != null) {
      return {
        ok: false,
        status: 409,
        code: "not_in_review",
        message: "Ticket is not in the manual review queue or was already handled.",
        ticket,
      };
    }

    let updated: Ticket;

    if (decision.type === "accept") {
      if (!isAcceptable(ticket)) {
        return {
          ok: false,
          status: 422,
          code: "validation_failed",
          message: "Invalid AI values cannot be accepted. Use Change.",
          details: { form: "Invalid AI values cannot be accepted. Use Change." },
          ticket,
        };
      }
      updated = applyReview(ticket, { type: "accept" }, agentId);
    } else {
      const val = validateReviewChange(ticket, {
        category: decision.category,
        priority: decision.priority,
        reason: decision.reason,
      });

      if (!val.ok) {
        return {
          ok: false,
          status: 422,
          code: "validation_failed",
          message: "Validation failed for review change.",
          details: val.errors as Record<string, string>,
          ticket,
        };
      }
      updated = applyReview(
        ticket,
        {
          type: "change",
          category: decision.category,
          priority: decision.priority,
          reason: decision.reason,
        },
        agentId
      );
    }

    const finalTicket: Ticket = {
      ...updated,
      version: ticket.version + 1,
      updatedAt: this.stamp(),
    };
    this.tickets.set(id, finalTicket);

    return {
      ok: true,
      ticket: finalTicket,
    };
  }

  public applyAiResult(
    id: string,
    aiData: {
      category: Category;
      priority: Priority;
      summary: string;
      aiPriority?: Priority | null;
      reviewReason?: string | null;
    }
  ): StoreResult<{ ticket: Ticket }> {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: `Ticket ${id} not found.`,
      };
    }

    const updated: Ticket = {
      ...ticket,
      category: aiData.category,
      priority: aiData.priority,
      summary: aiData.summary,
      aiPriority: aiData.aiPriority ?? ticket.aiPriority,
      reviewReason: aiData.reviewReason ?? ticket.reviewReason,
      version: ticket.version + 1,
      updatedAt: this.stamp(),
    };
    this.tickets.set(id, updated);

    return {
      ok: true,
      ticket: updated,
    };
  }

  public flagInvalidAiOutput(id: string): StoreResult<{ ticket: Ticket }> {
    const ticket = this.tickets.get(id);
    if (!ticket) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: `Ticket ${id} not found.`,
      };
    }

    const updated: Ticket = {
      ...ticket,
      triageDecision: "manual_review",
      reviewReason: "invalid_output",
      version: ticket.version + 1,
      updatedAt: this.stamp(),
    };
    this.tickets.set(id, updated);

    return {
      ok: true,
      ticket: updated,
    };
  }

  public updates(
    sinceIso: string,
    limit: number = 200
  ): StoreResult<{
    created: Ticket[];
    updated: Ticket[];
    serverTime: string;
    hasMore: boolean;
    instanceId: string;
  }> {
    const parsed = new Date(sinceIso);
    if (isNaN(parsed.getTime())) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "Invalid since parameter: must be a valid ISO 8601 string.",
      };
    }

    // Clamp since to be strictly > seedTime so seeded unchanged tickets are never returned
    const clampedSinceMs = Math.max(parsed.getTime(), this.seedTime + 1);

    const changedTickets: Ticket[] = [];
    for (const t of this.tickets.values()) {
      const updatedMs = new Date(t.updatedAt).getTime();
      if (updatedMs >= clampedSinceMs) {
        changedTickets.push(t);
      }
    }

    // Sort ascending by updatedAt
    changedTickets.sort(
      (a, b) =>
        new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const hasMore = changedTickets.length > safeLimit;
    const page = changedTickets.slice(0, safeLimit);

    let returnServerTime: string;
    if (hasMore && page.length > 0) {
      returnServerTime = page[page.length - 1].updatedAt;
    } else {
      returnServerTime = this.stamp();
    }

    const created: Ticket[] = [];
    const updated: Ticket[] = [];

    for (const t of page) {
      const arrival = this.arrivals.get(t.id);
      if (arrival != null && arrival >= clampedSinceMs) {
        created.push(t);
      } else {
        updated.push(t);
      }
    }

    return {
      ok: true,
      created,
      updated,
      serverTime: returnServerTime,
      hasMore,
      instanceId: this.instanceId,
    };
  }

  public tick(nowMs: number = Date.now()): void {
    if (this.nextEventAt > nowMs) {
      return;
    }

    let materialized = 0;
    while (this.nextEventAt <= nowMs && materialized < 10) {
      const eventTime = this.nextEventAt;
      const roll = this.rand();

      if (roll < 0.6) {
        // ~60% create new ticket
        this.materializeNewTicket(eventTime);
      } else if (roll < 0.85) {
        // ~25% another agent claims an open unassigned ticket
        const claimed = this.materializeAgentClaim(eventTime);
        if (!claimed) {
          this.materializeNewTicket(eventTime);
        }
      } else {
        // ~15% closes a ticket
        const closed = this.materializeCloseTicket(eventTime);
        if (!closed) {
          this.materializeNewTicket(eventTime);
        }
      }

      materialized++;
      this.nextEventAt += Math.floor(5000 + this.rand() * 5000);
    }

    if (materialized >= 10) {
      // If capped, reset nextEventAt to nowMs + 5-10s to avoid floods
      this.nextEventAt = nowMs + Math.floor(5000 + this.rand() * 5000);
    }
  }

  private materializeNewTicket(eventTime: number): Ticket {
    const id = `T-${++this.nextGeneratedId}`;
    const stampIso = this.stamp(eventTime);

    const planRoll = this.rand();
    let plan: Plan = "free";
    if (planRoll < 0.15) plan = "enterprise";
    else if (planRoll < 0.5) plan = "pro";

    const categories: Category[] = [
      "billing",
      "bug",
      "account_access",
      "feature_request",
      "other",
    ];
    const category = categories[Math.floor(this.rand() * categories.length)];

    const priorities: Priority[] = ["P0", "P1", "P2", "P3"];
    let priority: Priority = priorities[Math.floor(this.rand() * priorities.length)];
    if (plan === "enterprise" && (priority === "P2" || priority === "P3")) {
      priority = "P1";
    }

    const isManual = this.rand() < 0.15;
    const triageDecision = isManual ? "manual_review" : "auto_accept";
    const reviewReason = isManual ? "New live incoming ticket flagged for verification" : null;

    const newTicket: Ticket = {
      id,
      customerId: `C-${Math.floor(2000 + this.rand() * 5000)}`,
      plan,
      subject: `Live inquiry: ${category.replace("_", " ")} issue #${id}`,
      body: `Customer reported an urgent issue regarding ${category.replace("_", " ")}.`,
      attachmentUrl: null,
      createdAt: stampIso,
      status: "open",
      assignedTo: null,
      assignedToUnknown: null,
      category,
      priority,
      aiPriority: null,
      summary: `Automated live intake for ${category}.`,
      triageDecision,
      reviewReason,
      dataIssues: [],
      humanReview: null,
      version: 1,
      updatedAt: stampIso,
    };

    this.tickets.set(id, newTicket);
    this.arrivals.set(id, eventTime);
    this.orderedIds.unshift(id); // Insert at index 0 (top)

    return newTicket;
  }

  private materializeAgentClaim(eventTime: number): boolean {
    const windowIds = this.orderedIds.slice(0, 200);
    const candidates: Ticket[] = [];

    for (const id of windowIds) {
      const t = this.tickets.get(id);
      if (t && t.status === "open" && !t.assignedTo) {
        candidates.push(t);
      }
    }

    if (candidates.length === 0) {
      return false;
    }

    const candidate = candidates[Math.floor(this.rand() * candidates.length)];
    const agentId = `agent-${Math.floor(this.rand() * 3) + 1}`;
    const updated: Ticket = {
      ...candidate,
      assignedTo: agentId,
      version: candidate.version + 1,
      updatedAt: this.stamp(eventTime),
    };
    this.tickets.set(candidate.id, updated);
    return true;
  }

  private materializeCloseTicket(eventTime: number): boolean {
    const windowIds = this.orderedIds.slice(0, 300);
    const candidates: Ticket[] = [];

    for (const id of windowIds) {
      const t = this.tickets.get(id);
      if (t && t.status === "in_progress") {
        candidates.push(t);
      }
    }

    if (candidates.length === 0) {
      return false;
    }

    const candidate = candidates[Math.floor(this.rand() * candidates.length)];
    const updated: Ticket = {
      ...candidate,
      status: "closed",
      version: candidate.version + 1,
      updatedAt: this.stamp(eventTime),
    };
    this.tickets.set(candidate.id, updated);
    return true;
  }
}

export function createTicketStore(
  options: CreateTicketStoreOptions
): TicketStore {
  return new TicketStore(options);
}
