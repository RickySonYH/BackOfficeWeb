// [advice from AI] 모니터링 API 컨트롤러

import { Request, Response } from 'express';
import { MonitoringService } from '../services/monitoring.service';
import { logger } from '../utils/logger';
import { GetMetricsRequest } from '../types/monitoring';

export class MonitoringController {
  private monitoringService: MonitoringService;

  constructor() {
    this.monitoringService = new MonitoringService();
  }

  /**
   * 실시간 메트릭 조회 API
   */
  getRealTimeMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await this.monitoringService.getRealTimeMetrics();
      
      if (metrics) {
        res.status(200).json({
          success: true,
          data: metrics
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
      }
    } catch (error) {
      logger.error('Failed to get real-time metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 히스토리 메트릭 조회 API
   */
  getHistoricalMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        metric_types = ['system', 'application'],
        start_time,
        end_time,
        granularity = '5m',
        tenant_ids,
        workspace_ids,
        solution_ids
      } = req.query;

      if (!start_time || !end_time) {
        res.status(400).json({
          success: false,
          error: 'start_time and end_time are required'
        });
        return;
      }

      const request: GetMetricsRequest = {
        metric_types: Array.isArray(metric_types) ? metric_types as string[] : [metric_types as string],
        time_range: {
          start: start_time as string,
          end: end_time as string
        },
        granularity: granularity as any,
        filters: {
          tenant_ids: tenant_ids ? (Array.isArray(tenant_ids) ? tenant_ids as string[] : [tenant_ids as string]) : undefined,
          workspace_ids: workspace_ids ? (Array.isArray(workspace_ids) ? workspace_ids as string[] : [workspace_ids as string]) : undefined,
          solution_ids: solution_ids ? (Array.isArray(solution_ids) ? solution_ids as string[] : [solution_ids as string]) : undefined
        }
      };

      const result = await this.monitoringService.getMetrics(request);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('Failed to get historical metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 시스템 상태 요약 API
   */
  getSystemStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await this.monitoringService.getRealTimeMetrics();
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
        return;
      }

      // 시스템 상태 요약 생성
      const systemStatus = {
        overall_health: this.calculateOverallHealth(metrics),
        system: {
          status: this.getResourceStatus(metrics.system.cpu.usage_percent, 80),
          cpu_usage: metrics.system.cpu.usage_percent,
          memory_usage: metrics.system.memory.usage_percent,
          disk_usage: metrics.system.disk.usage_percent
        },
        application: {
          status: this.getApplicationStatus(metrics.application),
          response_time: metrics.application.requests.average_response_time,
          success_rate: metrics.application.requests.success_rate,
          error_rate: metrics.application.errors.rate_per_minute
        },
        database: {
          status: this.getDatabaseStatus(metrics.application.database),
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

      res.status(200).json({
        success: true,
        data: systemStatus
      });
    } catch (error) {
      logger.error('Failed to get system status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 테넌트별 메트릭 API
   */
  getTenantMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const { time_range = '1h' } = req.query;

      const metrics = await this.monitoringService.getRealTimeMetrics();
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
        return;
      }

      const tenantMetric = metrics.tenants.find(t => t.tenant_id === tenantId);
      
      if (!tenantMetric) {
        res.status(404).json({
          success: false,
          error: 'Tenant not found'
        });
        return;
      }

      // 테넌트의 워크스페이스 메트릭도 포함
      const workspaceMetrics = metrics.workspaces.filter(w => w.tenant_id === tenantId);

      const tenantData = {
        tenant: tenantMetric,
        workspaces: workspaceMetrics,
        summary: {
          total_workspaces: workspaceMetrics.length,
          active_workspaces: workspaceMetrics.filter(w => w.metrics.active_sessions > 0).length,
          total_sessions: workspaceMetrics.reduce((sum, w) => sum + w.metrics.active_sessions, 0),
          total_documents: workspaceMetrics.reduce((sum, w) => sum + w.metrics.documents_processed, 0),
          avg_query_response_time: workspaceMetrics.length > 0 
            ? workspaceMetrics.reduce((sum, w) => sum + w.performance.query_response_time, 0) / workspaceMetrics.length 
            : 0
        }
      };

      res.status(200).json({
        success: true,
        data: tenantData
      });
    } catch (error) {
      logger.error('Failed to get tenant metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 워크스페이스별 메트릭 API
   */
  getWorkspaceMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workspaceId } = req.params;

      const metrics = await this.monitoringService.getRealTimeMetrics();
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
        return;
      }

      const workspaceMetric = metrics.workspaces.find(w => w.workspace_id === workspaceId);
      
      if (!workspaceMetric) {
        res.status(404).json({
          success: false,
          error: 'Workspace not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: workspaceMetric
      });
    } catch (error) {
      logger.error('Failed to get workspace metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 솔루션별 메트릭 API
   */
  getSolutionMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const { solutionId } = req.params;

      const metrics = await this.monitoringService.getRealTimeMetrics();
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
        return;
      }

      const solutionMetric = metrics.solutions.find(s => s.solution_id === solutionId);
      
      if (!solutionMetric) {
        res.status(404).json({
          success: false,
          error: 'Solution not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: solutionMetric
      });
    } catch (error) {
      logger.error('Failed to get solution metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 용량 예측 API
   */
  getCapacityForecast = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resource_type = 'cpu', days = 30 } = req.query;

      const forecast = await this.monitoringService.generateCapacityForecast(
        resource_type as string, 
        parseInt(days as string)
      );

      res.status(200).json({
        success: true,
        data: forecast
      });
    } catch (error) {
      logger.error('Failed to generate capacity forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 최적화 제안 API
   */
  getOptimizationSuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const suggestions = await this.monitoringService.generateOptimizationSuggestions();

      res.status(200).json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      logger.error('Failed to get optimization suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 활성 알림 조회 API
   */
  getActiveAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { severity, status = 'active' } = req.query;

      const metrics = await this.monitoringService.getRealTimeMetrics();
      
      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'No metrics available'
        });
        return;
      }

      let alerts = metrics.alerts.filter(alert => alert.status === status);
      
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      // 심각도별로 정렬 (critical > error > warning > info)
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      alerts.sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0));

      res.status(200).json({
        success: true,
        data: {
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
        }
      });
    } catch (error) {
      logger.error('Failed to get active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 성능 리포트 생성 API
   */
  generatePerformanceReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        report_type = 'daily',
        start_date,
        end_date,
        scope_type = 'system',
        resource_ids
      } = req.body;

      // 실제 구현에서는 데이터베이스에서 히스토리 데이터를 분석하여 리포트 생성
      // 지금은 모의 리포트 반환
      const mockReport = {
        id: `report-${Date.now()}`,
        report_type,
        period_start: start_date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        period_end: end_date || new Date().toISOString(),
        scope: {
          type: scope_type,
          resource_ids: resource_ids || []
        },
        metrics: {
          availability: {
            uptime_percent: 99.5,
            downtime_minutes: 7.2,
            incidents_count: 2
          },
          performance: {
            avg_response_time: 145.6,
            throughput: 1250.5,
            error_rate: 0.8
          },
          resource_usage: {
            peak_cpu: 78.5,
            peak_memory: 82.3,
            peak_storage: 65.1
          },
          user_activity: {
            total_users: 145,
            active_sessions: 89,
            page_views: 12450
          }
        },
        recommendations: [
          {
            type: 'optimization',
            priority: 'medium',
            title: 'Database Query Optimization',
            description: 'Several slow queries identified that could be optimized',
            estimated_impact: 'Reduce average response time by 20%',
            implementation_effort: 'medium'
          },
          {
            type: 'scaling',
            priority: 'low',
            title: 'Consider Memory Upgrade',
            description: 'Memory usage approaching capacity during peak hours',
            estimated_impact: 'Improve system stability and performance',
            implementation_effort: 'low'
          }
        ],
        generated_at: new Date().toISOString(),
        generated_by: req.user?.id || 'system'
      };

      res.status(200).json({
        success: true,
        data: mockReport
      });
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * 모니터링 대시보드 설정 조회 API
   */
  getDashboardConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { dashboard_type = 'system' } = req.query;

      // 실제 구현에서는 사용자 맞춤 대시보드 설정 조회
      const mockConfig = {
        id: `dashboard-${dashboard_type}`,
        name: `${dashboard_type} Dashboard`,
        description: `Real-time monitoring dashboard for ${dashboard_type} metrics`,
        dashboard_type,
        layout: {
          columns: 12,
          rows: 8,
          grid_size: 60
        },
        widgets: [
          {
            id: 'cpu-usage',
            type: 'gauge',
            title: 'CPU Usage',
            position: { x: 0, y: 0, width: 3, height: 2 },
            data_source: {
              metric_type: 'system',
              query: 'cpu_usage_percent',
              aggregation: 'avg',
              time_range: '5m'
            },
            visualization: {
              color_scheme: 'green-yellow-red',
              show_legend: false
            }
          },
          {
            id: 'memory-usage',
            type: 'gauge',
            title: 'Memory Usage',
            position: { x: 3, y: 0, width: 3, height: 2 },
            data_source: {
              metric_type: 'system',
              query: 'memory_usage_percent',
              aggregation: 'avg',
              time_range: '5m'
            },
            visualization: {
              color_scheme: 'green-yellow-red',
              show_legend: false
            }
          },
          {
            id: 'response-time-chart',
            type: 'chart',
            title: 'Response Time',
            position: { x: 0, y: 2, width: 6, height: 3 },
            data_source: {
              metric_type: 'application',
              query: 'avg_response_time',
              aggregation: 'avg',
              time_range: '1h'
            },
            visualization: {
              chart_type: 'line',
              color_scheme: 'blue',
              show_legend: true,
              show_grid: true
            }
          },
          {
            id: 'active-alerts',
            type: 'table',
            title: 'Active Alerts',
            position: { x: 6, y: 0, width: 6, height: 5 },
            data_source: {
              metric_type: 'alerts',
              query: 'active_alerts',
              aggregation: 'count',
              time_range: '24h'
            },
            visualization: {
              show_legend: false
            }
          }
        ],
        filters: [],
        refresh_interval: 30,
        is_public: false,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      res.status(200).json({
        success: true,
        data: mockConfig
      });
    } catch (error) {
      logger.error('Failed to get dashboard config:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 헬퍼 메서드들
  private calculateOverallHealth(metrics: any): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = metrics.alerts.filter((a: any) => a.severity === 'critical' && a.status === 'active').length;
    const warningAlerts = metrics.alerts.filter((a: any) => a.severity === 'warning' && a.status === 'active').length;
    
    const highCpuUsage = metrics.system.cpu.usage_percent > 80;
    const highMemoryUsage = metrics.system.memory.usage_percent > 85;
    const highErrorRate = metrics.application.errors.rate_per_minute > 10;

    if (criticalAlerts > 0 || highCpuUsage || highMemoryUsage || highErrorRate) {
      return 'critical';
    } else if (warningAlerts > 0 || metrics.system.cpu.usage_percent > 70 || metrics.system.memory.usage_percent > 75) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private getResourceStatus(usage: number, threshold: number): 'healthy' | 'warning' | 'critical' {
    if (usage > threshold * 1.1) return 'critical';
    if (usage > threshold * 0.8) return 'warning';
    return 'healthy';
  }

  private getApplicationStatus(appMetrics: any): 'healthy' | 'warning' | 'critical' {
    if (appMetrics.requests.success_rate < 95 || appMetrics.requests.average_response_time > 1000) {
      return 'critical';
    } else if (appMetrics.requests.success_rate < 98 || appMetrics.requests.average_response_time > 500) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  private getDatabaseStatus(dbMetrics: any): 'healthy' | 'warning' | 'critical' {
    if (dbMetrics.query_time_avg > 1000 || dbMetrics.slow_queries > 10) {
      return 'critical';
    } else if (dbMetrics.query_time_avg > 500 || dbMetrics.slow_queries > 5) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }
}
