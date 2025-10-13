import { logger } from "./logger";

export interface CreemWebhookEvent {
  type?: string;
  data?: unknown;
}

export async function handleCreemWebhook(event: CreemWebhookEvent): Promise<void> {
  const type = event?.type ?? "unknown";
  logger.info("[creem] webhook event", type, event?.data);
}
