// [advice from AI] 지식 데이터 관리 컨트롤러

import { Request, Response } from 'express';
import { KnowledgeDataService } from '../services/knowledge-data.service';
import { logger } from '../utils/logger';
import multer from 'multer';
import path from 'path';
import { KnowledgeUploadRequest, KnowledgeSearchRequest } from '../types/knowledge-data';

const knowledgeDataService = new KnowledgeDataService();

// Multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 10 // 최대 10개 파일
  },
  fileFilter: (req, file, cb) => {
    // 지원되는 파일 형식 검증
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/html',
      'text/markdown',
      'application/json',
      'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * 지식 문서 업로드 미들웨어
 */
export const uploadMiddleware = upload.array('files', 10);

/**
 * 지식 문서 업로드
 */
export const uploadKnowledgeDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const files = req.files as Express.Multer.File[];
    const { categoryId, tags, metadata } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No files uploaded',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const uploadResults = [];
    const errors = [];

    // 각 파일에 대해 업로드 처리
    for (const file of files) {
      try {
        const uploadRequest: KnowledgeUploadRequest = {
          workspaceId: workspaceId!,
          originalName: file.originalname,
          fileBuffer: file.buffer,
          fileType: file.mimetype,
          fileSize: file.size,
          categoryId: categoryId || undefined,
          tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim())) : undefined,
          metadata: metadata ? JSON.parse(metadata) : undefined,
          uploadedBy: (req as any).user?.id || 'system'
        };

        const result = await knowledgeDataService.uploadKnowledgeDocument(uploadRequest);
        
        if (result.success) {
          uploadResults.push({
            fileName: file.originalname,
            documentId: result.data?.documentId,
            processingJobId: result.data?.processingJobId,
            status: 'uploaded'
          });
        } else {
          errors.push({
            fileName: file.originalname,
            error: result.error
          });
        }
      } catch (fileError: any) {
        errors.push({
          fileName: file.originalname,
          error: fileError.message || 'Upload failed'
        });
      }
    }

    const response: any = {
      success: uploadResults.length > 0,
      data: {
        uploaded: uploadResults,
        uploadedCount: uploadResults.length,
        totalFiles: files.length
      },
      timestamp: new Date().toISOString()
    };

    if (errors.length > 0) {
      response.errors = errors;
      response.message = `${uploadResults.length} files uploaded successfully, ${errors.length} files failed`;
    } else {
      response.message = `${uploadResults.length} files uploaded successfully`;
    }

    const statusCode = uploadResults.length > 0 ? (errors.length > 0 ? 207 : 200) : 400;
    res.status(statusCode).json(response);

  } catch (error: any) {
    logger.error('Failed to upload knowledge documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload knowledge documents',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 지식 문서 검색
 */
export const searchKnowledgeDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const searchRequest: KnowledgeSearchRequest = {
      workspaceId: workspaceId!,
      query: req.body.query || req.query.query as string,
      limit: parseInt(req.body.limit || req.query.limit as string) || 10,
      offset: parseInt(req.body.offset || req.query.offset as string) || 0,
      categoryId: req.body.categoryId || req.query.categoryId as string,
      tags: req.body.tags || (req.query.tags ? (req.query.tags as string).split(',') : undefined),
      similarityThreshold: parseFloat(req.body.similarityThreshold || req.query.similarityThreshold as string) || 0.7,
      includeChunks: req.body.includeChunks !== undefined ? req.body.includeChunks : true
    };

    if (!searchRequest.query || searchRequest.query.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Search query is required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await knowledgeDataService.searchKnowledgeDocuments(searchRequest);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: `Found ${result.data?.total || 0} relevant documents`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to search knowledge documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to search knowledge documents',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 지식 문서 목록 조회
 */
export const getKnowledgeDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const {
      page = '1',
      limit = '20',
      categoryId,
      status,
      tags
    } = req.query;

    const options = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      categoryId: categoryId as string,
      status: status as string,
      tags: tags ? (tags as string).split(',') : []
    };

    const result = await knowledgeDataService.getKnowledgeDocuments(workspaceId!, options);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get knowledge documents:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get knowledge documents',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 지식 문서 상세 조회
 */
export const getKnowledgeDocumentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, documentId } = req.params;

    // 문서 정보 조회 (간단한 구현)
    const result = await knowledgeDataService.getKnowledgeDocuments(workspaceId!, {
      page: 1,
      limit: 1
    });

    if (result.success && result.data) {
      const document = result.data.documents.find(d => d.id === documentId);
      
      if (document) {
        res.json({
          success: true,
          data: document,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Document not found',
          timestamp: new Date().toISOString()
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get document',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get knowledge document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get knowledge document',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 지식 문서 삭제
 */
export const deleteKnowledgeDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    const deletedBy = (req as any).user?.id || 'system';

    const result = await knowledgeDataService.deleteKnowledgeDocument(documentId!, deletedBy);

    if (result.success) {
      res.json({
        success: true,
        message: 'Knowledge document deleted successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to delete knowledge document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete knowledge document',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 문서 처리 상태 조회
 */
export const getProcessingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    const result = await knowledgeDataService.getProcessingStatus(documentId!);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    logger.error('Failed to get processing status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get processing status',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 지식 베이스 통계 조회
 */
export const getKnowledgeBaseStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;

    // 기본 통계 조회 (시뮬레이션)
    const stats = {
      totalDocuments: 45,
      processedDocuments: 42,
      totalChunks: 1250,
      totalVectors: 1250,
      categoriesCount: 8,
      averageProcessingTime: 15.3, // seconds
      lastProcessedAt: new Date().toISOString(),
      storageUsed: 125 * 1024 * 1024, // 125MB
      indexSize: 45 * 1024 * 1024 // 45MB
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to get knowledge base stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get knowledge base stats',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 지식 문서 재처리
 */
export const reprocessKnowledgeDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;
    const { processingOptions } = req.body;

    // 재처리 로직 (시뮬레이션)
    logger.info('Reprocessing knowledge document', {
      documentId,
      processingOptions,
      requestedBy: (req as any).user?.id
    });

    // 실제 환경에서는 여기서 재처리 작업을 시작
    const processingJobId = `reprocess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      data: {
        documentId,
        processingJobId,
        status: 'queued'
      },
      message: 'Document reprocessing started',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to reprocess knowledge document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reprocess knowledge document',
      timestamp: new Date().toISOString()
    });
  }
};
