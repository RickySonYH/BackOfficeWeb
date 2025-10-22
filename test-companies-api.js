// [advice from AI] 회사 관리 API 테스트 서버
const express = require('express');
const app = express();
const PORT = 6000;

app.use(express.json());

// 임시 데이터
let companies = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'ABC 콜센터',
    businessNumber: '123-45-67890',
    contractDate: '2024-01-15',
    status: 'active',
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-01-15T00:00:00.000Z',
    tenantsCount: 2,
    activeTenantsCount: 1
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: '글로벌 고객센터',
    businessNumber: '234-56-78901',
    contractDate: '2024-02-01',
    status: 'active',
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
    tenantsCount: 1,
    activeTenantsCount: 1
  }
];

// 기본 루트
app.get('/', (req, res) => {
  res.json({
    message: 'AICC Operations Management Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      companies: '/api/companies'
    }
  });
});

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'AICC Operations Management Platform Backend',
    version: '1.0.0',
    port: PORT
  });
});

// GET /api/companies - 회사 목록 조회 (페이지네이션)
app.get('/api/companies', (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  let filteredCompanies = companies;
  
  // 상태 필터
  if (status) {
    filteredCompanies = filteredCompanies.filter(c => c.status === status);
  }
  
  // 검색 필터
  if (search) {
    filteredCompanies = filteredCompanies.filter(c => 
      c.name.includes(search) || c.businessNumber.includes(search)
    );
  }
  
  const total = filteredCompanies.length;
  const totalPages = Math.ceil(total / limitNum);
  const offset = (pageNum - 1) * limitNum;
  const paginatedData = filteredCompanies.slice(offset, offset + limitNum);
  
  res.json({
    success: true,
    data: {
      data: paginatedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1
    },
    timestamp: new Date().toISOString()
  });
});

// GET /api/companies/:id - 회사 상세 조회
app.get('/api/companies/:id', (req, res) => {
  const { id } = req.params;
  const company = companies.find(c => c.id === id);
  
  if (!company) {
    return res.status(404).json({
      success: false,
      error: 'Company not found',
      timestamp: new Date().toISOString()
    });
  }
  
  // 상세 정보 추가
  const detailCompany = {
    ...company,
    tenants: [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        tenantKey: 'abc-callcenter-20240115',
        kubernetesNamespace: 'aicc-abc-callcenter',
        deploymentStatus: 'active',
        createdAt: '2024-01-15T00:00:00.000Z'
      }
    ],
    recentActivity: [
      {
        type: 'company_created',
        description: 'Company registered',
        createdAt: company.createdAt
      }
    ]
  };
  
  res.json({
    success: true,
    data: detailCompany,
    timestamp: new Date().toISOString()
  });
});

// POST /api/companies - 회사 등록
app.post('/api/companies', (req, res) => {
  const { name, businessNumber, contractDate, status = 'active' } = req.body;
  
  // 간단한 유효성 검증
  const errors = [];
  if (!name) errors.push({ field: 'name', message: 'Company name is required' });
  if (!businessNumber) errors.push({ field: 'businessNumber', message: 'Business number is required' });
  if (!contractDate) errors.push({ field: 'contractDate', message: 'Contract date is required' });
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      validationErrors: errors,
      timestamp: new Date().toISOString()
    });
  }
  
  // 사업자번호 중복 체크
  if (companies.find(c => c.businessNumber === businessNumber)) {
    return res.status(409).json({
      success: false,
      error: 'Business number already exists',
      timestamp: new Date().toISOString()
    });
  }
  
  const newCompany = {
    id: `550e8400-e29b-41d4-a716-${Date.now()}`,
    name,
    businessNumber,
    contractDate,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenantsCount: 0,
    activeTenantsCount: 0
  };
  
  companies.push(newCompany);
  
  res.status(201).json({
    success: true,
    data: newCompany,
    message: 'Company created successfully',
    timestamp: new Date().toISOString()
  });
});

// PUT /api/companies/:id - 회사 수정
app.put('/api/companies/:id', (req, res) => {
  const { id } = req.params;
  const companyIndex = companies.findIndex(c => c.id === id);
  
  if (companyIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Company not found',
      timestamp: new Date().toISOString()
    });
  }
  
  const { name, businessNumber, contractDate, status } = req.body;
  const company = companies[companyIndex];
  
  // 업데이트
  if (name) company.name = name;
  if (businessNumber) company.businessNumber = businessNumber;
  if (contractDate) company.contractDate = contractDate;
  if (status) company.status = status;
  company.updatedAt = new Date().toISOString();
  
  res.json({
    success: true,
    data: company,
    message: 'Company updated successfully',
    timestamp: new Date().toISOString()
  });
});

// DELETE /api/companies/:id - 회사 삭제
app.delete('/api/companies/:id', (req, res) => {
  const { id } = req.params;
  const companyIndex = companies.findIndex(c => c.id === id);
  
  if (companyIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Company not found',
      timestamp: new Date().toISOString()
    });
  }
  
  companies.splice(companyIndex, 1);
  
  res.json({
    success: true,
    data: {
      deletedId: id,
      deletedAt: new Date().toISOString()
    },
    message: 'Company deleted successfully',
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test Companies API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🏢 Companies API: http://localhost:${PORT}/api/companies`);
  console.log(`📖 Available endpoints:`);
  console.log(`   GET    /api/companies`);
  console.log(`   GET    /api/companies/:id`);
  console.log(`   POST   /api/companies`);
  console.log(`   PUT    /api/companies/:id`);
  console.log(`   DELETE /api/companies/:id`);
});
