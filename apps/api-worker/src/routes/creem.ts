import { json } from "../lib/response";
import { handleCreemWebhook } from "../lib/creem";
import { logger } from "../lib/logger";

export async function handleCreemRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/webhook/creem") {
    return null;
  }

  if (request.method !== "POST") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const signature = request.headers.get("creem-signature");
    if (!signature) {
      return json({ error: "MISSING_SIGNATURE" }, 401);
    }

    const body = (await request.json()) as { type?: string; [key: string]: unknown };
    logger.info("[creem] webhook", { type: body?.type, timestamp: new Date().toISOString() });

    await handleCreemWebhook(body);
    return json({ received: true });
  } catch (error) {
    console.error("[creem] webhook failed", error);
    return json({ error: "WEBHOOK_HANDLER_FAILED" }, 500);
  }
}
