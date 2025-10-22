// [advice from AI] 회사 관리 컨트롤러
import { Request, Response } from 'express';
import { pool, withTransaction } from '../config/database';
import { logger } from '../config/logger';
import { CompanyLifecycleService } from '../services/company-lifecycle.service';
import { 
  Company, 
  CompanyStatus, 
  CreateCompanyRequest, 
  UpdateCompanyRequest, 
  GetCompaniesQuery,
  CompanyResponse,
  GetCompaniesResponse,
  GetCompanyDetailResponse,
  CreateCompanyResponse,
  UpdateCompanyResponse,
  DeleteCompanyResponse,
  ValidationError
} from '../types/companies';
import { 
  CreateCompanyWithSetupRequest,
  CompleteCompanyResponse
} from '../types/company-lifecycle';

// [advice from AI] 회사 목록 조회 (페이지네이션)
export const getCompanies = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query as GetCompaniesQuery;
    
    // [advice from AI] 기본값 설정
    const page = Math.max(1, parseInt(query.page?.toString() || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit?.toString() || '10')));
    const offset = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    // [advice from AI] WHERE 조건 구성
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.status) {
      conditions.push(`c.status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.search) {
      conditions.push(`(c.name ILIKE $${paramIndex++} OR c.business_number ILIKE $${paramIndex++})`);
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // [advice from AI] 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM companies c
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // [advice from AI] 데이터 조회 (테넌트 수 포함)
    const dataQuery = `
      SELECT 
        c.id,
        c.name,
        c.business_number,
        c.contract_date,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(t.id) as tenants_count,
        COUNT(CASE WHEN t.deployment_status = 'active' THEN 1 END) as active_tenants_count
      FROM companies c
      LEFT JOIN tenants t ON c.id = t.company_id
      ${whereClause}
      GROUP BY c.id, c.name, c.business_number, c.contract_date, c.status, c.created_at, c.updated_at
      ORDER BY c.${sortBy} ${sortOrder}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);

    // [advice from AI] 응답 데이터 변환
    const companies: CompanyResponse[] = dataResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      businessNumber: row.business_number,
      contractDate: row.contract_date.toISOString().split('T')[0], // YYYY-MM-DD 형식
      status: row.status as CompanyStatus,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      tenantsCount: parseInt(row.tenants_count),
      activeTenantsCount: parseInt(row.active_tenants_count)
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const response: GetCompaniesResponse = {
      data: companies,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev
    };

    logger.info('Companies retrieved successfully', {
      total,
      page,
      limit,
      query: query
    });

    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get companies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve companies',
      timestamp: new Date().toISOString()
    });
  }
};

