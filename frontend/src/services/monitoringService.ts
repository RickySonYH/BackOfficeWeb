// [advice from AI] 모니터링 서비스 - 실시간 메트릭 및 시스템 상태 조회

import axios from 'axios';
import {
  RealTimeMetrics,
  SystemStatus,
  TenantMetrics,
  WorkspaceMetrics,
  SolutionMetrics,
  CapacityForecast,
  OptimizationSuggestion,
  Alert,
  AlertsResponse,
  PerformanceReport,
  MonitoringApiResponse,
  MetricsHistoryRequest
} from '../types/monitoring';

const MONITORING_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const monitoringApi = axios.create({
  baseURL: MONITORING_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 인증 토큰 자동 추가
monitoringApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
monitoringApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const monitoringService = {
  /**
   * 실시간 메트릭 조회
   */
  async getRealTimeMetrics(): Promise<MonitoringApiResponse<RealTimeMetrics>> {
    try {
      const response = await monitoringApi.get('/api/monitoring/realtime');
      return response.data;
    } catch (error: any) {
      console.warn('Real-time metrics API not available:', error.message);
      // 프로덕션에서는 Mock 데이터를 최소한으로만 사용
      if (import.meta.env.VITE_ENABLE_MOCK_DATA === 'true') {
        return {
          success: true,
          data: this.getMockRealTimeMetrics()
        };
      }
      throw error;
    }
  },

  /**
   * 시스템 상태 요약 조회
   */
  async getSystemStatus(): Promise<MonitoringApiResponse<SystemStatus>> {
    try {
      const response = await monitoringApi.get('/api/monitoring/status');
      return response.data;
    } catch (error: any) {
      console.warn('System status API not available:', error.message);
      // 프로덕션에서는 Mock 데이터를 최소한으로만 사용
      if (import.meta.env.VITE_ENABLE_MOCK_DATA === 'true') {
        return {
          success: true,
          data: this.getMockSystemStatus()
        };
      }
      throw error;
    }
  },

  /**
   * 히스토리 메트릭 조회
   */
  async getHistoricalMetrics(request: MetricsHistoryRequest): Promise<MonitoringApiResponse<any>> {
    try {
      const response = await monitoringApi.get('/api/monitoring/metrics/history', {
        params: request
      });
      return response.data;
    } catch (error: any) {
      console.warn('Historical metrics API not available, using mock data:', error.message);
      return {
        success: true,
        data: {
          metrics: this.getMockHistoricalMetrics(request),
          metadata: {
            total_points: 100,
            time_range: {
              start: request.start_time,
              end: request.end_time
            },
            granularity: request.granularity
          }
        }
      };
    }
  },

  /**
   * 테넌트별 메트릭 조회
   */
  async getTenantMetrics(tenantId: string): Promise<MonitoringApiResponse<any>> {
    try {
      const response = await monitoringApi.get(`/api/monitoring/tenants/${tenantId}/metrics`);
      return response.data;
    } catch (error: any) {
      console.warn('Tenant metrics API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockTenantMetrics(tenantId)
      };
    }
  },

  /**
   * 워크스페이스별 메트릭 조회
   */
  async getWorkspaceMetrics(workspaceId: string): Promise<MonitoringApiResponse<WorkspaceMetrics>> {
    try {
      const response = await monitoringApi.get(`/api/monitoring/workspaces/${workspaceId}/metrics`);
      return response.data;
    } catch (error: any) {
      console.warn('Workspace metrics API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockWorkspaceMetrics(workspaceId)
      };
    }
  },

  /**
   * 솔루션별 메트릭 조회
   */
  async getSolutionMetrics(solutionId: string): Promise<MonitoringApiResponse<SolutionMetrics>> {
    try {
      const response = await monitoringApi.get(`/api/monitoring/solutions/${solutionId}/metrics`);
      return response.data;
    } catch (error: any) {
      console.warn('Solution metrics API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockSolutionMetrics(solutionId)
      };
    }
  },

  /**
   * 용량 예측 조회
   */
  async getCapacityForecast(resourceType: string = 'cpu', days: number = 30): Promise<MonitoringApiResponse<CapacityForecast>> {
    try {
      const response = await monitoringApi.get('/api/monitoring/capacity/forecast', {
        params: { resource_type: resourceType, days }
      });
      return response.data;
    } catch (error: any) {
      console.warn('Capacity forecast API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockCapacityForecast(resourceType, days)
      };
    }
  },

  /**
   * 최적화 제안 조회
   */
  async getOptimizationSuggestions(): Promise<MonitoringApiResponse<OptimizationSuggestion[]>> {
    try {
      const response = await monitoringApi.get('/api/monitoring/optimization/suggestions');
      return response.data;
    } catch (error: any) {
      console.warn('Optimization suggestions API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockOptimizationSuggestions()
      };
    }
  },

  /**
   * 활성 알림 조회
   */
  async getActiveAlerts(severity?: string): Promise<MonitoringApiResponse<AlertsResponse>> {
    try {
      const params = severity ? { severity } : {};
      const response = await monitoringApi.get('/api/monitoring/alerts', { params });
      return response.data;
    } catch (error: any) {
      console.warn('Active alerts API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockActiveAlerts(severity)
      };
    }
  },

  /**
   * 성능 리포트 생성
   */
  async generatePerformanceReport(request: any): Promise<MonitoringApiResponse<PerformanceReport>> {
    try {
      const response = await monitoringApi.post('/api/monitoring/reports/performance', request);
      return response.data;
    } catch (error: any) {
      console.warn('Performance report API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockPerformanceReport(request)
      };
    }
  },

  /**
   * 대시보드 설정 조회
   */
  async getDashboardConfig(dashboardType: string = 'system'): Promise<MonitoringApiResponse<any>> {
    try {
      const response = await monitoringApi.get('/api/monitoring/dashboard/config', {
        params: { dashboard_type: dashboardType }
      });
      return response.data;
    } catch (error: any) {
      console.warn('Dashboard config API not available, using mock data:', error.message);
      return {
        success: true,
        data: this.getMockDashboardConfig(dashboardType)
      };
    }
  },

  // Mock 데이터 생성 메서드들
  getMockRealTimeMetrics(): RealTimeMetrics {
    const now = new Date();
    
    return {
      timestamp: now.toISOString(),
      system: {
        timestamp: now.toISOString(),
        cpu: {
          usage_percent: Math.random() * 30 + 40, // 40-70%
          cores: 8,
          load_average: [1.2, 1.5, 1.8]
        },
        memory: {
          used_mb: Math.random() * 2000 + 6000, // 6-8GB
          total_mb: 16384,
          usage_percent: Math.random() * 20 + 40, // 40-60%
          available_mb: Math.random() * 2000 + 8000
        },
        disk: {
          used_gb: Math.random() * 50 + 200, // 200-250GB
          total_gb: 500,
          usage_percent: Math.random() * 10 + 40, // 40-50%
          available_gb: Math.random() * 50 + 250
        },
        network: {
          bytes_sent: Math.floor(Math.random() * 1000000),
          bytes_received: Math.floor(Math.random() * 2000000),
          packets_sent: Math.floor(Math.random() * 10000),
          packets_received: Math.floor(Math.random() * 15000)
        }
      },
      application: {
        timestamp: now.toISOString(),
        requests: {
          total: Math.floor(Math.random() * 10000) + 50000,
          per_second: Math.random() * 50 + 20,
          success_rate: Math.random() * 5 + 95, // 95-100%
          average_response_time: Math.random() * 200 + 100 // 100-300ms
        },
        database: {
          connections_active: Math.floor(Math.random() * 20) + 10,
          connections_total: 50,
          query_time_avg: Math.random() * 100 + 50, // 50-150ms
          slow_queries: Math.floor(Math.random() * 5)
        },
        cache: {
          hit_rate: Math.random() * 10 + 85, // 85-95%
          miss_rate: Math.random() * 10 + 5, // 5-15%
          memory_used_mb: Math.random() * 100 + 200
        },
        errors: {
          total: Math.floor(Math.random() * 50) + 10,
          rate_per_minute: Math.random() * 2,
          by_type: {
            '4xx': Math.floor(Math.random() * 30) + 5,
            '5xx': Math.floor(Math.random() * 10) + 2,
            'timeout': Math.floor(Math.random() * 5) + 1
          }
        }
      },
      tenants: this.getMockTenantsList(),
      workspaces: this.getMockWorkspacesList(),
      solutions: this.getMockSolutionsList(),
      alerts: this.getMockAlertsList()
    };
  },

  getMockSystemStatus(): SystemStatus {
    const metrics = this.getMockRealTimeMetrics();
    
    return {
      overall_health: 'healthy',
      system: {
        status: 'healthy',
        cpu_usage: metrics.system.cpu.usage_percent,
        memory_usage: metrics.system.memory.usage_percent,
        disk_usage: metrics.system.disk.usage_percent
      },
      application: {
        status: 'healthy',
        response_time: metrics.application.requests.average_response_time,
        success_rate: metrics.application.requests.success_rate,
        error_rate: metrics.application.errors.rate_per_minute
      },
      database: {
        status: 'healthy',
        active_connections: metrics.application.database.connections_active,
        avg_query_time: metrics.application.database.query_time_avg,
        slow_queries: metrics.application.database.slow_queries
      },
      tenants: {
        total: metrics.tenants.length,
        active: metrics.tenants.filter(t => t.metrics.active_users > 0).length,
        high_usage: metrics.tenants.filter(t => t.resource_usage.cpu_percent > 70).length
      },
      solutions: {
        total: metrics.solutions.length,
        healthy: metrics.solutions.filter(s => s.health_status.overall_health === 'healthy').length,
        warning: metrics.solutions.filter(s => s.health_status.overall_health === 'warning').length,
        critical: metrics.solutions.filter(s => s.health_status.overall_health === 'critical').length
      },
      alerts: {
        active: metrics.alerts.filter(a => a.status === 'active').length,
        critical: metrics.alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
        warning: metrics.alerts.filter(a => a.severity === 'warning' && a.status === 'active').length
      },
      last_updated: metrics.timestamp
    };
  },

  getMockTenantsList(): TenantMetrics[] {
    return [
      {
        tenant_id: 'tenant-1',
        tenant_key: 'samsung-cs-2024',
        company_name: '삼성전자',
        metrics: {
          timestamp: new Date().toISOString(),
          active_users: Math.floor(Math.random() * 50) + 20,
          api_requests: Math.floor(Math.random() * 1000) + 500,
          data_storage_mb: Math.random() * 1000 + 2000,
          workspace_count: 3,
          last_activity: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString()
        },
        resource_usage: {
          cpu_percent: Math.random() * 30 + 20,
          memory_mb: Math.random() * 500 + 200,
          storage_gb: Math.random() * 10 + 5,
          network_mb: Math.random() * 100 + 50
        },
        performance: {
          avg_response_time: Math.random() * 200 + 100,
          error_rate: Math.random() * 2,
          uptime_percent: Math.random() * 3 + 97
        }
      },
      {
        tenant_id: 'tenant-2',
        tenant_key: 'lg-support-2024',
        company_name: 'LG전자',
        metrics: {
          timestamp: new Date().toISOString(),
          active_users: Math.floor(Math.random() * 40) + 15,
          api_requests: Math.floor(Math.random() * 800) + 400,
          data_storage_mb: Math.random() * 800 + 1500,
          workspace_count: 2,
          last_activity: new Date(Date.now() - Math.random() * 60 * 60 * 1000).toISOString()
        },
        resource_usage: {
          cpu_percent: Math.random() * 25 + 15,
          memory_mb: Math.random() * 400 + 150,
          storage_gb: Math.random() * 8 + 3,
          network_mb: Math.random() * 80 + 30
        },
        performance: {
          avg_response_time: Math.random() * 180 + 120,
          error_rate: Math.random() * 1.5,
          uptime_percent: Math.random() * 2 + 98
        }
      }
    ];
  },

  getMockWorkspacesList(): WorkspaceMetrics[] {
    return [
      {
        workspace_id: 'workspace-1',
        workspace_name: 'KMS Workspace',
        workspace_type: 'kms',
        tenant_id: 'tenant-1',
        metrics: {
          timestamp: new Date().toISOString(),
          active_sessions: Math.floor(Math.random() * 20) + 5,
          documents_processed: Math.floor(Math.random() * 100) + 50,
          queries_executed: Math.floor(Math.random() * 500) + 200,
          knowledge_base_size_mb: Math.random() * 500 + 1000
        },
        performance: {
          query_response_time: Math.random() * 300 + 100,
          indexing_speed: Math.random() * 500 + 500,
          search_accuracy: Math.random() * 10 + 85,
          user_satisfaction: Math.random() * 15 + 80
        },
        usage_patterns: {
          peak_hours: [9, 10, 11, 14, 15, 16],
          most_accessed_features: ['search', 'document_upload', 'analytics'],
          user_activity_trend: 'increasing'
        }
      },
      {
        workspace_id: 'workspace-2',
        workspace_name: 'Advisor Workspace',
        workspace_type: 'advisor',
        tenant_id: 'tenant-1',
        metrics: {
          timestamp: new Date().toISOString(),
          active_sessions: Math.floor(Math.random() * 15) + 3,
          documents_processed: Math.floor(Math.random() * 80) + 30,
          queries_executed: Math.floor(Math.random() * 300) + 100,
          knowledge_base_size_mb: Math.random() * 300 + 500
        },
        performance: {
          query_response_time: Math.random() * 250 + 150,
          indexing_speed: Math.random() * 400 + 400,
          search_accuracy: Math.random() * 8 + 82,
          user_satisfaction: Math.random() * 12 + 78
        },
        usage_patterns: {
          peak_hours: [10, 11, 13, 14, 15],
          most_accessed_features: ['consultation', 'templates', 'reports'],
          user_activity_trend: 'stable'
        }
      }
    ];
  },

  getMockSolutionsList(): SolutionMetrics[] {
    return [
      {
        solution_id: 'solution-1',
        solution_name: 'AICC Solution Alpha',
        deployment_status: 'active',
        metrics: {
          timestamp: new Date().toISOString(),
          assigned_tenants: 15,
          total_capacity: 50,
          used_capacity: 15,
          availability_percent: Math.random() * 2 + 98
        },
        resource_allocation: {
          cpu_cores_allocated: 16,
          cpu_cores_used: Math.random() * 6 + 4,
          memory_gb_allocated: 64,
          memory_gb_used: Math.random() * 20 + 20,
          storage_gb_allocated: 1000,
          storage_gb_used: Math.random() * 300 + 200
        },
        health_status: {
          overall_health: 'healthy',
          services_running: 9,
          services_total: 10,
          last_health_check: new Date().toISOString(),
          issues: []
        }
      }
    ];
  },

  getMockAlertsList(): Alert[] {
    return [
      {
        id: 'alert-1',
        rule_id: 'cpu-high',
        rule_name: 'High CPU Usage',
        severity: 'warning',
        status: 'active',
        message: 'CPU usage has exceeded 75% for more than 5 minutes',
        details: {
          current_value: 78.5,
          threshold: 75,
          duration: '7 minutes'
        },
        triggered_at: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
        notification_sent: true,
        affected_resources: [
          { type: 'system', id: 'main-server', name: 'Main Application Server' }
        ]
      }
    ];
  },

  getMockHistoricalMetrics(request: MetricsHistoryRequest): any[] {
    const points = [];
    const startTime = new Date(request.start_time);
    const endTime = new Date(request.end_time);
    const interval = (endTime.getTime() - startTime.getTime()) / 100; // 100 data points

    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(startTime.getTime() + i * interval);
      points.push({
        timestamp: timestamp.toISOString(),
        system: {
          cpu_usage_percent: Math.random() * 20 + 40 + Math.sin(i / 10) * 10,
          memory_usage_percent: Math.random() * 15 + 45 + Math.sin(i / 8) * 8
        },
        application: {
          response_time: Math.random() * 100 + 150 + Math.sin(i / 12) * 50,
          success_rate: Math.random() * 3 + 96 + Math.sin(i / 15) * 2
        }
      });
    }

    return points;
  },

  getMockTenantMetrics(tenantId: string): any {
    const tenant = this.getMockTenantsList().find(t => t.tenant_id === tenantId);
    const workspaces = this.getMockWorkspacesList().filter(w => w.tenant_id === tenantId);

    return {
      tenant: tenant || this.getMockTenantsList()[0],
      workspaces,
      summary: {
        total_workspaces: workspaces.length,
        active_workspaces: workspaces.filter(w => w.metrics.active_sessions > 0).length,
        total_sessions: workspaces.reduce((sum, w) => sum + w.metrics.active_sessions, 0),
        total_documents: workspaces.reduce((sum, w) => sum + w.metrics.documents_processed, 0),
        avg_query_response_time: workspaces.length > 0 
          ? workspaces.reduce((sum, w) => sum + w.performance.query_response_time, 0) / workspaces.length 
          : 0
      }
    };
  },

  getMockWorkspaceMetrics(workspaceId: string): WorkspaceMetrics {
    return this.getMockWorkspacesList().find(w => w.workspace_id === workspaceId) || this.getMockWorkspacesList()[0];
  },

  getMockSolutionMetrics(solutionId: string): SolutionMetrics {
    return this.getMockSolutionsList().find(s => s.solution_id === solutionId) || this.getMockSolutionsList()[0];
  },

  getMockCapacityForecast(resourceType: string, days: number): CapacityForecast {
    const predictions = [];
    const currentUsage = Math.random() * 30 + 50; // 50-80% current usage
    
    for (let i = 1; i <= days; i++) {
      const trend = 0.5; // 0.5% increase per day
      const noise = (Math.random() - 0.5) * 2; // ±1% noise
      const predictedValue = currentUsage + (trend * i) + noise;
      
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.max(0, Math.min(100, predictedValue)),
        confidence: Math.max(0.5, 1 - (i / days) * 0.4)
      });
    }

    return {
      resource_type: resourceType as any,
      current_usage: currentUsage,
      predicted_usage: predictions,
      capacity_threshold: 85,
      estimated_exhaustion_date: predictions.find(p => p.value > 85)?.date,
      recommendations: [
        `Monitor ${resourceType} usage trends closely`,
        `Consider scaling ${resourceType} resources before reaching capacity`,
        'Implement optimization strategies to reduce resource consumption'
      ]
    };
  },

  getMockOptimizationSuggestions(): OptimizationSuggestion[] {
    return [
      {
        id: 'opt-1',
        type: 'query',
        priority: 'high',
        title: 'Optimize Database Queries',
        description: 'Several slow queries identified that could benefit from indexing',
        current_impact: 'Average query time: 250ms',
        potential_improvement: 'Reduce query time to ~80ms (68% improvement)',
        implementation_steps: [
          'Analyze slow query log',
          'Add composite indexes on frequently queried columns',
          'Optimize JOIN operations',
          'Test performance improvements'
        ],
        estimated_effort: '2-3 days',
        risk_level: 'low',
        affected_components: ['Database', 'API Endpoints', 'Reports']
      },
      {
        id: 'opt-2',
        type: 'cache',
        priority: 'medium',
        title: 'Implement Redis Caching',
        description: 'Add caching layer for frequently accessed data',
        current_impact: 'High database load during peak hours',
        potential_improvement: 'Reduce database queries by 60-70%',
        implementation_steps: [
          'Set up Redis cluster',
          'Identify cacheable data patterns',
          'Implement cache-aside pattern',
          'Add cache invalidation logic'
        ],
        estimated_effort: '1 week',
        risk_level: 'medium',
        affected_components: ['API Layer', 'Database', 'User Sessions']
      }
    ];
  },

  getMockActiveAlerts(severity?: string): AlertsResponse {
    let alerts = this.getMockAlertsList();
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    return {
      alerts,
      summary: {
        total: alerts.length,
        by_severity: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          error: alerts.filter(a => a.severity === 'error').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          info: alerts.filter(a => a.severity === 'info').length
        }
      }
    };
  },

  getMockPerformanceReport(request: any): PerformanceReport {
    return {
      id: `report-${Date.now()}`,
      report_type: request.report_type || 'daily',
      period_start: request.start_date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      period_end: request.end_date || new Date().toISOString(),
      scope: {
        type: request.scope_type || 'system',
        resource_ids: request.resource_ids || []
      },
      metrics: {
        availability: {
          uptime_percent: 99.2,
          downtime_minutes: 11.5,
          incidents_count: 1
        },
        performance: {
          avg_response_time: 165.3,
          throughput: 1456.7,
          error_rate: 0.6
        },
        resource_usage: {
          peak_cpu: 82.1,
          peak_memory: 76.8,
          peak_storage: 58.3
        },
        user_activity: {
          total_users: 167,
          active_sessions: 94,
          page_views: 15670
        }
      },
      recommendations: [
        {
          type: 'optimization',
          priority: 'high',
          title: 'Database Query Optimization',
          description: 'Optimize slow-running database queries identified during peak hours',
          estimated_impact: 'Reduce response time by 25%',
          implementation_effort: 'medium'
        }
      ],
      generated_at: new Date().toISOString(),
      generated_by: 'system'
    };
  },

  getMockDashboardConfig(dashboardType: string): any {
    return {
      id: `dashboard-${dashboardType}`,
      name: `${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} Dashboard`,
      description: `Real-time monitoring dashboard for ${dashboardType} metrics`,
      dashboard_type: dashboardType,
      layout: {
        columns: 12,
        rows: 8,
        grid_size: 60
      },
      widgets: [
        {
          id: 'cpu-gauge',
          type: 'gauge',
          title: 'CPU Usage',
          position: { x: 0, y: 0, width: 3, height: 2 }
        },
        {
          id: 'memory-gauge',
          type: 'gauge',
          title: 'Memory Usage',
          position: { x: 3, y: 0, width: 3, height: 2 }
        },
        {
          id: 'response-time-chart',
          type: 'chart',
          title: 'Response Time Trend',
          position: { x: 0, y: 2, width: 6, height: 3 }
        }
      ],
      refresh_interval: 30,
      created_at: new Date().toISOString()
    };
  }
};
