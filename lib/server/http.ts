import type { Ticket } from "@/types/ticket";
import { getServerConfig } from "./config";
import { createChaos } from "./chaos";
import { getTicketStore } from "./get-store";

export const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Content-Type": "application/json",
};

export function json(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  extra?: { ticket?: Ticket; details?: Record<string, string> }
): Response {
  const body: {
    error: { code: string; message: string; details?: Record<string, string> };
    ticket?: Ticket;
  } = {
    error: {
      code,
      message,
      ...(extra?.details ? { details: extra.details } : {}),
    },
    ...(extra?.ticket ? { ticket: extra.ticket } : {}),
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

export type ReadJsonBodyResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function readJsonBody<T = unknown>(
  request: Request
): Promise<ReadJsonBodyResult<T>> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: apiError(
        "unsupported_media_type",
        "Content-Type must be application/json.",
        415
      ),
    };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return {
      ok: false,
      response: apiError("invalid_request", "Failed to read request body.", 400),
    };
  }

  if (new TextEncoder().encode(text).length > 10240) {
    return {
      ok: false,
      response: apiError(
        "payload_too_large",
        "Request payload exceeds 10 KB limit.",
        413
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      response: apiError("invalid_request", "Malformed JSON body.", 400),
    };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    Object.prototype.toString.call(parsed) !== "[object Object]"
  ) {
    return {
      ok: false,
      response: apiError(
        "invalid_request",
        "Request body must be a JSON object.",
        400
      ),
    };
  }

  return { ok: true, data: parsed as T };
}

export async function handle<TContext = unknown>(
  request: Request,
  ctx: TContext,
  fn: (req: Request, context: TContext) => Promise<Response>
): Promise<Response> {
  const config = getServerConfig();
  const chaos = createChaos({ enabled: config.chaos });
  const store = getTicketStore();

  try {
    // 1. Chaos delay
    await chaos.delay();

    // 2. Advance store tick
    store.tick();

    // 3. Random chaos failure BEFORE any mutation occurs
    if (chaos.shouldFail()) {
      const code = Math.random() < 0.5 ? "internal_error" : "service_unavailable";
      const status = code === "internal_error" ? 500 : 503;
      return apiError(code, "A temporary server failure occurred. Try again.", status);
    }

    // 4. Run handler
    return await fn(request, ctx);
  } catch (err) {
    // 5. Catch unexpected exceptions — never leak internal details or customer content
    console.error("[API Internal Error]", err instanceof Error ? err.name : "Error");
    return apiError(
      "internal_error",
      "An unexpected server error occurred. Try again.",
      500
    );
  }
}
