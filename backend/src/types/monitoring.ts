// [advice from AI] 모니터링 및 대시보드 강화 타입 정의

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

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric_type: 'system' | 'application' | 'tenant' | 'workspace' | 'solution';
  condition: {
    metric_name: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'ne';
    threshold: number;
    duration_minutes: number;
  };
  severity: 'info' | 'warning' | 'error' | 'critical';
  notification_channels: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  dashboard_type: 'system' | 'application' | 'tenant' | 'custom';
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refresh_interval: number; // seconds
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  grid_size: number;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'gauge' | 'status' | 'heatmap';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  data_source: {
    metric_type: string;
    query: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
    time_range: string; // e.g., '1h', '24h', '7d'
  };
  visualization: {
    chart_type?: 'line' | 'bar' | 'pie' | 'area';
    color_scheme?: string;
    show_legend?: boolean;
    show_grid?: boolean;
  };
}

export interface DashboardFilter {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'not_in';
  value: any;
  label: string;
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

// Real-time monitoring types
export interface RealTimeMetrics {
  timestamp: string;
  system: SystemMetrics;
  application: ApplicationMetrics;
  tenants: TenantMetrics[];
  workspaces: WorkspaceMetrics[];
  solutions: SolutionMetrics[];
  alerts: Alert[];
}

export interface MetricsSubscription {
  id: string;
  user_id: string;
  metric_types: string[];
  filters: any;
  callback_url?: string;
  websocket_id?: string;
  is_active: boolean;
  created_at: string;
}

// Capacity planning types
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

export interface ScalingRecommendation {
  resource_type: string;
  current_allocation: number;
  recommended_allocation: number;
  reason: string;
  estimated_cost_impact: number;
  implementation_priority: 'low' | 'medium' | 'high';
  timeline: string;
}

// API request/response types
export interface GetMetricsRequest {
  metric_types: string[];
  time_range: {
    start: string;
    end: string;
  };
  granularity: '1m' | '5m' | '15m' | '1h' | '1d';
  filters?: {
    tenant_ids?: string[];
    workspace_ids?: string[];
    solution_ids?: string[];
  };
}

export interface GetMetricsResponse {
  success: boolean;
  data: {
    metrics: any[];
    metadata: {
      total_points: number;
      time_range: {
        start: string;
        end: string;
      };
      granularity: string;
    };
  };
  error?: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  description: string;
  metric_type: string;
  condition: {
    metric_name: string;
    operator: string;
    threshold: number;
    duration_minutes: number;
  };
  severity: string;
  notification_channels: string[];
}

export interface CreateDashboardRequest {
  name: string;
  description: string;
  dashboard_type: string;
  layout: DashboardLayout;
  widgets: Omit<DashboardWidget, 'id'>[];
  filters: DashboardFilter[];
  refresh_interval: number;
  is_public: boolean;
}

// Notification types
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  configuration: any;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  channel_type: string;
  subject_template: string;
  body_template: string;
  variables: string[];
  created_by: string;
  created_at: string;
}

// Log analysis types
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  service: string;
  tenant_id?: string;
  user_id?: string;
  request_id?: string;
  metadata: any;
}

export interface LogAnalysis {
  time_range: {
    start: string;
    end: string;
  };
  total_logs: number;
  log_levels: { [level: string]: number };
  top_errors: Array<{
    message: string;
    count: number;
    first_occurrence: string;
    last_occurrence: string;
  }>;
  patterns: Array<{
    pattern: string;
    count: number;
    severity: string;
  }>;
  anomalies: Array<{
    timestamp: string;
    description: string;
    severity: string;
  }>;
}

// Performance optimization types
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

export interface PerformanceProfile {
  resource_id: string;
  resource_type: string;
  profile_data: {
    cpu_usage_pattern: number[];
    memory_usage_pattern: number[];
    request_volume_pattern: number[];
    response_time_pattern: number[];
  };
  bottlenecks: Array<{
    component: string;
    severity: string;
    description: string;
  }>;
  optimization_opportunities: OptimizationSuggestion[];
  last_analyzed: string;
}
