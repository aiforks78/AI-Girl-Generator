import { requireSessionUser } from "../lib/authz";
import { AuthEnv } from "../lib/types";
import { monitoring } from "../lib/monitoring";
import { corsHeaders, jsonWithCors } from "../lib/cors";

export interface MonitoringEnv extends AuthEnv {}

function isMonitoringPath(pathname: string): boolean {
  return pathname === "/monitoring/metrics" || pathname === "/api/monitoring/metrics";
}

export function handleMonitoringOptions(request: Request, env: MonitoringEnv): Response | null {
  const url = new URL(request.url);
  if (!isMonitoringPath(url.pathname)) {
    return null;
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, env, {
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers":
        request.headers.get("Access-Control-Request-Headers") || "Authorization, Content-Type",
      "access-control-max-age": "86400"
    })
  });
}

export async function handleMonitoringRequest(request: Request, env: MonitoringEnv): Promise<Response | null> {
  const url = new URL(request.url);
  if (!isMonitoringPath(url.pathname)) {
    return null;
  }

  if (request.method === "OPTIONS") {
    const response = handleMonitoringOptions(request, env);
    return response ?? jsonWithCors(request, env, { ok: true }, 204);
  }

  if (request.method !== "GET") {
    return jsonWithCors(request, env, { error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const session = await requireSessionUser(request, env);
  if (!session.ok) {
    return jsonWithCors(request, env, { error: session.error }, session.status);
  }

  const metrics = monitoring.getMetricsSummary();

  const businessMetrics = {
    totalGenerations: (metrics.generation_txt2img_count?.count || 0) + (metrics.generation_img2img_count?.count || 0),
    previewGenerations: metrics.generation_txt2img_count?.count || 0,
    hdGenerations: metrics.generation_img2img_count?.count || 0,
    hdConversionRate: metrics.generation_txt2img_count?.count
      ? ((metrics.generation_img2img_count?.count || 0) / metrics.generation_txt2img_count.count) * 100
      : 0,
    averagePreviewTime: metrics.generation_txt2img_duration?.avg || 0,
    averageHdTime: metrics.generation_img2img_duration?.avg || 0,
    averageCost: metrics.generation_cost?.avg || 0,
    totalCost: metrics.generation_cost?.sum || 0,
    apiCalls: metrics.api_call_count?.count || 0,
    averageApiResponseTime: metrics.api_response_time?.avg || 0,
    creditTransactions: metrics.credit_transaction?.count || 0
  };

  const technicalMetrics = {
    apiResponseTime: {
      avg: metrics.api_response_time?.avg || 0,
      min: metrics.api_response_time?.min || 0,
      max: metrics.api_response_time?.max || 0,
      count: metrics.api_response_time?.count || 0
    },
    generationTimes: {
      txt2img: {
        avg: metrics.generation_txt2img_duration?.avg || 0,
        min: metrics.generation_txt2img_duration?.min || 0,
        max: metrics.generation_txt2img_duration?.max || 0,
        count: metrics.generation_txt2img_duration?.count || 0
      },
      img2img: {
        avg: metrics.generation_img2img_duration?.avg || 0,
        min: metrics.generation_img2img_duration?.min || 0,
        max: metrics.generation_img2img_duration?.max || 0,
        count: metrics.generation_img2img_duration?.count || 0
      }
    }
  };

  const systemChecks = {
    apiResponseTime: {
      status: businessMetrics.averageApiResponseTime < 2000 ? "healthy" : "warning",
      value: businessMetrics.averageApiResponseTime,
      threshold: 2000
    },
    previewGenerationTime: {
      status: businessMetrics.averagePreviewTime < 30000 ? "healthy" : "warning",
      value: businessMetrics.averagePreviewTime,
      threshold: 30000
    },
    hdGenerationTime: {
      status: businessMetrics.averageHdTime < 120000 ? "healthy" : "warning",
      value: businessMetrics.averageHdTime,
      threshold: 120000
    }
  } as const;

  let systemStatus: "healthy" | "warning" | "error" = "healthy";
  const hasWarnings = Object.values(systemChecks).some((check) => check.status === "warning");
  if (hasWarnings) {
    systemStatus = "warning";
  }

  return jsonWithCors(request, env, {
    success: true,
    data: {
      business: businessMetrics,
      technical: technicalMetrics,
      system: {
        status: systemStatus,
        checks: systemChecks,
        lastCheck: new Date().toISOString()
      },
      raw: metrics,
      timestamp: new Date().toISOString()
    }
  });
}
