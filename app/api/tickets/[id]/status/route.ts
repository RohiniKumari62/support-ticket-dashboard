import { handle, json, apiError, readJsonBody } from "@/lib/server/http";
import { parseTicketId, parseStatusBody } from "@/lib/server/validation";
import { getTicketStore } from "@/lib/server/get-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function PATCH(
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

    const parsedBody = parseStatusBody(bodyRes.data);
    if (!parsedBody.ok) {
      return apiError("invalid_request", "Invalid request body.", 400, {
        details: parsedBody.details,
      });
    }

    const store = getTicketStore();
    const result = store.setStatus(
      parsedId.value,
      parsedBody.value.agentId,
      parsedBody.value.status
    );

    if (!result.ok) {
      return apiError(result.code, result.message, result.status, {
        ticket: result.ticket,
      });
    }

    return json({ ticket: result.ticket });
  });
}
