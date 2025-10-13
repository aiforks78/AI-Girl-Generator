import { SupabaseAdminClient } from "../lib/supabase";
import { AuthEnv } from "../lib/types";
import { jsonWithCors } from "../lib/cors";
import { cachedEncodeURIComponent } from "../lib/url-cache";

interface CheckoutEnv extends AuthEnv {
  STRIPE_SECRET_KEY?: string;
  WEB_BASE_URI?: string;
}

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export async function handleCheckout(request: Request, env: CheckoutEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/checkout") {
    return null;
  }

  if (request.method !== "POST") {
    return jsonWithCors(request, env, { error: "METHOD_NOT_ALLOWED" }, 405);
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonWithCors(request, env, { error: "INVALID_JSON" }, 400);
  }

  const planId = Number(payload?.plan_id);
  const amount = Number(payload?.amount);
  const interval = String(payload?.interval || "");
  const userUuid = String(payload?.user_uuid || "");
  const userEmail = String(payload?.user_email || "");

  if (!planId || !amount || !interval || !userUuid || !userEmail) {
    return jsonWithCors(request, env, { error: "INVALID_PARAMS" }, 400);
  }

  if (!env.STRIPE_SECRET_KEY) {
    return jsonWithCors(request, env, { error: "STRIPE_CONFIG_MISSING" }, 500);
  }

  const supabase = new SupabaseAdminClient(env);

  const user = await supabase.selectSingle<any>(
    `users?select=id,uuid,email&uuid=eq.${cachedEncodeURIComponent(userUuid)}&email=eq.${cachedEncodeURIComponent(userEmail)}`
  );
  if (!user) {
    return jsonWithCors(request, env, { error: "USER_NOT_FOUND" }, 401);
  }

  const plan = await supabase.selectSingle<any>(
    `subscription_plans?select=id,price,is_active,interval,stripe_price_id,credit_per_interval&id=eq.${cachedEncodeURIComponent(String(planId))}`
  );
  if (!plan || plan.is_active === false) {
    return jsonWithCors(request, env, { error: "PLAN_NOT_FOUND" }, 404);
  }

  if (Math.round(amount) !== Math.round(Number(plan.price || 0) * 100)) {
    return jsonWithCors(request, env, { error: "AMOUNT_MISMATCH" }, 400);
  }

  const existingSubs = await supabase.select<any[]>(
    `user_subscriptions?select=id,status&user_id=eq.${cachedEncodeURIComponent(userUuid)}`
  );
  const hasActiveSub = (existingSubs || []).some((sub) => {
    const status = String(sub.status || "").toLowerCase();
    return status === "active" || status === "cancelled";
  });
  const isOneTimePayment = planId === 1 || planId === 9 || planId === 11;
  if (!isOneTimePayment && hasActiveSub) {
    return jsonWithCors(request, env, { error: "ACTIVE_SUBSCRIPTION_EXISTS" }, 500);
  }

  const paymentInsertResponse = await supabase.insert(
    "payment_history",
    {
      user_id: userUuid,
      subscription_plans_id: planId,
      stripe_price_id: plan.stripe_price_id,
      stripe_subscription_id: "",
      stripe_customer_id: "",
      stripe_payment_intent_id: "",
      amount,
      currency: "USD",
      status: "started",
      created_at: new Date().toISOString()
    },
    { prefer: "return=representation" }
  );
  const paymentInsert = await paymentInsertResponse.json();
  const paymentHistory = Array.isArray(paymentInsert) ? paymentInsert[0] : paymentInsert;

  const sessionResponse = await createStripeCheckoutSession({
    env,
    isOneTimePayment,
    plan,
    amount,
    interval,
    user,
    paymentHistoryId: paymentHistory?.id
  });

  if (!sessionResponse.ok) {
    await supabase.patch(
      "payment_history",
      `id=eq.${cachedEncodeURIComponent(String(paymentHistory?.id))}`,
      { status: "failed" },
      { prefer: "return=minimal" }
    );
    const detail = await sessionResponse.text();
    return jsonWithCors(request, env, { error: "STRIPE_SESSION_FAILED", detail }, sessionResponse.status || 500);
  }

  const session = await sessionResponse.json();

  await supabase.patch(
    "payment_history",
    `id=eq.${cachedEncodeURIComponent(String(paymentHistory?.id))}`,
    { status: "submitted" },
    { prefer: "return=minimal" }
  );

  return jsonWithCors(request, env, { session });
}

async function createStripeCheckoutSession(options: {
  env: CheckoutEnv;
  isOneTimePayment: boolean;
  plan: any;
  amount: number;
  interval: string;
  user: any;
  paymentHistoryId: string | number;
}): Promise<Response> {
  const params = new URLSearchParams();
  params.append("client_reference_id", String(options.user.id));
  params.append("customer_email", String(options.user.email));
  params.append("mode", options.isOneTimePayment ? "payment" : "subscription");
  params.append("success_url", (options.env.WEB_BASE_URI || "https://app.girlgenerator.net") + "");
  params.append("cancel_url", `${options.env.WEB_BASE_URI || "https://app.girlgenerator.net"}/pricing`);
  params.append("payment_method_types[]", "card");
  params.append("line_items[0][price]", String(options.plan.stripe_price_id));
  params.append("line_items[0][quantity]", "1");

  params.append("metadata[project]", "ai-video-generator");
  params.append("metadata[interval]", String(options.interval));
  params.append("metadata[userId]", String(options.user.uuid || options.user.id));
  params.append("metadata[priceId]", String(options.plan.stripe_price_id));
  params.append("metadata[quantity]", "1");
  params.append("metadata[paymentHistoryId]", String(options.paymentHistoryId));
  params.append("metadata[credit]", String(options.plan.credit_per_interval || 0));
  params.append("metadata[subscriptionPlanId]", String(options.plan.id));

  if (!options.isOneTimePayment) {
    params.append("subscription_data[metadata][project]", "ai-video-generator");
    params.append("subscription_data[metadata][userId]", String(options.user.uuid || options.user.id));
    params.append("subscription_data[metadata][quantity]", "1");
    params.append("subscription_data[metadata][priceId]", String(options.plan.stripe_price_id));
    params.append("subscription_data[metadata][paymentHistoryId]", String(options.paymentHistoryId));
    params.append("subscription_data[metadata][credit]", String(options.plan.credit_per_interval || 0));
    params.append("subscription_data[metadata][subscriptionPlanId]", String(options.plan.id));
    params.append("subscription_data[metadata][interval]", String(options.interval));
  }

  return fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });
}
