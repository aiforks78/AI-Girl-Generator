/**
 * 🎀 Girl Generator - Monitoring & Metrics Collection
 *
 * Features:
 * - API call monitoring
 * - Performance metrics collection
 * - Error tracking
 * - Slack alerts
 *
 * Note: This module supports both client and server usage.
 * Sensitive server functionality lives in monitoring-server.ts
 */

import * as Sentry from '@sentry/nextjs';

// Monitoring metrics for Girl Generator
export interface BusinessMetrics {
  dailyActiveUsers: number;
  generationsPerDay: number;
  img2imgConversionRate: number;
  averageCostPerGeneration: number;
  successRate: number;
  errorRate: number;
}

export interface TechnicalMetrics {
  apiResponseTime: number;
  txt2imgGenerationTime: number;
  img2imgGenerationTime: number;
  databaseResponseTime: number;
  externalApiResponseTime: number;
}

// Metric types
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  TIMER = 'timer',
}

// Alert levels
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Monitoring class
export class GirlGeneratorMonitoring {
  private static instance: GirlGeneratorMonitoring;
  private metrics: Map<string, { name: string; value: number; type: MetricType; tags: Record<string, string>; timestamp: string }> = new Map();

  static getInstance(): GirlGeneratorMonitoring {
    if (!GirlGeneratorMonitoring.instance) {
      GirlGeneratorMonitoring.instance = new GirlGeneratorMonitoring();
    }
    return GirlGeneratorMonitoring.instance;
  }

