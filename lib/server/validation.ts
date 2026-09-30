import type {
  Category,
  Priority,
  TicketStatus,
  TriageDecision,
} from "@/types/ticket";
import {
  VALID_CATEGORIES,
  VALID_DECISIONS,
  VALID_PRIORITIES,
  VALID_STATUSES,
} from "@/lib/tickets/filters";
import { isValidAgentId } from "@/data/agents";
import type { ListQuery } from "./ticket-store";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; details: Record<string, string> };

const ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return (
    typeof val === "object" &&
    val !== null &&
    !Array.isArray(val) &&
    Object.prototype.toString.call(val) === "[object Object]"
  );
}

export function parseTicketId(rawId: string): ValidationResult<string> {
  if (typeof rawId !== "string" || !ID_REGEX.test(rawId)) {
    return {
      ok: false,
      details: { id: "Ticket ID must match ^[A-Za-z0-9_-]{1,64}$." },
    };
  }
  return { ok: true, value: rawId };
}

export function parseListQuery(url: URL): ValidationResult<ListQuery> {
  const details: Record<string, string> = {};

  const qParam = url.searchParams.get("q");
  let q: string | undefined;
  if (qParam !== null) {
    if (qParam.length > 100) {
      details.q = "Search query cannot exceed 100 characters.";
    } else {
      q = qParam.trim();
    }
  }

  const statusParam = url.searchParams.get("status");
  let status: TicketStatus | null = null;
  if (statusParam !== null && statusParam !== "") {
    if (!VALID_STATUSES.has(statusParam as TicketStatus)) {
      details.status = `Invalid status: '${statusParam}'.`;
    } else {
      status = statusParam as TicketStatus;
    }
  }

  const priorityParam = url.searchParams.get("priority");
  let priority: Priority | null = null;
  if (priorityParam !== null && priorityParam !== "") {
    if (!VALID_PRIORITIES.has(priorityParam as Priority)) {
      details.priority = `Invalid priority: '${priorityParam}'.`;
    } else {
      priority = priorityParam as Priority;
    }
  }

  const categoryParam = url.searchParams.get("category");
  let category: Category | null = null;
  if (categoryParam !== null && categoryParam !== "") {
    if (!VALID_CATEGORIES.has(categoryParam as Category)) {
      details.category = `Invalid category: '${categoryParam}'.`;
    } else {
      category = categoryParam as Category;
    }
  }

  const decisionParam = url.searchParams.get("decision");
  let decision: TriageDecision | null = null;
  if (decisionParam !== null && decisionParam !== "") {
    if (!VALID_DECISIONS.has(decisionParam as TriageDecision)) {
      details.decision = `Invalid decision: '${decisionParam}'.`;
    } else {
      decision = decisionParam as TriageDecision;
    }
  }

  const scopeParam = url.searchParams.get("scope");
  let scope: "counts" | null = null;
  if (scopeParam !== null && scopeParam !== "") {
    if (scopeParam !== "counts") {
      details.scope = `Invalid scope: '${scopeParam}'. Only 'counts' is allowed.`;
    } else {
      scope = "counts";
    }
  }

  const limitParam = url.searchParams.get("limit");
  let limit = 50;
  if (limitParam !== null && limitParam !== "") {
    const num = Number(limitParam);
    if (!Number.isInteger(num) || num < 1 || num > 200) {
      details.limit = "Limit must be an integer between 1 and 200.";
    } else {
      limit = num;
    }
  }

  const cursorParam = url.searchParams.get("cursor");
  let cursor: string | null = null;
  if (cursorParam !== null && cursorParam !== "") {
    if (!ID_REGEX.test(cursorParam)) {
      details.cursor = "Cursor must match ^[A-Za-z0-9_-]{1,64}$.";
    } else {
      cursor = cursorParam;
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      q,
      status,
      priority,
      category,
      decision,
      scope,
      limit,
      cursor,
    },
  };
}