// [advice from AI] 회사 상세 조회
export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // [advice from AI] 회사 기본 정보 조회
    const companyQuery = `
      SELECT 
        c.id,
        c.name,
        c.business_number,
        c.contract_date,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(t.id) as tenants_count,
        COUNT(CASE WHEN t.deployment_status = 'active' THEN 1 END) as active_tenants_count
      FROM companies c
      LEFT JOIN tenants t ON c.id = t.company_id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.business_number, c.contract_date, c.status, c.created_at, c.updated_at
    `;

    const companyResult = await pool.query(companyQuery, [id]);

    if (companyResult.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const company = companyResult.rows[0];

    // [advice from AI] 테넌트 목록 조회
    const tenantsQuery = `
      SELECT 
        id,
        tenant_key,
        kubernetes_namespace,
        deployment_status,
        created_at
      FROM tenants
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const tenantsResult = await pool.query(tenantsQuery, [id]);

    // [advice from AI] 최근 활동 조회 (임시 구현)
    const recentActivity = [
      {
        type: 'company_created',
        description: 'Company registered',
        createdAt: company.created_at.toISOString()
      }
    ];

    const response: GetCompanyDetailResponse = {
      id: company.id,
      name: company.name,
      businessNumber: company.business_number,
      contractDate: company.contract_date.toISOString().split('T')[0],
      status: company.status as CompanyStatus,
      createdAt: company.created_at.toISOString(),
      updatedAt: company.updated_at.toISOString(),
      tenantsCount: parseInt(company.tenants_count),
      activeTenantsCount: parseInt(company.active_tenants_count),
      tenants: tenantsResult.rows.map(tenant => ({
        id: tenant.id,
        tenantKey: tenant.tenant_key,
        kubernetesNamespace: tenant.kubernetes_namespace,
        deploymentStatus: tenant.deployment_status,
        createdAt: tenant.created_at.toISOString()
      })),
      recentActivity
    };

    logger.info('Company detail retrieved successfully', { companyId: id });

    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to get company detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve company detail',
      timestamp: new Date().toISOString()
    });
  }
};

// [advice from AI] 회사 등록
export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const companyData = req.body as CreateCompanyRequest;

    // [advice from AI] 유효성 검증
    const validationErrors = validateCompanyData(companyData);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] 사업자번호 중복 체크
    const duplicateCheck = await pool.query(
      'SELECT id FROM companies WHERE business_number = $1',
      [companyData.businessNumber]
    );

    if (duplicateCheck.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Business number already exists',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] 트랜잭션으로 회사 생성
    const result = await withTransaction(async (client) => {
      const insertQuery = `
        INSERT INTO companies (name, business_number, contract_date, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, business_number, contract_date, status, created_at, updated_at
      `;

      const insertResult = await client.query(insertQuery, [
        companyData.name,
        companyData.businessNumber,
        companyData.contractDate,
        companyData.status || CompanyStatus.ACTIVE
      ]);

      return insertResult.rows[0];
    });

    const response: CompanyResponse = {
      id: result.id,
      name: result.name,
      businessNumber: result.business_number,
      contractDate: result.contract_date.toISOString().split('T')[0],
      status: result.status as CompanyStatus,
      createdAt: result.created_at.toISOString(),
      updatedAt: result.updated_at.toISOString(),
      tenantsCount: 0,
      activeTenantsCount: 0
    };

    logger.info('Company created successfully', {
      companyId: result.id,
      companyName: result.name,
      businessNumber: result.business_number
    });

    res.status(201).json({
      success: true,
      data: response,
      message: 'Company created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to create company:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create company',
      timestamp: new Date().toISOString()
    });
  }
};

// [advice from AI] 완전한 회사 설정 생성 (새로운 원자적 프로세스)
export const createCompleteCompanySetup = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestData = req.body as CreateCompanyWithSetupRequest;

    // [advice from AI] 유효성 검증
    const validationErrors = validateCompanyWithSetupData(requestData);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] CompanyLifecycleService 인스턴스 생성
    const companyLifecycleService = new CompanyLifecycleService();

    // [advice from AI] 원자적 회사 생성 프로세스 실행
    const result = await companyLifecycleService.createCompleteCompany(requestData);

    logger.info('Complete company setup created successfully', {
      companyId: result.company.id,
      tenantId: result.tenant.id,
      adminUserId: result.adminUser.id
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Complete company setup created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Failed to create complete company setup:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create complete company setup',
      timestamp: new Date().toISOString()
    });
  }
};

// [advice from AI] 완전한 회사 설정 데이터 검증 함수
const validateCompanyWithSetupData = (data: CreateCompanyWithSetupRequest): ValidationError[] => {
  const errors: ValidationError[] = [];

  // 기본 회사 정보 검증
  const companyErrors = validateCompanyData({
    name: data.name,
    businessNumber: data.businessNumber,
    contractDate: data.contractDate,
    status: data.status
  });
  errors.push(...companyErrors);

  // 관리자 이메일 검증
  if (!data.adminEmail || data.adminEmail.trim().length === 0) {
    errors.push({
      field: 'adminEmail',
      message: 'Admin email is required'
    });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.adminEmail.trim())) {
    errors.push({
      field: 'adminEmail',
      message: 'Invalid email format'
    });
  }

  // 관리자 사용자명 검증
  if (!data.adminUsername || data.adminUsername.trim().length === 0) {
    errors.push({
      field: 'adminUsername',
      message: 'Admin username is required'
    });
  } else if (data.adminUsername.trim().length < 3 || data.adminUsername.trim().length > 50) {
    errors.push({
      field: 'adminUsername',
      message: 'Admin username must be between 3 and 50 characters'
    });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(data.adminUsername.trim())) {
    errors.push({
      field: 'adminUsername',
      message: 'Admin username can only contain letters, numbers, underscores, and hyphens'
    });
  }

  return errors;
};

// [advice from AI] 회사 수정
export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body as UpdateCompanyRequest;

    // [advice from AI] 회사 존재 확인
    const existsCheck = await pool.query('SELECT id FROM companies WHERE id = $1', [id]);
    if (existsCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] 유효성 검증
    const validationErrors = validateUpdateCompanyData(updateData);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        validationErrors,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] 사업자번호 중복 체크 (다른 회사와)
    if (updateData.businessNumber) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM companies WHERE business_number = $1 AND id != $2',
        [updateData.businessNumber, id]
      );

      if (duplicateCheck.rows.length > 0) {
        res.status(409).json({
          success: false,
          error: 'Business number already exists',
          timestamp: new Date().toISOString()
        });
        return;
      }
    }

    // [advice from AI] 업데이트 쿼리 동적 생성
    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updateData.name) {
      updateFields.push(`name = $${paramIndex++}`);
      params.push(updateData.name);
    }

    if (updateData.businessNumber) {
      updateFields.push(`business_number = $${paramIndex++}`);
      params.push(updateData.businessNumber);
    }

    if (updateData.contractDate) {
      updateFields.push(`contract_date = $${paramIndex++}`);
      params.push(updateData.contractDate);
    }

    if (updateData.status) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(updateData.status);
    }

    if (updateFields.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid fields to update',
        timestamp: new Date().toISOString()
      });
      return;
    }

    params.push(id); // WHERE 조건용

    const updateQuery = `
      UPDATE companies
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, name, business_number, contract_date, status, created_at, updated_at
    `;

    const result = await pool.query(updateQuery, params);
    const updatedCompany = result.rows[0];

    const response: CompanyResponse = {
      id: updatedCompany.id,
      name: updatedCompany.name,
      businessNumber: updatedCompany.business_number,
      contractDate: updatedCompany.contract_date.toISOString().split('T')[0],
      status: updatedCompany.status as CompanyStatus,
      createdAt: updatedCompany.created_at.toISOString(),
      updatedAt: updatedCompany.updated_at.toISOString()
    };

    logger.info('Company updated successfully', {
      companyId: id,
      updatedFields: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      data: response,
      message: 'Company updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to update company:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update company',
      timestamp: new Date().toISOString()
    });
  }
};

// [advice from AI] 회사 삭제
export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // [advice from AI] 회사 존재 확인
    const existsCheck = await pool.query('SELECT id, name FROM companies WHERE id = $1', [id]);
    if (existsCheck.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Company not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] 연관된 테넌트 확인
    const tenantsCheck = await pool.query('SELECT COUNT(*) as count FROM tenants WHERE company_id = $1', [id]);
    const tenantsCount = parseInt(tenantsCheck.rows[0].count);

    if (tenantsCount > 0) {
      res.status(409).json({
        success: false,
        error: `Cannot delete company with ${tenantsCount} associated tenant(s)`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // [advice from AI] 회사 삭제
    await pool.query('DELETE FROM companies WHERE id = $1', [id]);

    logger.info('Company deleted successfully', {
      companyId: id,
      companyName: existsCheck.rows[0].name
    });

    res.status(200).json({
      success: true,
      data: {
        deletedId: id,
        deletedAt: new Date().toISOString()
      },
      message: 'Company deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Failed to delete company:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete company',
      timestamp: new Date().toISOString()
    });
  }
};

// [advice from AI] 회사 데이터 유효성 검증 함수
function validateCompanyData(data: CreateCompanyRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // 회사명 검증
  if (!data.name || data.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Company name is required',
      value: data.name
    });
  } else if (data.name.length > 255) {
    errors.push({
      field: 'name',
      message: 'Company name must be less than 255 characters',
      value: data.name
    });
  }

  // 사업자번호 검증
  if (!data.businessNumber || data.businessNumber.trim().length === 0) {
    errors.push({
      field: 'businessNumber',
      message: 'Business number is required',
      value: data.businessNumber
    });
  } else if (!/^\d{3}-\d{2}-\d{5}$/.test(data.businessNumber)) {
    errors.push({
      field: 'businessNumber',
      message: 'Business number must be in format XXX-XX-XXXXX',
      value: data.businessNumber
    });
  }

  // 계약일 검증
  if (!data.contractDate) {
    errors.push({
      field: 'contractDate',
      message: 'Contract date is required',
      value: data.contractDate
    });
  } else {
    const date = new Date(data.contractDate);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'contractDate',
        message: 'Invalid date format',
        value: data.contractDate
      });
    }
  }

  // 상태 검증
  if (data.status && !Object.values(CompanyStatus).includes(data.status)) {
    errors.push({
      field: 'status',
      message: 'Invalid status value',
      value: data.status
    });
  }

  return errors;
}

// [advice from AI] 회사 수정 데이터 유효성 검증 함수
function validateUpdateCompanyData(data: UpdateCompanyRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  // 회사명 검증 (있을 경우)
  if (data.name !== undefined) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Company name cannot be empty',
        value: data.name
      });
    } else if (data.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Company name must be less than 255 characters',
        value: data.name
      });
    }
  }

  // 사업자번호 검증 (있을 경우)
  if (data.businessNumber !== undefined) {
    if (!data.businessNumber || data.businessNumber.trim().length === 0) {
      errors.push({
        field: 'businessNumber',
        message: 'Business number cannot be empty',
        value: data.businessNumber
      });
    } else if (!/^\d{3}-\d{2}-\d{5}$/.test(data.businessNumber)) {
      errors.push({
        field: 'businessNumber',
        message: 'Business number must be in format XXX-XX-XXXXX',
        value: data.businessNumber
      });
    }
  }

  // 계약일 검증 (있을 경우)
  if (data.contractDate !== undefined) {
    const date = new Date(data.contractDate);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'contractDate',
        message: 'Invalid date format',
        value: data.contractDate
      });
    }
  }

  // 상태 검증 (있을 경우)
  if (data.status !== undefined && !Object.values(CompanyStatus).includes(data.status)) {
    errors.push({
      field: 'status',
      message: 'Invalid status value',
      value: data.status
    });
  }

  return errors;
}
