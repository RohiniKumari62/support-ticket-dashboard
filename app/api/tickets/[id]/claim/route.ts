import { handle, json, apiError, readJsonBody } from "@/lib/server/http";
import { parseTicketId, parseClaimBody } from "@/lib/server/validation";
import { getTicketStore } from "@/lib/server/get-store";
import { getServerConfig } from "@/lib/server/config";
import { createChaos } from "@/lib/server/chaos";

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

    const parsedBody = parseClaimBody(bodyRes.data);
    if (!parsedBody.ok) {
      return apiError("invalid_request", "Invalid request body.", 400, {
        details: parsedBody.details,
      });
    }

    const config = getServerConfig();
    const chaos = createChaos({ enabled: config.chaos });
    const forceConflict = chaos.shouldForceClaimConflict();

    const store = getTicketStore();
    const result = store.claim(parsedId.value, parsedBody.value.agentId, {
      forceConflict,
    });

    if (!result.ok) {
      return apiError(result.code, result.message, result.status, {
        ticket: result.ticket,
      });
    }

    return json({ ticket: result.ticket });
  });
}