export function parseUpdatesQuery(
  url: URL
): ValidationResult<{ since: string; limit: number }> {
  const details: Record<string, string> = {};

  const since = url.searchParams.get("since");
  if (!since) {
    details.since = "Missing required query parameter: since.";
  } else {
    const parsed = new Date(since);
    if (isNaN(parsed.getTime())) {
      details.since = "Parameter 'since' must be a valid ISO 8601 string.";
    }
  }

  const limitParam = url.searchParams.get("limit");
  let limit = 200;
  if (limitParam !== null && limitParam !== "") {
    const num = Number(limitParam);
    if (!Number.isInteger(num) || num < 1 || num > 200) {
      details.limit = "Limit must be an integer between 1 and 200.";
    } else {
      limit = num;
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      since: since!,
      limit,
    },
  };
}

export function parseClaimBody(
  body: unknown
): ValidationResult<{ agentId: string }> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      details: { body: "Request body must be a JSON object." },
    };
  }

  const agentId = body.agentId;
  if (typeof agentId !== "string" || !isValidAgentId(agentId)) {
    return {
      ok: false,
      details: { agentId: "agentId must be one of agent-1, agent-2, agent-3." },
    };
  }

  return { ok: true, value: { agentId } };
}

export function parseStatusBody(
  body: unknown
): ValidationResult<{ agentId: string; status: TicketStatus }> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      details: { body: "Request body must be a JSON object." },
    };
  }

  const details: Record<string, string> = {};

  const agentId = body.agentId;
  if (typeof agentId !== "string" || !isValidAgentId(agentId)) {
    details.agentId = "agentId must be one of agent-1, agent-2, agent-3.";
  }

  const status = body.status;
  if (typeof status !== "string" || !VALID_STATUSES.has(status as TicketStatus)) {
    details.status = "status must be one of open, in_progress, resolved, closed.";
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    value: {
      agentId: agentId as string,
      status: status as TicketStatus,
    },
  };
}

export type ParsedTriageBody =
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

export function parseTriageBody(
  body: unknown
): ValidationResult<ParsedTriageBody> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      details: { body: "Request body must be a JSON object." },
    };
  }

  const details: Record<string, string> = {};

  const agentId = body.agentId;
  if (typeof agentId !== "string" || !isValidAgentId(agentId)) {
    details.agentId = "agentId must be one of agent-1, agent-2, agent-3.";
  }

  const decision = body.decision;
  if (decision !== "accept" && decision !== "change") {
    details.decision = "decision must be 'accept' or 'change'.";
  }

  if (decision === "accept") {
    if (Object.keys(details).length > 0) {
      return { ok: false, details };
    }
    return {
      ok: true,
      value: {
        agentId: agentId as string,
        decision: "accept",
      },
    };
  }

  if (decision === "change") {
    const rawReason = body.reason;
    if (typeof rawReason !== "string") {
      details.reason = "reason is required and must be a string.";
    } else {
      const trimmed = rawReason.trim();
      if (trimmed.length < 10) {
        details.reason = "reason must be at least 10 non-whitespace characters.";
      } else if (trimmed.length > 500) {
        details.reason = "reason cannot exceed 500 characters.";
      }
    }

    let category: Category | undefined;
    if (body.category !== undefined && body.category !== null) {
      if (
        typeof body.category !== "string" ||
        !VALID_CATEGORIES.has(body.category as Category)
      ) {
        details.category = "Invalid category value.";
      } else {
        category = body.category as Category;
      }
    }

    let priority: Priority | undefined;
    if (body.priority !== undefined && body.priority !== null) {
      if (
        typeof body.priority !== "string" ||
        !VALID_PRIORITIES.has(body.priority as Priority)
      ) {
        details.priority = "Invalid priority value.";
      } else {
        priority = body.priority as Priority;
      }
    }

    if (Object.keys(details).length > 0) {
      return { ok: false, details };
    }

    return {
      ok: true,
      value: {
        agentId: agentId as string,
        decision: "change",
        category,
        priority,
        reason: (body.reason as string).trim(),
      },
    };
  }

  return { ok: false, details };
}

export function parseRetriageBody(
  body: unknown
): ValidationResult<{ agentId: string }> {
  if (!isPlainObject(body)) {
    return {
      ok: false,
      details: { body: "Request body must be a JSON object." },
    };
  }

  const agentId = body.agentId;
  if (typeof agentId !== "string" || !isValidAgentId(agentId)) {
    return {
      ok: false,
      details: { agentId: "agentId must be one of agent-1, agent-2, agent-3." },
    };
  }

  return { ok: true, value: { agentId } };
}
