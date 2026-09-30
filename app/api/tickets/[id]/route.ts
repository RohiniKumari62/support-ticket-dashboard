import { handle, json, apiError } from "@/lib/server/http";
import { parseTicketId } from "@/lib/server/validation";
import { getTicketStore } from "@/lib/server/get-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  return handle(request, context, async (_req, ctx) => {
    const rawParams = await ctx.params;
    const parsedId = parseTicketId(rawParams?.id);

    if (!parsedId.ok) {
      return apiError("invalid_request", "Malformed ticket ID.", 400, {
        details: parsedId.details,
      });
    }

    const store = getTicketStore();
    const result = store.get(parsedId.value);

    if (!result.ok) {
      return apiError(result.code, result.message, result.status);
    }

    return json({
      ticket: result.ticket,
      serverTime: result.serverTime,
      instanceId: result.instanceId,
    });
  });
}
