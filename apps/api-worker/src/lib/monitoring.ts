export enum MetricType {
  COUNTER = "counter",
  GAUGE = "gauge",
  HISTOGRAM = "histogram",
  TIMER = "timer"
}

import { logger } from "./logger";

interface MetricEntry {
  name: string;
  value: number;
  type: MetricType;
  tags: Record<string, string>;
  timestamp: string;
}

interface MetricSummary {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  latest: MetricEntry | null;
}

interface MetricAccumulator {
  count: number;
  sum: number;
  min: number;
  max: number;
  latest: MetricEntry | null;
}

export class WorkerMonitoring {
  private static instance: WorkerMonitoring;
  private summaries = new Map<string, MetricAccumulator>();

  static getInstance(): WorkerMonitoring {
    if (!WorkerMonitoring.instance) {
      WorkerMonitoring.instance = new WorkerMonitoring();
    }
    return WorkerMonitoring.instance;
  }

  recordMetric(name: string, value: number, type: MetricType, tags?: Record<string, string>) {
    if (!Number.isFinite(value)) {
      return;
    }

    const entry: MetricEntry = {
      name,
      value,
      type,
      tags: tags || {},
      timestamp: new Date().toISOString()
    };

    const accumulator = this.summaries.get(name) || {
      count: 0,
      sum: 0,
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY,
      latest: null
    };

    accumulator.count += 1;
    accumulator.sum += value;
    accumulator.min = Math.min(accumulator.min, value);
    accumulator.max = Math.max(accumulator.max, value);
    accumulator.latest = entry;

    this.summaries.set(name, accumulator);

    const globalProcess = (globalThis as any)?.process;
    if (globalProcess?.env?.NODE_ENV === "development") {
      logger.debug(`📊 [monitoring] ${name}=${value}`, entry.tags);
    }
  }

  recordGeneration(userId: string, type: "txt2img" | "img2img", duration: number, success: boolean, cost?: number) {
    this.recordMetric(`generation_${type}_duration`, duration, MetricType.TIMER, {
      userId,
      success: String(success)
    });

    this.recordMetric(`generation_${type}_count`, 1, MetricType.COUNTER, {
      userId,
      success: String(success)
    });

    if (typeof cost === "number") {
      this.recordMetric("generation_cost", cost, MetricType.GAUGE, {
        userId,
        type
      });
    }
  }

  recordApiCall(endpoint: string, method: string, duration: number, statusCode: number) {
    this.recordMetric("api_response_time", duration, MetricType.TIMER, {
      endpoint,
      method,
      status: String(statusCode),
      success: String(statusCode < 400)
    });

    this.recordMetric("api_call_count", 1, MetricType.COUNTER, {
      endpoint,
      method,
      status: String(statusCode)
    });
  }

  recordCreditTransaction(userId: string, action: string, amount: number, balanceAfter: number) {
    this.recordMetric("credit_transaction", amount, MetricType.GAUGE, {
      userId,
      action,
      balanceAfter: String(balanceAfter)
    });
  }

  getMetricsSummary(): Record<string, MetricSummary> {
    const summary: Record<string, MetricSummary> = {};

    this.summaries.forEach((accumulator, name) => {
      const count = accumulator.count;
      summary[name] = {
        count,
        sum: accumulator.sum,
        avg: count > 0 ? accumulator.sum / count : 0,
        min: count > 0 ? accumulator.min : 0,
        max: count > 0 ? accumulator.max : 0,
        latest: accumulator.latest
      };
    });

    return summary;
  }
}

export const monitoring = WorkerMonitoring.getInstance();

export function trackGeneration(
  userId: string,
  type: "txt2img" | "img2img",
  duration: number,
  success: boolean,
  cost?: number
) {
  monitoring.recordGeneration(userId, type, duration, success, cost);
}

export function trackApiCall(endpoint: string, method: string, duration: number, statusCode: number) {
  monitoring.recordApiCall(endpoint, method, duration, statusCode);
}

export function trackCreditTransaction(userId: string, action: string, amount: number, balanceAfter: number) {
  monitoring.recordCreditTransaction(userId, action, amount, balanceAfter);
}
