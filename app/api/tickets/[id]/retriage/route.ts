import { handle, json, apiError, readJsonBody } from "@/lib/server/http";
import { parseTicketId, parseRetriageBody } from "@/lib/server/validation";
import { getTicketStore } from "@/lib/server/get-store";
import { getServerConfig } from "@/lib/server/config";
import {
  parseAiOutput,
  runTriageService,
  TriageServiceError,
} from "@/lib/server/triage-service";
import { applyEnterpriseFloor } from "@/lib/tickets/rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  return handle(request, context, async (req, ctx) => {
    const rawParams = await ctx.params;
    const parsedId = parseTicketId(rawParams?.id);

    if (!parsedId.ok) {
      return apiError("invalid_request", "Malformed ticket ID.", 400, {
        details: parsedId.details,
      });
    }

    const bodyRes = await readJsonBody(req);
    if (!bodyRes.ok) {
      return bodyRes.response;
    }

    const parsedBody = parseRetriageBody(bodyRes.data);
    if (!parsedBody.ok) {
      return apiError("invalid_request", "Invalid request body.", 400, {
        details: parsedBody.details,
      });
    }

    const store = getTicketStore();
    const getRes = store.get(parsedId.value);
    if (!getRes.ok) {
      return apiError(getRes.code, getRes.message, getRes.status);
    }

    const ticket = getRes.ticket;

    // Closed tickets cannot be retriaged
    if (ticket.status === "closed") {
      return apiError(
        "invalid_transition",
        "Closed tickets cannot be re-triaged.",
        409,
        { ticket }
      );
    }

    // Tickets already reviewed by a human cannot have their decisions overwritten
    if (ticket.humanReview !== null) {
      return apiError(
        "already_reviewed",
        "This ticket was already reviewed by an agent. AI cannot overwrite human decisions.",
        409,
        { ticket }
      );
    }

    // Empty tickets cannot be retriaged
    const hasSubject = typeof ticket.subject === "string" && ticket.subject.trim().length > 0;
    const hasBody = typeof ticket.body === "string" && ticket.body.trim().length > 0;
    if (!hasSubject && !hasBody) {
      return apiError(
        "unprocessable",
        "There isn't enough content to analyse.",
        422,
        { ticket }
      );
    }

    // Read server-only secret
    const config = getServerConfig();
    if (!config.triageApiKey) {
      return apiError(
        "triage_not_configured",
        "Re-run AI isn't configured on this server.",
        503
      );
    }

    // Call AI service
    let aiRawOutput: unknown;
    try {
      aiRawOutput = await runTriageService({
        apiKey: config.triageApiKey,
        subject: ticket.subject,
        body: ticket.body,
        plan: ticket.plan,
        currentPriority: ticket.priority,
        aiPriority: ticket.aiPriority,
      });
    } catch (err) {
      if (err instanceof TriageServiceError) {
        if (err.code === "unauthorized") {
          return apiError(
            "triage_not_configured",
            "Re-run AI isn't configured on this server.",
            503
          );
        }
        return apiError(
          "ai_unavailable",
          "The AI service is unavailable. Try again.",
          502
        );
      }
      return apiError(
        "ai_unavailable",
        "The AI service is unavailable. Try again.",
        502
      );
    }

    // Validate untrusted AI output
    const validated = parseAiOutput(aiRawOutput);
    if (!validated) {
      // AI values NOT applied; ticket flagged manual_review / invalid_output
      const flagRes = store.flagInvalidAiOutput(ticket.id);
      return apiError(
        "ai_invalid_output",
        "The AI returned invalid output. The ticket was flagged for review.",
        502,
        { ticket: flagRes.ok ? flagRes.ticket : ticket }
      );
    }

    // Apply enterprise floor
    const finalPriority = applyEnterpriseFloor(ticket.plan, validated.priority);
    let reviewReason = ticket.reviewReason;
    let aiPriority = ticket.aiPriority;

    if (
      ticket.plan === "enterprise" &&
      finalPriority !== validated.priority &&
      validated.priority !== null
    ) {
      aiPriority = validated.priority;
      reviewReason = "rule_adjusted";
    }

    const applyRes = store.applyAiResult(ticket.id, {
      category: validated.category,
      priority: finalPriority!,
      summary: validated.summary,
      aiPriority,
      reviewReason,
    });

    if (!applyRes.ok) {
      return apiError(applyRes.code, applyRes.message, applyRes.status);
    }

    return json({ ticket: applyRes.ticket });
  });
}
