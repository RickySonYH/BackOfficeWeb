// [advice from AI] 프론트엔드 모니터링 타입 정의

export interface SystemMetrics {
  timestamp: string;
  cpu: {
    usage_percent: number;
    cores: number;
    load_average: number[];
  };
  memory: {
    used_mb: number;
    total_mb: number;
    usage_percent: number;
    available_mb: number;
  };
  disk: {
    used_gb: number;
    total_gb: number;
    usage_percent: number;
    available_gb: number;
  };
  network: {
    bytes_sent: number;
    bytes_received: number;
    packets_sent: number;
    packets_received: number;
  };
}

export interface ApplicationMetrics {
  timestamp: string;
  requests: {
    total: number;
    per_second: number;
    success_rate: number;
    average_response_time: number;
  };
  database: {
    connections_active: number;
    connections_total: number;
    query_time_avg: number;
    slow_queries: number;
  };
  cache: {
    hit_rate: number;
    miss_rate: number;
    memory_used_mb: number;
  };
  errors: {
    total: number;
    rate_per_minute: number;
    by_type: { [errorType: string]: number };
  };
}

export interface TenantMetrics {
  tenant_id: string;
  tenant_key: string;
  company_name: string;
  metrics: {
    timestamp: string;
    active_users: number;
    api_requests: number;
    data_storage_mb: number;
    workspace_count: number;
    last_activity: string;
  };
  resource_usage: {
    cpu_percent: number;
    memory_mb: number;
    storage_gb: number;
    network_mb: number;
  };
  performance: {
    avg_response_time: number;
    error_rate: number;
    uptime_percent: number;
  };
}

export interface WorkspaceMetrics {
  workspace_id: string;
  workspace_name: string;
  workspace_type: 'kms' | 'advisor';
  tenant_id: string;
  metrics: {
    timestamp: string;
    active_sessions: number;
    documents_processed: number;
    queries_executed: number;
    knowledge_base_size_mb: number;
  };
  performance: {
    query_response_time: number;
    indexing_speed: number;
    search_accuracy: number;
    user_satisfaction: number;
  };
  usage_patterns: {
    peak_hours: number[];
    most_accessed_features: string[];
    user_activity_trend: 'increasing' | 'stable' | 'decreasing';
  };
}

export interface SolutionMetrics {
  solution_id: string;
  solution_name: string;
  deployment_status: 'active' | 'inactive' | 'maintenance';
  metrics: {
    timestamp: string;
    assigned_tenants: number;
    total_capacity: number;
    used_capacity: number;
    availability_percent: number;
  };
  resource_allocation: {
    cpu_cores_allocated: number;
    cpu_cores_used: number;
    memory_gb_allocated: number;
    memory_gb_used: number;
    storage_gb_allocated: number;
    storage_gb_used: number;
  };
  health_status: {
    overall_health: 'healthy' | 'warning' | 'critical';
    services_running: number;
    services_total: number;
    last_health_check: string;
    issues: HealthIssue[];
  };
}

export interface HealthIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolution_time?: string;
}

export interface Alert {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  status: 'active' | 'resolved' | 'suppressed';
  message: string;
  details: any;
  triggered_at: string;
  resolved_at?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  notification_sent: boolean;
  affected_resources: Array<{
    type: string;
    id: string;
    name: string;
  }>;
}

export interface RealTimeMetrics {
  timestamp: string;
  system: SystemMetrics;
  application: ApplicationMetrics;
  tenants: TenantMetrics[];
  workspaces: WorkspaceMetrics[];
  solutions: SolutionMetrics[];
  alerts: Alert[];
}

export interface SystemStatus {
  overall_health: 'healthy' | 'warning' | 'critical';
  system: {
    status: 'healthy' | 'warning' | 'critical';
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
  };
  application: {
    status: 'healthy' | 'warning' | 'critical';
    response_time: number;
    success_rate: number;
    error_rate: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    active_connections: number;
    avg_query_time: number;
    slow_queries: number;
  };
  tenants: {
    total: number;
    active: number;
    high_usage: number;
  };
  solutions: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
  };
  last_updated: string;
}

export interface CapacityForecast {
  resource_type: 'cpu' | 'memory' | 'storage' | 'network';
  current_usage: number;
  predicted_usage: Array<{
    date: string;
    value: number;
    confidence: number;
  }>;
  capacity_threshold: number;
  estimated_exhaustion_date?: string;
  recommendations: string[];
}

export interface OptimizationSuggestion {
  id: string;
  type: 'query' | 'index' | 'cache' | 'resource' | 'configuration';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  current_impact: string;
  potential_improvement: string;
  implementation_steps: string[];
  estimated_effort: string;
  risk_level: 'low' | 'medium' | 'high';
  affected_components: string[];
}

export interface PerformanceReport {
  id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period_start: string;
  period_end: string;
  scope: {
    type: 'system' | 'tenant' | 'workspace' | 'solution';
    resource_ids?: string[];
  };
  metrics: {
    availability: {
      uptime_percent: number;
      downtime_minutes: number;
      incidents_count: number;
    };
    performance: {
      avg_response_time: number;
      throughput: number;
      error_rate: number;
    };
    resource_usage: {
      peak_cpu: number;
      peak_memory: number;
      peak_storage: number;
    };
    user_activity: {
      total_users: number;
      active_sessions: number;
      page_views: number;
    };
  };
  recommendations: ReportRecommendation[];
  generated_at: string;
  generated_by: string;
}

export interface ReportRecommendation {
  type: 'optimization' | 'scaling' | 'maintenance' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  estimated_impact: string;
  implementation_effort: 'low' | 'medium' | 'high';
}

// API 응답 타입들
export interface MonitoringApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MetricsHistoryRequest {
  metric_types: string[];
  start_time: string;
  end_time: string;
  granularity: '1m' | '5m' | '15m' | '1h' | '1d';
  tenant_ids?: string[];
  workspace_ids?: string[];
  solution_ids?: string[];
}

export interface AlertsResponse {
  alerts: Alert[];
  summary: {
    total: number;
    by_severity: {
      critical: number;
      error: number;
      warning: number;
      info: number;
    };
  };
}
