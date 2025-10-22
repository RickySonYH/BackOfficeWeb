// [advice from AI] 실시간 모니터링 및 메트릭 수집 서비스

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import os from 'os';
import fs from 'fs';
import { promisify } from 'util';
import {
  SystemMetrics,
  ApplicationMetrics,
  TenantMetrics,
  WorkspaceMetrics,
  SolutionMetrics,
  RealTimeMetrics,
  Alert,
  AlertRule,
  HealthIssue,
  CapacityForecast,
  GetMetricsRequest,
  GetMetricsResponse,
  PerformanceReport,
  LogAnalysis,
  OptimizationSuggestion
} from '../types/monitoring';

export class MonitoringService {
  private metricsInterval: NodeJS.Timeout | null = null;
  private alertCheckInterval: NodeJS.Timeout | null = null;
  private metricsHistory: Map<string, any[]> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private subscribers: Map<string, any> = new Map();

  constructor() {
    this.initializeMetricsCollection();
  }

  /**
   * 모니터링 서비스 시작
   */
  async startMonitoring(): Promise<void> {
    logger.info('Starting monitoring service...');

    // 메트릭 수집 시작 (30초 간격)
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectAndStoreMetrics();
      } catch (error) {
        logger.error('Metrics collection failed:', error);
      }
    }, 30000);

    // 알림 규칙 확인 (1분 간격)
    this.alertCheckInterval = setInterval(async () => {
      try {
        await this.checkAlertRules();
      } catch (error) {
        logger.error('Alert rule checking failed:', error);
      }
    }, 60000);

    // 초기 메트릭 수집
    await this.collectAndStoreMetrics();

    logger.info('Monitoring service started successfully');
  }

  /**
   * 모니터링 서비스 중지
   */
  stopMonitoring(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }

    logger.info('Monitoring service stopped');
  }

  /**
   * 시스템 메트릭 수집
   */
  async collectSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();

    // CPU 사용률 계산 (간단한 추정)
    let cpuUsage = 0;
    cpus.forEach(cpu => {
      const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
      const idle = cpu.times.idle;
      cpuUsage += ((total - idle) / total) * 100;
    });
    cpuUsage = cpuUsage / cpus.length;

    // 디스크 사용량 (루트 파티션)
    let diskUsage = { used_gb: 0, total_gb: 0, usage_percent: 0, available_gb: 0 };
    try {
      const stats = await promisify(fs.statvfs)('/');
      const total = (stats.blocks * stats.frsize) / (1024 ** 3);
      const available = (stats.bavail * stats.frsize) / (1024 ** 3);
      const used = total - available;
      
      diskUsage = {
        used_gb: Math.round(used * 100) / 100,
        total_gb: Math.round(total * 100) / 100,
        usage_percent: Math.round((used / total) * 100 * 100) / 100,
        available_gb: Math.round(available * 100) / 100
      };
    } catch (error) {
      // 디스크 정보를 가져올 수 없는 경우 기본값 사용
      logger.warn('Could not retrieve disk usage information');
    }

    return {
      timestamp: new Date().toISOString(),
      cpu: {
        usage_percent: Math.round(cpuUsage * 100) / 100,
        cores: cpus.length,
        load_average: loadAvg
      },
      memory: {
        used_mb: Math.round(usedMem / (1024 ** 2)),
        total_mb: Math.round(totalMem / (1024 ** 2)),
        usage_percent: Math.round((usedMem / totalMem) * 100 * 100) / 100,
        available_mb: Math.round(freeMem / (1024 ** 2))
      },
      disk: diskUsage,
      network: {
        bytes_sent: 0, // 실제 구현에서는 네트워크 인터페이스에서 수집
        bytes_received: 0,
        packets_sent: 0,
        packets_received: 0
      }
    };
  }

  /**
   * 애플리케이션 메트릭 수집
   */
  async collectApplicationMetrics(): Promise<ApplicationMetrics> {
    // 데이터베이스에서 최근 메트릭 조회
    const dbMetrics = await this.getDatabaseMetrics();
    const requestMetrics = await this.getRequestMetrics();
    const errorMetrics = await this.getErrorMetrics();

    return {
      timestamp: new Date().toISOString(),
      requests: {
        total: requestMetrics.total,
        per_second: requestMetrics.per_second,
        success_rate: requestMetrics.success_rate,
        average_response_time: requestMetrics.avg_response_time
      },
      database: {
        connections_active: dbMetrics.active_connections,
        connections_total: dbMetrics.total_connections,
        query_time_avg: dbMetrics.avg_query_time,
        slow_queries: dbMetrics.slow_queries
      },
      cache: {
        hit_rate: 85.5, // 실제 구현에서는 Redis/Memcached에서 수집
        miss_rate: 14.5,
        memory_used_mb: 256
      },
      errors: {
        total: errorMetrics.total,
        rate_per_minute: errorMetrics.rate_per_minute,
        by_type: errorMetrics.by_type
      }
    };
  }

  /**
   * 테넌트별 메트릭 수집
   */
  async collectTenantMetrics(): Promise<TenantMetrics[]> {
    const result = await pool.query(`
      SELECT 
        t.id as tenant_id,
        t.tenant_key,
        c.name as company_name,
        COUNT(DISTINCT u.id) as active_users,
        COUNT(DISTINCT w.id) as workspace_count,
        COALESCE(SUM(tm.api_requests), 0) as api_requests,
        COALESCE(SUM(tm.data_storage_mb), 0) as data_storage_mb,
        MAX(u.last_login_at) as last_activity
      FROM tenants t
      JOIN companies c ON t.company_id = c.id
      LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = true
      LEFT JOIN workspaces w ON t.id = w.tenant_id AND w.status = 'active'
      LEFT JOIN tenant_metrics tm ON t.id = tm.tenant_id 
        AND tm.timestamp > NOW() - INTERVAL '1 hour'
      WHERE t.deployment_status = 'active'
      GROUP BY t.id, t.tenant_key, c.name
      ORDER BY c.name
    `);

    return result.rows.map(row => ({
      tenant_id: row.tenant_id,
      tenant_key: row.tenant_key,
      company_name: row.company_name,
      metrics: {
        timestamp: new Date().toISOString(),
        active_users: parseInt(row.active_users) || 0,
        api_requests: parseInt(row.api_requests) || 0,
        data_storage_mb: parseFloat(row.data_storage_mb) || 0,
        workspace_count: parseInt(row.workspace_count) || 0,
        last_activity: row.last_activity || new Date().toISOString()
      },
      resource_usage: {
        cpu_percent: Math.random() * 20 + 10, // 시뮬레이션 데이터
        memory_mb: Math.random() * 500 + 100,
        storage_gb: Math.random() * 10 + 1,
        network_mb: Math.random() * 100 + 10
      },
      performance: {
        avg_response_time: Math.random() * 200 + 100,
        error_rate: Math.random() * 2,
        uptime_percent: 95 + Math.random() * 4.9
      }
    }));
  }

  /**
   * 워크스페이스별 메트릭 수집
   */
  async collectWorkspaceMetrics(): Promise<WorkspaceMetrics[]> {
    const result = await pool.query(`
      SELECT 
        w.id as workspace_id,
        w.name as workspace_name,
        w.type as workspace_type,
        w.tenant_id,
        COUNT(DISTINCT ws.id) as active_sessions,
        COALESCE(SUM(wm.documents_processed), 0) as documents_processed,
        COALESCE(SUM(wm.queries_executed), 0) as queries_executed,
        COALESCE(SUM(wm.knowledge_base_size_mb), 0) as knowledge_base_size_mb
      FROM workspaces w
      LEFT JOIN workspace_sessions ws ON w.id = ws.workspace_id 
        AND ws.status = 'active'
      LEFT JOIN workspace_metrics wm ON w.id = wm.workspace_id 
        AND wm.timestamp > NOW() - INTERVAL '1 hour'
      WHERE w.status = 'active'
      GROUP BY w.id, w.name, w.type, w.tenant_id
      ORDER BY w.name
    `);

    return result.rows.map(row => ({
      workspace_id: row.workspace_id,
      workspace_name: row.workspace_name,
      workspace_type: row.workspace_type,
      tenant_id: row.tenant_id,
      metrics: {
        timestamp: new Date().toISOString(),
        active_sessions: parseInt(row.active_sessions) || 0,
        documents_processed: parseInt(row.documents_processed) || 0,
        queries_executed: parseInt(row.queries_executed) || 0,
        knowledge_base_size_mb: parseFloat(row.knowledge_base_size_mb) || 0
      },
      performance: {
        query_response_time: Math.random() * 500 + 100,
        indexing_speed: Math.random() * 1000 + 500,
        search_accuracy: 85 + Math.random() * 10,
        user_satisfaction: 80 + Math.random() * 15
      },
      usage_patterns: {
        peak_hours: [9, 10, 11, 14, 15, 16],
        most_accessed_features: ['search', 'document_upload', 'analytics'],
        user_activity_trend: Math.random() > 0.5 ? 'increasing' : 'stable'
      }
    }));
  }

  /**
   * 솔루션별 메트릭 수집
   */
  async collectSolutionMetrics(): Promise<SolutionMetrics[]> {
    const result = await pool.query(`
      SELECT 
        ds.id as solution_id,
        ds.solution_name,
        ds.deployment_status,
        ds.max_tenants as total_capacity,
        ds.current_tenants as used_capacity,
        ds.max_cpu_cores,
        ds.current_cpu_usage,
        ds.max_memory_gb,
        ds.current_memory_usage,
        COUNT(tsm.id) as assigned_tenants
      FROM deployed_solutions ds
      LEFT JOIN tenant_solution_mappings tsm ON ds.id = tsm.solution_id 
        AND tsm.status = 'assigned'
      GROUP BY ds.id, ds.solution_name, ds.deployment_status, ds.max_tenants, 
               ds.current_tenants, ds.max_cpu_cores, ds.current_cpu_usage,
               ds.max_memory_gb, ds.current_memory_usage
      ORDER BY ds.solution_name
    `);

    return result.rows.map(row => {
      const healthIssues: HealthIssue[] = [];
      let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

      // 리소스 사용률 체크
      const cpuUsagePercent = (row.current_cpu_usage / row.max_cpu_cores) * 100;
      const memoryUsagePercent = (row.current_memory_usage / row.max_memory_gb) * 100;

      if (cpuUsagePercent > 80) {
        healthIssues.push({
          id: `cpu-${row.solution_id}`,
          severity: cpuUsagePercent > 90 ? 'critical' : 'high',
          component: 'CPU',
          message: `High CPU usage: ${cpuUsagePercent.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
        overallHealth = cpuUsagePercent > 90 ? 'critical' : 'warning';
      }

      if (memoryUsagePercent > 80) {
        healthIssues.push({
          id: `memory-${row.solution_id}`,
          severity: memoryUsagePercent > 90 ? 'critical' : 'high',
          component: 'Memory',
          message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
        overallHealth = memoryUsagePercent > 90 ? 'critical' : 'warning';
      }

      return {
        solution_id: row.solution_id,
        solution_name: row.solution_name,
        deployment_status: row.deployment_status,
        metrics: {
          timestamp: new Date().toISOString(),
          assigned_tenants: parseInt(row.assigned_tenants) || 0,
          total_capacity: parseInt(row.total_capacity) || 0,
          used_capacity: parseInt(row.used_capacity) || 0,
          availability_percent: Math.random() * 5 + 95 // 95-100% 시뮬레이션
        },
        resource_allocation: {
          cpu_cores_allocated: parseFloat(row.max_cpu_cores) || 0,
          cpu_cores_used: parseFloat(row.current_cpu_usage) || 0,
          memory_gb_allocated: parseFloat(row.max_memory_gb) || 0,
          memory_gb_used: parseFloat(row.current_memory_usage) || 0,
          storage_gb_allocated: 100, // 시뮬레이션 데이터
          storage_gb_used: Math.random() * 80 + 10
        },
        health_status: {
          overall_health: overallHealth,
          services_running: Math.floor(Math.random() * 2) + 8, // 8-9 services
          services_total: 10,
          last_health_check: new Date().toISOString(),
          issues: healthIssues
        }
      };
    });
  }

  /**
   * 모든 메트릭 수집 및 저장
   */
  async collectAndStoreMetrics(): Promise<RealTimeMetrics> {
    try {
      const [systemMetrics, appMetrics, tenantMetrics, workspaceMetrics, solutionMetrics] = 
        await Promise.all([
          this.collectSystemMetrics(),
          this.collectApplicationMetrics(),
          this.collectTenantMetrics(),
          this.collectWorkspaceMetrics(),
          this.collectSolutionMetrics()
        ]);

      const realTimeMetrics: RealTimeMetrics = {
        timestamp: new Date().toISOString(),
        system: systemMetrics,
        application: appMetrics,
        tenants: tenantMetrics,
        workspaces: workspaceMetrics,
        solutions: solutionMetrics,
        alerts: Array.from(this.activeAlerts.values())
      };

      // 메트릭 히스토리에 저장 (메모리, 최대 1000개 포인트)
      const historyKey = 'realtime_metrics';
      if (!this.metricsHistory.has(historyKey)) {
        this.metricsHistory.set(historyKey, []);
      }
      
      const history = this.metricsHistory.get(historyKey)!;
      history.push(realTimeMetrics);
      
      if (history.length > 1000) {
        history.shift(); // 오래된 데이터 제거
      }

      // 데이터베이스에 저장
      await this.storeMetricsToDatabase(realTimeMetrics);

      // 구독자들에게 실시간 데이터 전송
      this.notifySubscribers(realTimeMetrics);

      return realTimeMetrics;

    } catch (error) {
      logger.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  /**
   * 메트릭을 데이터베이스에 저장
   */
  private async storeMetricsToDatabase(metrics: RealTimeMetrics): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 시스템 메트릭 저장
      await client.query(`
        INSERT INTO system_metrics 
        (timestamp, cpu_usage_percent, memory_usage_percent, disk_usage_percent, 
         load_average, network_bytes_sent, network_bytes_received)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        metrics.timestamp,
        metrics.system.cpu.usage_percent,
        metrics.system.memory.usage_percent,
        metrics.system.disk.usage_percent,
        JSON.stringify(metrics.system.cpu.load_average),
        metrics.system.network.bytes_sent,
        metrics.system.network.bytes_received
      ]);

      // 애플리케이션 메트릭 저장
      await client.query(`
        INSERT INTO application_metrics 
        (timestamp, requests_total, requests_per_second, success_rate, 
         avg_response_time, db_connections_active, db_query_time_avg, error_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        metrics.timestamp,
        metrics.application.requests.total,
        metrics.application.requests.per_second,
        metrics.application.requests.success_rate,
        metrics.application.requests.average_response_time,
        metrics.application.database.connections_active,
        metrics.application.database.query_time_avg,
        metrics.application.errors.rate_per_minute
      ]);

      // 테넌트 메트릭 저장
      for (const tenant of metrics.tenants) {
        await client.query(`
          INSERT INTO tenant_metrics 
          (tenant_id, timestamp, active_users, api_requests, data_storage_mb,
           cpu_percent, memory_mb, avg_response_time, error_rate, uptime_percent)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (tenant_id, timestamp) DO UPDATE SET
            active_users = EXCLUDED.active_users,
            api_requests = EXCLUDED.api_requests,
            data_storage_mb = EXCLUDED.data_storage_mb,
            cpu_percent = EXCLUDED.cpu_percent,
            memory_mb = EXCLUDED.memory_mb,
            avg_response_time = EXCLUDED.avg_response_time,
            error_rate = EXCLUDED.error_rate,
            uptime_percent = EXCLUDED.uptime_percent
        `, [
          tenant.tenant_id,
          metrics.timestamp,
          tenant.metrics.active_users,
          tenant.metrics.api_requests,
          tenant.metrics.data_storage_mb,
          tenant.resource_usage.cpu_percent,
          tenant.resource_usage.memory_mb,
          tenant.performance.avg_response_time,
          tenant.performance.error_rate,
          tenant.performance.uptime_percent
        ]);
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to store metrics to database:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 메트릭 조회
   */
  async getMetrics(request: GetMetricsRequest): Promise<GetMetricsResponse> {
    try {
      const { metric_types, time_range, granularity, filters } = request;
      
      // 실제 구현에서는 데이터베이스에서 조회
      // 지금은 메모리에서 조회
      const history = this.metricsHistory.get('realtime_metrics') || [];
      
      // 시간 범위 필터링
      const startTime = new Date(time_range.start);
      const endTime = new Date(time_range.end);
      
      const filteredMetrics = history.filter(metric => {
        const metricTime = new Date(metric.timestamp);
        return metricTime >= startTime && metricTime <= endTime;
      });

      // 메트릭 타입별 필터링
      const processedMetrics = filteredMetrics.map(metric => {
        const result: any = { timestamp: metric.timestamp };
        
        metric_types.forEach(type => {
          switch (type) {
            case 'system':
              result.system = metric.system;
              break;
            case 'application':
              result.application = metric.application;
              break;
            case 'tenants':
              result.tenants = metric.tenants;
              break;
            case 'workspaces':
              result.workspaces = metric.workspaces;
              break;
            case 'solutions':
              result.solutions = metric.solutions;
              break;
          }
        });
        
        return result;
      });

      return {
        success: true,
        data: {
          metrics: processedMetrics,
          metadata: {
            total_points: processedMetrics.length,
            time_range: {
              start: time_range.start,
              end: time_range.end
            },
            granularity: granularity
          }
        }
      };

    } catch (error) {
      logger.error('Failed to get metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 실시간 메트릭 조회 (최신 데이터)
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics | null> {
    const history = this.metricsHistory.get('realtime_metrics');
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * 알림 규칙 확인
   */
  private async checkAlertRules(): Promise<void> {
    try {
      // 활성 알림 규칙 조회
      const rules = await this.getActiveAlertRules();
      const currentMetrics = await this.getRealTimeMetrics();
      
      if (!currentMetrics) return;

      for (const rule of rules) {
        const shouldAlert = await this.evaluateAlertRule(rule, currentMetrics);
        const alertId = `${rule.id}-${Date.now()}`;
        
        if (shouldAlert && !this.activeAlerts.has(rule.id)) {
          // 새 알림 생성
          const alert: Alert = {
            id: alertId,
            rule_id: rule.id,
            rule_name: rule.name,
            severity: rule.severity,
            status: 'active',
            message: `${rule.name}: ${rule.condition.metric_name} ${rule.condition.operator} ${rule.condition.threshold}`,
            details: {
              current_value: this.getMetricValue(currentMetrics, rule.condition.metric_name),
              threshold: rule.condition.threshold,
              operator: rule.condition.operator
            },
            triggered_at: new Date().toISOString(),
            notification_sent: false,
            affected_resources: this.getAffectedResources(rule, currentMetrics)
          };

          this.activeAlerts.set(rule.id, alert);
          await this.storeAlert(alert);
          await this.sendNotification(alert, rule);
          
          logger.warn(`Alert triggered: ${rule.name}`, { alert_id: alertId });
        } else if (!shouldAlert && this.activeAlerts.has(rule.id)) {
          // 알림 해결
          const alert = this.activeAlerts.get(rule.id)!;
          alert.status = 'resolved';
          alert.resolved_at = new Date().toISOString();
          
          await this.updateAlert(alert);
          this.activeAlerts.delete(rule.id);
          
          logger.info(`Alert resolved: ${rule.name}`, { alert_id: alert.id });
        }
      }

    } catch (error) {
      logger.error('Failed to check alert rules:', error);
    }
  }

  /**
   * 용량 예측 분석
   */
  async generateCapacityForecast(resourceType: string, days: number = 30): Promise<CapacityForecast> {
    // 실제 구현에서는 머신러닝 모델을 사용하여 예측
    // 지금은 간단한 선형 예측 사용
    
    const history = this.metricsHistory.get('realtime_metrics') || [];
    if (history.length < 2) {
      throw new Error('Insufficient data for forecasting');
    }

    const recentData = history.slice(-100); // 최근 100개 데이터 포인트
    const values = recentData.map(metric => this.getResourceValue(metric, resourceType));
    
    // 간단한 선형 회귀
    const trend = this.calculateTrend(values);
    const currentUsage = values[values.length - 1] || 0;
    
    // 예측 데이터 생성
    const predictions = [];
    for (let i = 1; i <= days; i++) {
      const predictedValue = currentUsage + (trend * i);
      predictions.push({
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        value: Math.max(0, predictedValue),
        confidence: Math.max(0.5, 1 - (i / days) * 0.4) // 시간이 지날수록 신뢰도 감소
      });
    }

    const capacityThreshold = this.getCapacityThreshold(resourceType);
    const exhaustionDate = predictions.find(p => p.value > capacityThreshold)?.date;

    return {
      resource_type: resourceType as any,
      current_usage: currentUsage,
      predicted_usage: predictions,
      capacity_threshold: capacityThreshold,
      estimated_exhaustion_date: exhaustionDate,
      recommendations: this.generateCapacityRecommendations(resourceType, trend, currentUsage, capacityThreshold)
    };
  }

  /**
   * 성능 최적화 제안 생성
   */
  async generateOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];
    const currentMetrics = await this.getRealTimeMetrics();
    
    if (!currentMetrics) return suggestions;

    // CPU 사용률 기반 제안
    if (currentMetrics.system.cpu.usage_percent > 80) {
      suggestions.push({
        id: 'cpu-optimization-1',
        type: 'resource',
        priority: 'high',
        title: 'High CPU Usage Detected',
        description: 'System CPU usage is consistently above 80%',
        current_impact: 'Potential performance degradation and slower response times',
        potential_improvement: 'Reduce CPU usage by 20-30% through optimization',
        implementation_steps: [
          'Analyze CPU-intensive processes',
          'Optimize database queries',
          'Implement caching strategies',
          'Consider horizontal scaling'
        ],
        estimated_effort: '2-3 days',
        risk_level: 'low',
        affected_components: ['API Server', 'Database', 'Background Jobs']
      });
    }

    // 메모리 사용률 기반 제안
    if (currentMetrics.system.memory.usage_percent > 85) {
      suggestions.push({
        id: 'memory-optimization-1',
        type: 'resource',
        priority: 'medium',
        title: 'High Memory Usage',
        description: 'System memory usage is above 85%',
        current_impact: 'Risk of out-of-memory errors and system instability',
        potential_improvement: 'Reduce memory usage by 15-20%',
        implementation_steps: [
          'Identify memory leaks',
          'Optimize data structures',
          'Implement memory pooling',
          'Add memory monitoring alerts'
        ],
        estimated_effort: '1-2 days',
        risk_level: 'medium',
        affected_components: ['Application Server', 'Cache Layer']
      });
    }

    // 데이터베이스 성능 기반 제안
    if (currentMetrics.application.database.query_time_avg > 500) {
      suggestions.push({
        id: 'db-optimization-1',
        type: 'query',
        priority: 'high',
        title: 'Slow Database Queries',
        description: 'Average database query time exceeds 500ms',
        current_impact: 'Slow application response times and poor user experience',
        potential_improvement: 'Reduce average query time by 50-70%',
        implementation_steps: [
          'Analyze slow query logs',
          'Add missing database indexes',
          'Optimize complex queries',
          'Implement query result caching'
        ],
        estimated_effort: '3-5 days',
        risk_level: 'low',
        affected_components: ['Database', 'API Endpoints', 'Reports']
      });
    }

    return suggestions;
  }

  // 헬퍼 메서드들
  private initializeMetricsCollection(): void {
    // 메트릭 테이블 초기화 (실제 구현에서는 migration으로 처리)
    this.createMetricsTables().catch(error => {
      logger.warn('Failed to create metrics tables:', error);
    });
  }

  private async createMetricsTables(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP NOT NULL,
          cpu_usage_percent DECIMAL(5,2),
          memory_usage_percent DECIMAL(5,2),
          disk_usage_percent DECIMAL(5,2),
          load_average JSONB,
          network_bytes_sent BIGINT,
          network_bytes_received BIGINT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS application_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP NOT NULL,
          requests_total INTEGER,
          requests_per_second DECIMAL(10,2),
          success_rate DECIMAL(5,2),
          avg_response_time DECIMAL(10,2),
          db_connections_active INTEGER,
          db_query_time_avg DECIMAL(10,2),
          error_rate DECIMAL(5,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tenant_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id),
          timestamp TIMESTAMP NOT NULL,
          active_users INTEGER DEFAULT 0,
          api_requests INTEGER DEFAULT 0,
          data_storage_mb DECIMAL(12,2) DEFAULT 0,
          cpu_percent DECIMAL(5,2) DEFAULT 0,
          memory_mb DECIMAL(10,2) DEFAULT 0,
          avg_response_time DECIMAL(10,2) DEFAULT 0,
          error_rate DECIMAL(5,2) DEFAULT 0,
          uptime_percent DECIMAL(5,2) DEFAULT 100,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, timestamp)
        );

        CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_application_metrics_timestamp ON application_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_tenant_metrics_timestamp ON tenant_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_tenant_metrics_tenant_id ON tenant_metrics(tenant_id);
      `);
    } finally {
      client.release();
    }
  }

  private async getDatabaseMetrics(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_connections,
          COUNT(*) as active_connections,
          AVG(EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000) as avg_query_time,
          COUNT(CASE WHEN state = 'active' AND query_start < NOW() - INTERVAL '1 second' THEN 1 END) as slow_queries
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return {
        total_connections: parseInt(result.rows[0].total_connections) || 0,
        active_connections: parseInt(result.rows[0].active_connections) || 0,
        avg_query_time: parseFloat(result.rows[0].avg_query_time) || 0,
        slow_queries: parseInt(result.rows[0].slow_queries) || 0
      };
    } catch (error) {
      return {
        total_connections: 0,
        active_connections: 0,
        avg_query_time: 0,
        slow_queries: 0
      };
    }
  }

  private async getRequestMetrics(): Promise<any> {
    // 실제 구현에서는 요청 로그나 메트릭 저장소에서 조회
    return {
      total: Math.floor(Math.random() * 10000) + 1000,
      per_second: Math.random() * 100 + 10,
      success_rate: 95 + Math.random() * 4,
      avg_response_time: Math.random() * 200 + 100
    };
  }

  private async getErrorMetrics(): Promise<any> {
    return {
      total: Math.floor(Math.random() * 100) + 10,
      rate_per_minute: Math.random() * 5,
      by_type: {
        '4xx': Math.floor(Math.random() * 50) + 5,
        '5xx': Math.floor(Math.random() * 20) + 2,
        'timeout': Math.floor(Math.random() * 10) + 1
      }
    };
  }

  private async getActiveAlertRules(): Promise<AlertRule[]> {
    // 실제 구현에서는 데이터베이스에서 조회
    return [
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        description: 'Alert when CPU usage exceeds 80%',
        metric_type: 'system',
        condition: {
          metric_name: 'cpu_usage_percent',
          operator: 'gt',
          threshold: 80,
          duration_minutes: 5
        },
        severity: 'warning',
        notification_channels: ['email', 'slack'],
        is_active: true,
        created_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }

  private async evaluateAlertRule(rule: AlertRule, metrics: RealTimeMetrics): Promise<boolean> {
    const currentValue = this.getMetricValue(metrics, rule.condition.metric_name);
    const threshold = rule.condition.threshold;
    
    switch (rule.condition.operator) {
      case 'gt': return currentValue > threshold;
      case 'lt': return currentValue < threshold;
      case 'gte': return currentValue >= threshold;
      case 'lte': return currentValue <= threshold;
      case 'eq': return currentValue === threshold;
      case 'ne': return currentValue !== threshold;
      default: return false;
    }
  }

  private getMetricValue(metrics: RealTimeMetrics, metricName: string): number {
    switch (metricName) {
      case 'cpu_usage_percent': return metrics.system.cpu.usage_percent;
      case 'memory_usage_percent': return metrics.system.memory.usage_percent;
      case 'disk_usage_percent': return metrics.system.disk.usage_percent;
      case 'avg_response_time': return metrics.application.requests.average_response_time;
      case 'error_rate': return metrics.application.errors.rate_per_minute;
      default: return 0;
    }
  }

  private getAffectedResources(rule: AlertRule, metrics: RealTimeMetrics): Array<{type: string; id: string; name: string}> {
    // 실제 구현에서는 규칙에 따라 영향받는 리소스 결정
    return [
      { type: 'system', id: 'main-server', name: 'Main Application Server' }
    ];
  }

  private async storeAlert(alert: Alert): Promise<void> {
    // 데이터베이스에 알림 저장
    try {
      await pool.query(`
        INSERT INTO alerts (id, rule_id, rule_name, severity, status, message, details, triggered_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        alert.id, alert.rule_id, alert.rule_name, alert.severity, 
        alert.status, alert.message, JSON.stringify(alert.details), alert.triggered_at
      ]);
    } catch (error) {
      logger.error('Failed to store alert:', error);
    }
  }

  private async updateAlert(alert: Alert): Promise<void> {
    try {
      await pool.query(`
        UPDATE alerts SET status = $1, resolved_at = $2 WHERE id = $3
      `, [alert.status, alert.resolved_at, alert.id]);
    } catch (error) {
      logger.error('Failed to update alert:', error);
    }
  }

  private async sendNotification(alert: Alert, rule: AlertRule): Promise<void> {
    // 실제 구현에서는 이메일, Slack 등으로 알림 전송
    logger.info(`Notification sent for alert: ${alert.rule_name}`, {
      alert_id: alert.id,
      severity: alert.severity,
      channels: rule.notification_channels
    });
  }

  private notifySubscribers(metrics: RealTimeMetrics): void {
    // WebSocket 구독자들에게 실시간 데이터 전송
    this.subscribers.forEach((subscriber, id) => {
      try {
        if (subscriber.websocket && subscriber.websocket.readyState === 1) {
          subscriber.websocket.send(JSON.stringify({
            type: 'metrics_update',
            data: metrics
          }));
        }
      } catch (error) {
        logger.error(`Failed to notify subscriber ${id}:`, error);
        this.subscribers.delete(id);
      }
    });
  }

  private getResourceValue(metric: any, resourceType: string): number {
    switch (resourceType) {
      case 'cpu': return metric.system?.cpu?.usage_percent || 0;
      case 'memory': return metric.system?.memory?.usage_percent || 0;
      case 'storage': return metric.system?.disk?.usage_percent || 0;
      default: return 0;
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private getCapacityThreshold(resourceType: string): number {
    switch (resourceType) {
      case 'cpu': return 80;
      case 'memory': return 85;
      case 'storage': return 90;
      default: return 80;
    }
  }

  private generateCapacityRecommendations(
    resourceType: string, 
    trend: number, 
    currentUsage: number, 
    threshold: number
  ): string[] {
    const recommendations = [];
    
    if (trend > 0 && currentUsage > threshold * 0.7) {
      recommendations.push(`Consider scaling ${resourceType} resources`);
      recommendations.push(`Monitor usage trends closely`);
      
      if (resourceType === 'cpu') {
        recommendations.push('Optimize CPU-intensive processes');
        recommendations.push('Consider horizontal scaling');
      } else if (resourceType === 'memory') {
        recommendations.push('Optimize memory usage patterns');
        recommendations.push('Implement memory pooling');
      } else if (resourceType === 'storage') {
        recommendations.push('Implement data archiving strategy');
        recommendations.push('Optimize storage usage');
      }
    }
    
    return recommendations;
  }

  /**
   * 구독자 관리
   */
  addSubscriber(id: string, websocket: any, filters: any): void {
    this.subscribers.set(id, { websocket, filters });
  }

  removeSubscriber(id: string): void {
    this.subscribers.delete(id);
  }
}
