import { json } from "../lib/response";
import { SupabaseAdminClient } from "../lib/supabase";
import { AuthEnv } from "../lib/types";
import { logger } from "../lib/logger";
import { cachedEncodeURIComponent } from "../lib/url-cache";

const encoder = new TextEncoder();

interface StripeEnv extends AuthEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

export async function handleStripeWebhook(request: Request, env: StripeEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/webhook/stripe") {
    return null;
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({ error: "WEBHOOK_SECRET_MISSING" }, 500);
  }

  const valid = await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, signatureHeader);
  if (!valid) {
    return json({ error: "INVALID_SIGNATURE" }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (error) {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const supabase = new SupabaseAdminClient(env);

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        logger.info("[stripe] payment_intent.succeeded", event.data?.object?.id);
        break;

      case "customer.subscription.created":
        logger.info("[stripe] subscription.created", event.data?.object?.id);
        break;

      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data?.object, supabase);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data?.object, supabase);
        break;

      case "customer.subscription.deleted":
        logger.info("[stripe] subscription.deleted", event.data?.object?.id);
        break;

      default:
        logger.debug(`[stripe] unhandled event ${event.type}`);
    }
  } catch (error) {
    console.error("[stripe] webhook handler failed", error);
    return json({ error: "WEBHOOK_HANDLER_FAILED" }, 500);
  }

  return json({ received: true });
}

async function handleCheckoutCompleted(session: any, supabase: SupabaseAdminClient) {
  if (!session?.metadata) {
    console.warn("[stripe] checkout.session.completed missing metadata");
    return;
  }

  if (session.metadata.project !== "ai-video-generator") {
    return;
  }

  const userId = session.metadata.userId;
  const credit = Number(session.metadata.credit || 0);
  const paymentHistoryId = session.metadata.paymentHistoryId;

  if (!userId || !paymentHistoryId) {
    console.warn("[stripe] checkout session missing userId or paymentHistoryId");
    return;
  }

  const currentDate = new Date();
  let periodEnd = new Date(currentDate);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const usage = await supabase.selectSingle<any>(
    `credit_usage?user_id=eq.${cachedEncodeURIComponent(userId)}&select=*`
  );

  if (!usage) {
    await supabase.insert("credit_usage", {
      user_id: userId,
      user_subscriptions_id: -1,
      is_subscription_active: false,
      used_count: 0,
      period_remain_count: credit,
      period_start: currentDate.toISOString(),
      period_end: periodEnd.toISOString(),
      created_at: currentDate.toISOString()
    });
  } else {
    const updates: Record<string, unknown> = {
      period_remain_count: Number(usage.period_remain_count || 0) + credit,
      period_end: usage.period_end && new Date(usage.period_end) > periodEnd ? usage.period_end : periodEnd.toISOString(),
      updated_at: new Date().toISOString()
    };
    await supabase.patch("credit_usage", `user_id=eq.${cachedEncodeURIComponent(userId)}`, updates, { prefer: "return=minimal" });
  }

  const patch: Record<string, unknown> = {
    stripe_subscription_id: session.id || "",
    stripe_customer_id: session.customer?.toString?.() || "",
    status: "success",
    updated_at: new Date().toISOString()
  };

  await supabase.patch(
    "payment_history",
    `id=eq.${cachedEncodeURIComponent(String(paymentHistoryId))}`,
    patch,
    { prefer: "return=minimal" }
  );
}

async function handleSubscriptionUpdated(subscription: any, supabase: SupabaseAdminClient) {
  if (!subscription?.metadata || subscription.metadata.project !== "ai-video-generator") {
    return;
  }

  if (subscription.cancel_at_period_end) {
    return;
  }

  const userId = subscription.metadata.userId;
  const subscriptionPlanId = Number(subscription.metadata.subscriptionPlanId || 0);
  const credit = Number(subscription.metadata.credit || 0);
  const paymentHistoryId = subscription.metadata.paymentHistoryId;

  if (!userId || !subscriptionPlanId) {
    console.warn("[stripe] subscription.updated missing user metadata");
    return;
  }

  const currentDate = new Date();
  const periodEnd = computePeriodEnd(currentDate, subscription.metadata.interval);

  const userSubscriptionPayload = {
    user_id: userId,
    subscription_plans_id: subscriptionPlanId,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || "",
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer?.toString?.() || "",
    status: "active",
    current_period_start: currentDate.toISOString(),
    current_period_end: periodEnd.toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    updated_at: new Date().toISOString()
  };

  const existingSub = await supabase.selectSingle<any>(
    `user_subscriptions?user_id=eq.${cachedEncodeURIComponent(userId)}&select=*`
  );

  let subscriptionId: string | number | undefined = existingSub?.id ?? undefined;

  if (existingSub) {
    await supabase.patch(
      "user_subscriptions",
      `user_id=eq.${cachedEncodeURIComponent(userId)}`,
      userSubscriptionPayload,
      { prefer: "return=minimal" }
    );
  } else {
    const insertResponse = await supabase.insert(
      "user_subscriptions",
      {
        ...userSubscriptionPayload,
        created_at: new Date().toISOString()
      },
      { prefer: "return=representation" }
    );
    const inserted = (await insertResponse.json()) as
      | { id?: number | string | null }
      | Array<{ id?: number | string | null }>
      | null
      | undefined;
    const insertedRecord = Array.isArray(inserted) ? inserted[0] : inserted;
    if (insertedRecord && typeof insertedRecord === "object" && "id" in insertedRecord) {
      const value = insertedRecord.id;
      if (value !== null && value !== undefined) {
        subscriptionId = value;
      }
    }
  }

  const usage = await supabase.selectSingle<any>(
    `credit_usage?user_id=eq.${cachedEncodeURIComponent(userId)}&select=*`
  );

  const usagePayload: Record<string, unknown> = {
    user_id: userId,
    user_subscriptions_id: subscriptionId || usage?.user_subscriptions_id || -1,
    is_subscription_active: true,
    used_count: usage?.used_count || 0,
    period_remain_count: credit,
    period_start: currentDate.toISOString(),
    period_end: periodEnd.toISOString(),
    updated_at: new Date().toISOString()
  };

  if (!usage) {
    await supabase.insert("credit_usage", {
      ...usagePayload,
      created_at: new Date().toISOString()
    });
  } else {
    await supabase.patch(
      "credit_usage",
      `user_id=eq.${cachedEncodeURIComponent(userId)}`,
      usagePayload,
      { prefer: "return=minimal" }
    );
  }

  if (paymentHistoryId) {
    await supabase.patch(
      "payment_history",
      `id=eq.${cachedEncodeURIComponent(String(paymentHistoryId))}`,
      {
        stripe_subscription_id: subscription.id,
        stripe_customer_id: subscription.customer?.toString?.() || "",
        stripe_price_id: subscription.items?.data?.[0]?.price?.id || "",
        status: "success",
        updated_at: new Date().toISOString()
      },
      { prefer: "return=minimal" }
    );
  }
}

async function verifyStripeSignature(secret: string, payload: string, header: string | null): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((part) => part.trim());
  let timestamp = "";
  let signature = "";
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signature = value;
  }
  if (!timestamp || !signature) return false;

  const data = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const expected = toHex(new Uint8Array(digest));

  return timingSafeEqual(expected, signature);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function computePeriodEnd(start: Date, interval: string | undefined): Date {
  const end = new Date(start);
  if (interval === "year" || interval === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}
