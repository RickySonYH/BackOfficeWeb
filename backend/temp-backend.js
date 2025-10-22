const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3002;

// CORS 설정
app.use(cors({
  origin: ['http://localhost:6001', 'http://localhost:6002', 'http://frontend:6001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const JWT_SECRET = 'development_jwt_secret_key_32_chars_minimum';

// 테스트 데이터
const users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@aicc-ops.com',
    full_name: '시스템 관리자',
    passwordHash: bcrypt.hashSync('admin123!', 10),
    tenant_id: '1',
    role: 'admin'
  }
];

const companies = [
  {
    id: '1',
    name: 'AICC Solutions',
    businessNumber: '123-45-67890',
    contractDate: '2023-01-01',
    status: 'active',
    createdAt: '2023-01-01T00:00:00.000Z'
  },
  {
    id: '2',
    name: 'Global Tech',
    businessNumber: '987-65-43210',
    contractDate: '2023-03-15',
    status: 'active',
    createdAt: '2023-03-15T00:00:00.000Z'
  }
];

const tenants = [
  {
    id: '1',
    company_id: '1',
    tenant_key: 'aicc-solutions-20231001-abc1',
    kubernetes_namespace: 'aicc-aicc-solutions-20231001-abc1',
    deployment_status: 'active',
    created_at: '2023-10-01T00:00:00.000Z'
  },
  {
    id: '2',
    company_id: '2',
    tenant_key: 'global-tech-20231015-def2',
    kubernetes_namespace: 'aicc-global-tech-20231015-def2',
    deployment_status: 'active',
    created_at: '2023-10-15T00:00:00.000Z'
  }
];

const workspaces = [
  {
    id: '1',
    name: 'AICC KMS 워크스페이스',
    type: 'kms',
    status: 'active',
    tenant_id: '1',
    tenant_name: 'AICC Solutions',
    description: 'AICC Solutions의 지식 관리 시스템',
    created_at: '2023-10-01T00:00:00.000Z'
  }
];

// JWT 미들웨어
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Temporary AICC Ops Platform API on port 3002'
  });
});

// Auth APIs
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const payload = {
      userId: user.id,
      tenantId: user.tenant_id,
      username: user.username,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };

    const token = jwt.sign(payload, JWT_SECRET);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      expiresIn: 24 * 60 * 60,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tenantId: user.tenant_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed due to server error'
    });
  }
});

// Dashboard API
app.get('/api/dashboard', authenticate, (req, res) => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  res.json({
    success: true,
    data: {
      overall_statistics: {
        registered_companies: companies.length,
        active_tenants: tenants.filter(t => t.deployment_status === 'active').length,
        total_users: users.length,
        total_workspaces: workspaces.length
      },
      tenant_initialization_status: {
        completed: 2,
        in_progress: 0,
        failed: 0
      },
      recent_activities: {
        recent_companies: companies.slice(0, 5),
        recent_tenants: tenants.slice(0, 5),
        recent_logs: []
      },
      system_status: {
        management_db_status: 'connected',
        backend_service_status: 'running',
        kubernetes_cluster_status: 'connected',
        ecp_auth_server_status: 'connected'
      },
      last_updated: now.toISOString()
    }
  });
});

// Companies API
app.get('/api/companies', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      data: companies,
      total: companies.length,
      page: 1,
      limit: 50,
      totalPages: 1
    }
  });
});

// Tenants API
app.get('/api/tenants', authenticate, (req, res) => {
  const tenantsWithCompany = tenants.map(tenant => {
    const company = companies.find(c => c.id === tenant.company_id);
    return {
      ...tenant,
      company_name: company ? company.name : 'Unknown Company'
    };
  });

  res.json({
    success: true,
    data: {
      tenants: tenantsWithCompany,
      total: tenants.length,
      page: 1,
      limit: 50,
      totalPages: 1
    }
  });
});

// Workspaces API
app.get('/api/workspaces', authenticate, (req, res) => {
  const tenantId = req.query.tenant_id;
  let filteredWorkspaces = workspaces;
  if (tenantId) {
    filteredWorkspaces = workspaces.filter(w => w.tenant_id === tenantId);
  }

  res.json({
    success: true,
    data: {
      workspaces: filteredWorkspaces,
      total: filteredWorkspaces.length,
      page: 1,
      limit: 50,
      totalPages: 1
    }
  });
});

// Monitoring APIs
app.get('/api/monitoring/realtime', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      system: {
        cpu_usage: 45.2,
        memory_usage: 62.8,
        disk_usage: 38.5,
        network_in: 125.6,
        network_out: 89.3,
        timestamp: new Date().toISOString()
      },
      applications: {
        total_requests: 1250,
        active_sessions: 45,
        response_time_avg: 156,
        error_rate: 0.02,
        timestamp: new Date().toISOString()
      },
      tenants: {
        active_tenants: 3,
        total_workspaces: 8,
        data_processing_rate: 95.5,
        timestamp: new Date().toISOString()
      }
    }
  });
});

app.get('/api/monitoring/status', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      overall_status: 'healthy',
      services: {
        database: { status: 'healthy', response_time: 12 },
        api_server: { status: 'healthy', response_time: 8 },
        kubernetes: { status: 'healthy', response_time: 25 },
        monitoring: { status: 'healthy', response_time: 15 }
      },
      last_check: new Date().toISOString()
    }
  });
});

app.get('/api/monitoring/alerts', authenticate, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        type: 'performance',
        severity: 'medium',
        title: 'High CPU Usage',
        message: 'CPU usage is above 80% for the last 5 minutes',
        timestamp: new Date().toISOString(),
        status: 'active'
      }
    ]
  });
});

