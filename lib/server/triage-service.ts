import type { Category, Plan, Priority } from "@/types/ticket";
import { VALID_CATEGORIES, VALID_PRIORITIES } from "@/lib/tickets/filters";

export class TriageServiceError extends Error {
  public code: "unauthorized" | "unavailable";

  constructor(code: "unauthorized" | "unavailable", message?: string) {
    super(message || code);
    this.name = "TriageServiceError";
    this.code = code;
  }
}

export interface RunTriageParams {
  apiKey: string;
  subject?: string | null;
  body?: string | null;
  plan?: Plan | null;
  currentPriority?: Priority | null;
  aiPriority?: Priority | null;
}

export interface ValidatedAiOutput {
  category: Category;
  priority: Priority;
  summary: string;
}

/**
 * Validates untrusted AI output.
 * - category must be allowed enum
 * - priority must be allowed enum
 * - summary must be a non-empty string <= 300 chars after trimming and removing control chars
 * Anything else returns null.
 */
export function parseAiOutput(output: unknown): ValidatedAiOutput | null {
  if (typeof output !== "object" || output === null || Array.isArray(output)) {
    return null;
  }

  const obj = output as Record<string, unknown>;

  const category = obj.category;
  if (
    typeof category !== "string" ||
    !VALID_CATEGORIES.has(category as Category)
  ) {
    return null;
  }

  const priority = obj.priority;
  if (
    typeof priority !== "string" ||
    !VALID_PRIORITIES.has(priority as Priority)
  ) {
    return null;
  }

  const rawSummary = obj.summary;
  if (typeof rawSummary !== "string") {
    return null;
  }

  const cleanSummary = rawSummary
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();

  if (cleanSummary.length === 0 || cleanSummary.length > 300) {
    return null;
  }

  return {
    category: category as Category,
    priority: priority as Priority,
    summary: cleanSummary,
  };
}

/**
 * Fake AI triage service. Returns untyped output on purpose.
 */
export async function runTriageService(
  params: RunTriageParams,
  options: { random?: () => number } = {}
): Promise<unknown> {
  const { apiKey, subject = "", body = "", currentPriority, aiPriority } = params;
  const rand = options.random ?? Math.random;

  if (!apiKey || apiKey.trim() === "") {
    throw new TriageServiceError("unauthorized", "API key missing or empty.");
  }

  // 5% unavailable error
  const failRoll = rand();
  if (failRoll < 0.05) {
    throw new TriageServiceError("unavailable", "AI service is currently unavailable.");
  }

  // 12% malformed or hostile output
  if (failRoll < 0.17) {
    const malformedType = rand();
    if (malformedType < 0.33) {
      // Bad enum (e.g. priority P5 or invalid category)
      return {
        category: "urgent_billing",
        priority: "P5",
        summary: "Malformed triage suggestion",
      };
    } else if (malformedType < 0.66) {
      // Non-string summary
      return {
        category: "billing",
        priority: "P2",
        summary: null,
      };
    } else {
      // Hostile HTML summary (valid string, tests safe text rendering)
      return {
        category: "bug",
        priority: "P1",
        summary: '<img src=x onerror=alert("hacked")> System diagnostic',
      };
    }
  }

  // Normal keyword-based classification
  const combined = `${subject ?? ""} ${body ?? ""}`.toLowerCase();
  let category: Category = "other";
  if (/(refund|invoice|charged|billing)/.test(combined)) {
    category = "billing";
  } else if (/(login|password|sso|locked)/.test(combined)) {
    category = "account_access";
  } else if (/(error|bug|crash|fail|not working|does nothing)/.test(combined)) {
    category = "bug";
  } else if (/(would love|feature|please add)/.test(combined)) {
    category = "feature_request";
  }

  // Priority: use ticket's aiPriority ?? currentPriority ?? "P3"
  // Customer text can NEVER raise priority (prompt injection in T-2003 ignored)
  const priority: Priority = aiPriority ?? currentPriority ?? "P3";

  const summary =
    subject && subject.trim().length > 0
      ? subject.trim().slice(0, 100)
      : "Automated triage summary";

  return {
    category,
    priority,
    summary,
  };
}