  // Record a metric
  recordMetric(name: string, value: number, type: MetricType, tags?: Record<string, string>) {
    const metric = {
      name,
      value,
      type,
      tags: tags || {},
      timestamp: new Date().toISOString(),
    };

    this.metrics.set(`${name}_${Date.now()}`, metric);

    // Send to Sentry as custom metric
    Sentry.addBreadcrumb({
      category: 'metric',
      message: `${name}: ${value}`,
      level: 'info',
      data: metric,
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Metric: ${name} = ${value}`, tags);
    }
  }

  // Record generation metrics
  recordGeneration(
    userId: string,
    type: 'txt2img' | 'img2img',
    duration: number,
    success: boolean,
    cost?: number
  ) {
    this.recordMetric(`generation_${type}_duration`, duration, MetricType.TIMER, {
      userId,
      type,
      success: success.toString(),
    });

    this.recordMetric(`generation_${type}_count`, 1, MetricType.COUNTER, {
      userId,
      type,
      success: success.toString(),
    });

    if (cost) {
      this.recordMetric('generation_cost', cost, MetricType.GAUGE, {
        userId,
        type,
      });
    }

    // Check for alerts
    this.checkGenerationAlerts(type, duration, success);
  }

  // Record API metrics
  recordApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ) {
    const success = statusCode < 400;

    this.recordMetric('api_response_time', duration, MetricType.TIMER, {
      endpoint,
      method,
      status: statusCode.toString(),
      success: success.toString(),
    });

    this.recordMetric('api_call_count', 1, MetricType.COUNTER, {
      endpoint,
      method,
      status: statusCode.toString(),
    });

    // Check for alerts
    this.checkApiAlerts(endpoint, duration, statusCode);
  }

  // Record credit transaction
  recordCreditTransaction(
    userId: string,
    action: string,
    amount: number,
    balanceAfter: number
  ) {
    this.recordMetric('credit_transaction', amount, MetricType.GAUGE, {
      userId,
      action,
      balanceAfter: balanceAfter.toString(),
    });
  }

  // Check for generation alerts
  private checkGenerationAlerts(type: 'txt2img' | 'img2img', duration: number, success: boolean) {
    const thresholds = {
      txt2img: { warning: 30000, critical: 60000 }, // 30s warning, 60s critical
      img2img: { warning: 120000, critical: 300000 }, // 2min warning, 5min critical
    } as const;

    const threshold = thresholds[type];

    if (!success) {
      this.sendAlert(
        AlertLevel.ERROR,
        `Generation Failed`,
        `${type} generation failed`,
        { type, duration }
      );
    } else if (duration > threshold.critical) {
      this.sendAlert(
        AlertLevel.CRITICAL,
        `Generation Too Slow`,
        `${type} generation took ${duration}ms (critical threshold: ${threshold.critical}ms)`,
        { type, duration, threshold: threshold.critical }
      );
    } else if (duration > threshold.warning) {
      this.sendAlert(
        AlertLevel.WARNING,
        `Generation Slow`,
        `${type} generation took ${duration}ms (warning threshold: ${threshold.warning}ms)`,
        { type, duration, threshold: threshold.warning }
      );
    }
  }

  // Check for API alerts
  private checkApiAlerts(endpoint: string, duration: number, statusCode: number) {
    if (statusCode >= 500) {
      this.sendAlert(
        AlertLevel.ERROR,
        `API Server Error`,
        `${endpoint} returned ${statusCode}`,
        { endpoint, statusCode, duration }
      );
    } else if (duration > 10000) { // 10s threshold
      this.sendAlert(
        AlertLevel.WARNING,
        `API Slow Response`,
        `${endpoint} took ${duration}ms`,
        { endpoint, duration }
      );
    }
  }

  // Send alert
  private sendAlert(level: AlertLevel, title: string, message: string, data?: Record<string, unknown>) {
    // Send to Sentry
    Sentry.captureMessage(`[${level.toUpperCase()}] ${title}: ${message}`, {
      level: level as 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug',
      tags: {
        component: 'monitoring',
        alertLevel: level,
        project: 'girl-generator',
      },
      extra: data,
    });

    // Send to Slack (if configured)
    this.sendSlackAlert(level, title, message, data);

    // Log to console
    console.log(`🚨 [${level.toUpperCase()}] ${title}: ${message}`, data);
  }

  // Send Slack alert
  private async sendSlackAlert(level: AlertLevel, title: string, message: string, data?: Record<string, unknown>) {
    const webhookUrls = {
      [AlertLevel.CRITICAL]: process.env.SLACK_WEBHOOK_ONCALL,
      [AlertLevel.ERROR]: process.env.SLACK_WEBHOOK_ONCALL,
      [AlertLevel.WARNING]: process.env.SLACK_WEBHOOK_ONCALL,
      [AlertLevel.INFO]: process.env.SLACK_WEBHOOK_GROWTH,
    };

    const webhookUrl = webhookUrls[level];
    if (!webhookUrl) return;

    const color = {
      [AlertLevel.CRITICAL]: '#ff0000',
      [AlertLevel.ERROR]: '#ff6b6b',
      [AlertLevel.WARNING]: '#ffa500',
      [AlertLevel.INFO]: '#36a2eb',
    }[level];

    const payload = {
      attachments: [
        {
          color,
          title: `🎀 Girl Generator Alert: ${title}`,
          text: message,
          fields: [
            {
              title: 'Level',
              value: level.toUpperCase(),
              short: true,
            },
            {
              title: 'Environment',
              value: process.env.NODE_ENV || 'unknown',
              short: true,
            },
            ...(data ? [
              {
                title: 'Details',
                value: `\`\`\`${JSON.stringify(data, null, 2)}\`\`\``,
                short: false,
              }
            ] : []),
          ],
          timestamp: Math.floor(Date.now() / 1000),
        },
      ],
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  // Get current metrics summary
  getMetricsSummary(): Record<string, { count: number; sum: number; avg: number; min: number; max: number; latest: { name: string; value: number; type: MetricType; tags: Record<string, string>; timestamp: string } | null }> {
    const summary: Record<string, { count: number; sum: number; avg: number; min: number; max: number; latest: { name: string; value: number; type: MetricType; tags: Record<string, string>; timestamp: string } | null }> = {};
    
    this.metrics.forEach((metric) => {
      if (!summary[metric.name]) {
        summary[metric.name] = {
          count: 0,
          sum: 0,
          avg: 0,
          min: Infinity,
          max: -Infinity,
          latest: null,
        };
      }

      const s = summary[metric.name];
      s.count++;
      s.sum += metric.value;
      s.avg = s.sum / s.count;
      s.min = Math.min(s.min, metric.value);
      s.max = Math.max(s.max, metric.value);
      s.latest = metric;
    });

    return summary;
  }
}

// Export singleton instance
export const monitoring = GirlGeneratorMonitoring.getInstance();

// Utility functions
export function trackGeneration(
  userId: string,
  type: 'txt2img' | 'img2img',
  duration: number,
  success: boolean,
  cost?: number
) {
  monitoring.recordGeneration(userId, type, duration, success, cost);
}

export function trackApiCall(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  userId?: string
) {
  monitoring.recordApiCall(endpoint, method, duration, statusCode);
}

export function trackCreditTransaction(
  userId: string,
  action: string,
  amount: number,
  balanceAfter: number
) {
  monitoring.recordCreditTransaction(userId, action, amount, balanceAfter);
}
