/**
 * 🎀 Girl Generator - Server-side Monitoring
 * 
 * Features:
 * - Server-only monitoring utilities
 * - Sensitive data handling
 * - Database monitoring
 * - External API monitoring
 * 
 * ⚠️ Server-only usage - contains sensitive SERVICE_ROLE_KEY
 */

import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client (server only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Record API calls to the database (server only)
 */
export async function trackApiCallToDatabase(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number,
  userId?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase
      .from('api_metrics')
      .insert({
        endpoint,
        method,
        duration,
        status_code: statusCode,
        user_id: userId,
        metadata: metadata || {},
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Failed to track API call to database:', error);
  }
}

/**
 * Send Slack alerts (server only)
 */
export async function sendSlackAlert(
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info',
  metadata?: Record<string, any>
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured');
    return;
  }

  const colors = {
    info: '#36a64f',
    warning: '#ff9500', 
    error: '#ff0000'
  };

  const payload = {
    attachments: [{
      color: colors[severity],
      title: `Girl Generator ${severity.toUpperCase()}`,
      text: message,
      fields: metadata ? Object.entries(metadata).map(([key, value]) => ({
        title: key,
        value: String(value),
        short: true
      })) : [],
      ts: Math.floor(Date.now() / 1000)
    }]
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000) // 5-second timeout
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

/**
 * Monitor database performance (server only)
 */
export async function monitorDatabasePerformance() {
  try {
    const startTime = Date.now();
    
    // Test query
    await supabase
      .from('user_credits')
      .select('count')
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    // Send alert if query exceeds 1 second
    if (duration > 1000) {
      await sendSlackAlert(
        'Database performance degradation detected',
        'warning',
        { query_duration: `${duration}ms` }
      );
    }
    
    return { duration, healthy: duration < 1000 };
  } catch (error) {
    await sendSlackAlert(
      'Database connection failed',
      'error',
      { error: String(error) }
    );
    
    return { duration: -1, healthy: false };
  }
}

/**
 * Monitor external API performance (server only)
 */
export async function monitorExternalApi(
  apiName: string,
  endpoint: string,
  duration: number,
  success: boolean,
  error?: string
) {
  try {
    await supabase
      .from('external_api_metrics')
      .insert({
        api_name: apiName,
        endpoint,
        duration,
        success,
        error_message: error,
        created_at: new Date().toISOString()
      });

    // Alert when external API call fails or exceeds threshold
    if (!success || duration > 10000) {
      await sendSlackAlert(
        `External API ${apiName} ${success ? 'slow response' : 'failure'}`,
        success ? 'warning' : 'error',
        {
          endpoint,
          duration: `${duration}ms`,
          error: error || 'N/A'
        }
      );
    }
  } catch (dbError) {
    console.error('Failed to record external API metrics:', dbError);
  }
}

/**
 * Retrieve system health (server only)
 */
export async function getSystemHealth() {
  try {
    const [dbHealth, memoryUsage] = await Promise.all([
      monitorDatabasePerformance(),
      Promise.resolve({
        used: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        total: process.memoryUsage().heapTotal / 1024 / 1024 // MB
      })
    ]);

    return {
      database: dbHealth,
      memory: memoryUsage,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to get system health:', error);
    return {
      database: { duration: -1, healthy: false },
      memory: { used: 0, total: 0 },
      timestamp: new Date().toISOString(),
      error: String(error)
    };
  }
}

/**
 * Clean up old monitoring data (server only)
 */
export async function cleanupOldMetrics(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const tables = ['api_metrics', 'external_api_metrics'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error(`Failed to cleanup ${table}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old metrics:', error);
  }
}
