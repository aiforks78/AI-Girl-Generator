"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Activity, AlertTriangle, Clock, DollarSign, Users, Zap } from 'lucide-react';
import { monitoring } from '@/lib/monitoring';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  color?: 'success' | 'warning' | 'danger' | 'primary';
}

function MetricCard({ title, value, change, icon, color = 'primary' }: MetricCardProps) {
  const colorClasses = {
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
    primary: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className="w-full">
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {change && (
              <p className={`text-xs ${colorClasses[color]}`}>{change}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-800 ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: string;
}

function SystemStatusCard({ status, message, lastCheck }: SystemStatus) {
  const statusConfig = {
    healthy: {
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/20',
      icon: <Activity className="w-5 h-5" />,
    },
    warning: {
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    error: {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/20',
      icon: <AlertTriangle className="w-5 h-5" />,
    },
  };

  const config = statusConfig[status];

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <h3 className="text-lg font-semibold">System Status</h3>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${config.color}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Last check: {lastCheck}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<any>({});
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'healthy',
    message: 'All systems operational',
    lastCheck: new Date().toLocaleTimeString(),
  });

  useEffect(() => {
    // Load initial metrics
    const loadMetrics = () => {
      const summary = monitoring.getMetricsSummary();
      setMetrics(summary);
    };

    loadMetrics();

    // Set up periodic refresh
    const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate derived metrics
  const apiResponseTime = metrics.api_response_time?.avg || 0;
  const generationSuccessRate = metrics.generation_txt2img_count?.count 
    ? ((metrics.generation_txt2img_count.count - (metrics.generation_txt2img_failed?.count || 0)) / metrics.generation_txt2img_count.count * 100)
    : 100;
  const totalGenerations = (metrics.generation_txt2img_count?.count || 0) + (metrics.generation_img2img_count?.count || 0);
  const averageCost = metrics.generation_cost?.avg || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Girl Generator Monitoring
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time system metrics and performance monitoring
        </p>
      </div>

      {/* System Status */}
      <SystemStatusCard {...systemStatus} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="API Response Time"
          value={`${Math.round(apiResponseTime)}ms`}
          change={apiResponseTime > 2000 ? "Above threshold" : "Within limits"}
          color={apiResponseTime > 2000 ? "warning" : "success"}
          icon={<Clock className="w-6 h-6" />}
        />

        <MetricCard
          title="Success Rate"
          value={`${Math.round(generationSuccessRate)}%`}
          change={generationSuccessRate > 95 ? "Excellent" : "Needs attention"}
          color={generationSuccessRate > 95 ? "success" : "warning"}
          icon={<Activity className="w-6 h-6" />}
        />

        <MetricCard
          title="Total Generations"
          value={totalGenerations}
          change="Last 24 hours"
          color="primary"
          icon={<Zap className="w-6 h-6" />}
        />

        <MetricCard
          title="Avg Cost"
          value={`$${averageCost.toFixed(4)}`}
          change={averageCost > 0.003 ? "Above target" : "Within budget"}
          color={averageCost > 0.003 ? "warning" : "success"}
          icon={<DollarSign className="w-6 h-6" />}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Metrics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Generation Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Txt2Img Avg Time</span>
                <span className="font-medium">
                  {Math.round(metrics.generation_txt2img_duration?.avg || 0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Img2Img Avg Time</span>
                <span className="font-medium">
                  {Math.round(metrics.generation_img2img_duration?.avg || 0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Txt2Img Count</span>
                <span className="font-medium">
                  {metrics.generation_txt2img_count?.count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Img2Img Count</span>
                <span className="font-medium">
                  {metrics.generation_img2img_count?.count || 0}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* API Metrics */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">API Performance</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total API Calls</span>
                <span className="font-medium">
                  {metrics.api_call_count?.count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</span>
                <span className="font-medium">
                  {Math.round(metrics.api_response_time?.avg || 0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Min Response Time</span>
                <span className="font-medium">
                  {Math.round(metrics.api_response_time?.min || 0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Response Time</span>
                <span className="font-medium">
                  {Math.round(metrics.api_response_time?.max || 0)}ms
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Monitoring dashboard is collecting real-time metrics...</p>
            <p className="mt-2">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