app.get('/api/monitoring/optimization/suggestions', authenticate, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        category: 'performance',
        priority: 'high',
        title: 'Database Query Optimization',
        description: 'Consider adding indexes to frequently queried columns',
        impact: 'Could improve response time by 30%',
        effort: 'medium'
      }
    ]
  });
});

// Users API
app.get('/api/users', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      users: users.map(user => {
        const { passwordHash, ...safeUser } = user;
        return safeUser;
      }),
      total: users.length,
      page: 1,
      limit: 50,
      totalPages: 1
    }
  });
});

// Data Initialization APIs
app.get('/api/data-init/logs', authenticate, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;
  
  const mockLogs = [
    {
      id: '1',
      tenant_id: '1',
      tenant_key: 'aicc-solutions-20231001-abc1',
      operation_type: 'database_init',
      status: 'completed',
      message: 'PostgreSQL 스키마 생성 완료',
      created_at: '2023-10-01T10:00:00.000Z',
      updated_at: '2023-10-01T10:05:00.000Z',
      duration_ms: 5000
    },
    {
      id: '2',
      tenant_id: '1',
      tenant_key: 'aicc-solutions-20231001-abc1',
      operation_type: 'data_seeding',
      status: 'completed',
      message: 'KMS 초기 데이터 업로드 완료 (50개 문서)',
      created_at: '2023-10-01T10:05:00.000Z',
      updated_at: '2023-10-01T10:10:00.000Z',
      duration_ms: 8000
    },
    {
      id: '3',
      tenant_id: '2',
      tenant_key: 'global-tech-20231015-def2',
      operation_type: 'config_apply',
      status: 'in_progress',
      message: 'Advisor 설정 적용 중...',
      created_at: '2023-10-15T14:00:00.000Z',
      updated_at: '2023-10-15T14:02:00.000Z',
      duration_ms: null
    }
  ];
  
  res.json({
    success: true,
    data: {
      logs: mockLogs,
      total: mockLogs.length,
      page,
      limit,
      totalPages: Math.ceil(mockLogs.length / limit)
    }
  });
});

app.get('/api/data-init/tenant/:tenantId/status', authenticate, (req, res) => {
  const { tenantId } = req.params;
  
  const mockStatus = {
    tenant_id: tenantId,
    tenant_key: tenantId === '1' ? 'aicc-solutions-20231001-abc1' : 'global-tech-20231015-def2',
    overall_progress: {
      completed: 2,
      total: 3,
      percentage: 67
    },
    database_status: {
      postgresql: {
        status: 'completed',
        schemas_created: ['call_history', 'call_scripts', 'knowledge_base'],
        created_at: '2023-10-01T10:00:00.000Z'
      },
      mongodb: {
        status: 'completed',
        collections_created: ['kms_documents', 'kms_categories', 'advisor_templates'],
        created_at: '2023-10-01T10:03:00.000Z'
      }
    },
    workspace_status: [
      {
        workspace_id: '1',
        workspace_name: 'KMS Workspace',
        workspace_type: 'kms',
        data_seeding_status: 'completed',
        config_status: 'completed',
        files_processed: 50,
        last_updated: '2023-10-01T10:10:00.000Z'
      },
      {
        workspace_id: '2',
        workspace_name: 'Advisor Workspace',
        workspace_type: 'advisor',
        data_seeding_status: 'in_progress',
        config_status: 'pending',
        files_processed: 15,
        last_updated: '2023-10-01T10:15:00.000Z'
      }
    ],
    last_updated: '2023-10-01T10:15:00.000Z'
  };
  
  res.json({
    success: true,
    data: mockStatus
  });
});

app.post('/api/data-init/tenant/:tenantId/database', authenticate, (req, res) => {
  const { tenantId } = req.params;
  const { database_types } = req.body;
  
  // Simulate initialization process
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Database initialization started',
      data: {
        tenant_id: tenantId,
        database_types: database_types || ['postgresql', 'mongodb'],
        status: 'in_progress',
        job_id: `init_${tenantId}_${Date.now()}`
      }
    });
  }, 1000);
});

app.post('/api/data-init/workspace/:workspaceId/seed', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  const { data_type, files } = req.body;
  
  // Simulate data seeding process
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Data seeding started',
      data: {
        workspace_id: workspaceId,
        data_type,
        files_count: files?.length || 0,
        status: 'in_progress',
        job_id: `seed_${workspaceId}_${Date.now()}`
      }
    });
  }, 1500);
});

app.post('/api/data-init/workspace/:workspaceId/config', authenticate, (req, res) => {
  const { workspaceId } = req.params;
  
  // Simulate config application process
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Configuration application started',
      data: {
        workspace_id: workspaceId,
        status: 'in_progress',
        job_id: `config_${workspaceId}_${Date.now()}`
      }
    });
  }, 800);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Temporary AICC Operations Platform API running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Test login: admin / admin123!`);
  console.log('');
  console.log('✅ Available APIs:');
  console.log('  - POST /api/auth/login');
  console.log('  - GET /api/dashboard');
  console.log('  - GET /api/companies');
  console.log('  - GET /api/tenants');
  console.log('  - GET /api/workspaces');
  console.log('  - GET /api/users');
  console.log('  - GET /api/monitoring/realtime');
  console.log('  - GET /api/monitoring/status');
  console.log('  - GET /api/monitoring/alerts');
  console.log('  - GET /api/monitoring/optimization/suggestions');
  console.log('  - GET /api/data-init/logs');
  console.log('  - GET /api/data-init/tenant/:tenantId/status');
  console.log('  - POST /api/data-init/tenant/:tenantId/database');
  console.log('  - POST /api/data-init/workspace/:workspaceId/seed');
  console.log('  - POST /api/data-init/workspace/:workspaceId/config');
});
