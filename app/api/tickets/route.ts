import { handle, json, apiError } from "@/lib/server/http";
import { parseListQuery } from "@/lib/server/validation";
import { getTicketStore } from "@/lib/server/get-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handle(request, undefined, async (req) => {
    const url = new URL(req.url);
    const parsedQuery = parseListQuery(url);

    if (!parsedQuery.ok) {
      return apiError(
        "invalid_request",
        "Invalid query parameters.",
        400,
        { details: parsedQuery.details }
      );
    }

    const store = getTicketStore();
    const result = store.list(parsedQuery.value);

    if (!result.ok) {
      return apiError(result.code, result.message, result.status, {
        details: result.details,
      });
    }

    return json({
      tickets: result.tickets,
      nextCursor: result.nextCursor,
      total: result.total,
      serverTime: result.serverTime,
      instanceId: result.instanceId,
      duplicatesRemoved: result.duplicatesRemoved,
    });
  });
}
