import { handle, json, apiError } from "@/lib/server/http";
import { parseUpdatesQuery } from "@/lib/server/validation";
import { getTicketStore } from "@/lib/server/get-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  return handle(request, undefined, async (req) => {
    const url = new URL(req.url);
    const parsedQuery = parseUpdatesQuery(url);

    if (!parsedQuery.ok) {
      return apiError(
        "invalid_request",
        "Invalid query parameters for updates.",
        400,
        { details: parsedQuery.details }
      );
    }

    const store = getTicketStore();
    const result = store.updates(
      parsedQuery.value.since,
      parsedQuery.value.limit
    );

    if (!result.ok) {
      return apiError(result.code, result.message, result.status);
    }

    return json({
      created: result.created,
      updated: result.updated,
      serverTime: result.serverTime,
      hasMore: result.hasMore,
      instanceId: result.instanceId,
    });
  });
}
