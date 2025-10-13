import { json } from "../lib/response";
import { SupabaseAdminClient } from "../lib/supabase";
import { AuthEnv } from "../lib/types";
import { getReplicateModelsUrl } from "../lib/providers/replicate";

export interface HealthEnv extends AuthEnv {
  REPLICATE_API_TOKEN?: string;
  REPLICATE_API_BASE?: string;
  npm_package_version?: string;
  APP_VERSION?: string;
}

const workerBootTime = Date.now();

function isHealthPath(pathname: string): boolean {
  return pathname === "/health" || pathname === "/api/health";
}

export function handleHealthOptions(request: Request): Response | null {
  const url = new URL(request.url);
  if (!isHealthPath(url.pathname)) {
    return null;
  }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin"
  };

  return new Response(null, { status: 204, headers });
}

export async function handleHealthRequest(request: Request, env: HealthEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isHealthPath(url.pathname)) {
    return null;
  }

  if (request.method === "OPTIONS") {
    const response = handleHealthOptions(request);
    return response ?? new Response(null, { status: 204 });
  }

  if (request.method === "HEAD") {
    return handleHealthHead(env);
  }

  if (request.method !== "GET") {
    return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // Database connectivity check
  checks.database = await checkDatabase(env);

  // Optional Replicate API check
  const checkReplicate = url.searchParams.get("replicate") === "true";
  if (checkReplicate) {
    checks.replicate = await checkReplicateApi(env);
  }

  // Environment variable check
  checks.environment = evaluateEnvironment(env);

  // Worker memory information (best effort)
  checks.runtime = {
    status: "healthy",
    details: {
      workerBootTime,
      uptimeSeconds: Math.round((Date.now() - workerBootTime) / 1000)
    }
  };

  const hasErrors = Object.values(checks).some((check: any) => check.status === "error");
  const hasWarnings = Object.values(checks).some((check: any) => check.status === "warning");

  let overallStatus: "healthy" | "warning" | "error" = "healthy";
  if (hasErrors) {
    overallStatus = "error";
  } else if (hasWarnings) {
    overallStatus = "warning";
  }

  const responseTime = Date.now() - startTime;

  return json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime,
      version: env.APP_VERSION || env.npm_package_version || "unknown",
      environment: env.AUTH_ALLOWED_ORIGINS ? "production" : "unknown",
      uptime: Math.round((Date.now() - workerBootTime) / 1000),
      checks,
      summary: summarizeChecks(checks)
    },
    overallStatus === "error" ? 503 : 200
  );
}

async function handleHealthHead(env: HealthEnv): Promise<Response> {
  const db = await checkDatabase(env);
  const status = db.status === "healthy" ? 200 : 503;

  return new Response(null, {
    status,
    headers: {
      "X-Health-Status": db.status,
      "X-Health-Timestamp": new Date().toISOString()
    }
  });
}

async function checkDatabase(env: HealthEnv) {
  const supabase = new SupabaseAdminClient(env);
  const start = Date.now();
  try {
    await supabase.select("user_credits?select=user_id&limit=1");
    return {
      status: "healthy" as const,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      status: "error" as const,
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkReplicateApi(env: HealthEnv) {
  const start = Date.now();
  if (!env.REPLICATE_API_TOKEN) {
    return {
      status: "warning" as const,
      responseTime: 0,
      error: "REPLICATE_API_TOKEN missing"
    };
  }

  try {
    const response = await fetch(getReplicateModelsUrl(env), {
      headers: {
        Authorization: `Token ${env.REPLICATE_API_TOKEN}`
      },
      signal: createTimeoutSignal(5000)
    });

    return {
      status: response.ok ? "healthy" : "error",
      responseTime: Date.now() - start,
      statusCode: response.status
    };
  } catch (error) {
    return {
      status: "error" as const,
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function evaluateEnvironment(env: HealthEnv) {
  const requiredVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "AUTH_JWT_SECRET"] as const;
  const missing = requiredVars.filter((key) => !env[key]);

  return {
    status: missing.length === 0 ? "healthy" : "error",
    missingVariables: missing,
    totalRequired: requiredVars.length,
    configured: requiredVars.length - missing.length
  };
}

function summarizeChecks(checks: Record<string, any>) {
  return Object.values(checks).reduce(
    (acc, check: any) => {
      if (!check || !check.status) {
        return acc;
      }
      acc.total += 1;
      if (check.status === "healthy") acc.healthy += 1;
      else if (check.status === "warning") acc.warning += 1;
      else if (check.status === "error") acc.error += 1;
      return acc;
    },
    { healthy: 0, warning: 0, error: 0, total: 0 }
  );
}

function createTimeoutSignal(timeout: number): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeout);
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  if (!controller) return undefined;
  setTimeout(() => controller.abort(), timeout);
  return controller.signal;
}
