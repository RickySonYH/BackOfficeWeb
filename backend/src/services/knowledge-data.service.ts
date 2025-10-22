// [advice from AI] 지식 데이터 관리 서비스 - 파일 업로드, 처리, 벡터화, 인덱싱

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { 
  KnowledgeDocument,
  KnowledgeCategory,
  DocumentProcessingJob,
  DocumentChunk,
  KnowledgeUploadRequest,
  KnowledgeSearchRequest,
  DocumentProcessingResult,
  VectorIndexRequest,
  KnowledgeExportRequest,
  KnowledgeImportRequest
} from '../types/knowledge-data';

export class KnowledgeDataService {
  private readonly uploadPath = process.env.KNOWLEDGE_UPLOAD_PATH || './uploads/knowledge';
  private readonly chunkSize = 1000;
  private readonly chunkOverlap = 200;

  constructor() {
    // 업로드 디렉토리 생성
    this.ensureUploadDirectory();
  }

  /**
   * 업로드 디렉토리 확인 및 생성
   */
  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
      logger.info('Knowledge upload directory created', { path: this.uploadPath });
    }
  }

  /**
   * 지식 문서 업로드
   */
  async uploadKnowledgeDocument(request: KnowledgeUploadRequest): Promise<{
    success: boolean;
    data?: { documentId: string; processingJobId: string };
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 파일 저장
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${request.originalName}`;
      const filePath = path.join(this.uploadPath, fileName);
      
      await fs.promises.writeFile(filePath, request.fileBuffer);

      // 문서 메타데이터 저장
      const documentResult = await client.query(`
        INSERT INTO knowledge_documents 
        (workspace_id, title, file_name, file_path, file_type, file_size, category_id,
         tags, metadata, status, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', $10)
        RETURNING id
      `, [
        request.workspaceId,
        request.title || request.originalName,
        request.originalName,
        filePath,
        request.fileType,
        request.fileSize,
        request.categoryId,
        request.tags || [],
        JSON.stringify(request.metadata || {}),
        request.uploadedBy
      ]);

      const documentId = documentResult.rows[0].id;

      // 문서 처리 작업 생성
      const processingJobResult = await client.query(`
        INSERT INTO document_processing_jobs
        (document_id, workspace_id, job_type, status, processing_config, created_by)
        VALUES ($1, $2, 'full_processing', 'pending', $3, $4)
        RETURNING id
      `, [
        documentId,
        request.workspaceId,
        JSON.stringify({
          extractText: true,
          createChunks: true,
          generateVectors: true,
          updateIndex: true,
          chunkSize: this.chunkSize,
          chunkOverlap: this.chunkOverlap
        }),
        request.uploadedBy
      ]);

      const processingJobId = processingJobResult.rows[0].id;

      await client.query('COMMIT');

      // 비동기 문서 처리 시작
      setImmediate(() => {
        this.processDocument(documentId, processingJobId).catch(error => {
          logger.error('Document processing failed:', error);
        });
      });

      logger.info('Knowledge document uploaded successfully', {
        documentId,
        processingJobId,
        fileName: request.originalName,
        workspaceId: request.workspaceId
      });

      return {
        success: true,
        data: { documentId, processingJobId }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to upload knowledge document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 문서 처리 (텍스트 추출, 청킹, 벡터화)
   */
  private async processDocument(documentId: string, processingJobId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 처리 상태 업데이트
      await client.query(`
        UPDATE document_processing_jobs 
        SET status = 'processing', started_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [processingJobId]);

      // 문서 정보 조회
      const documentResult = await client.query(`
        SELECT id, workspace_id, file_path, file_type, title
        FROM knowledge_documents 
        WHERE id = $1
      `, [documentId]);

      if (documentResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = documentResult.rows[0];

      // 1. 텍스트 추출
      const extractedText = await this.extractTextFromFile(document.file_path, document.file_type);
      
      await client.query(`
        UPDATE knowledge_documents 
        SET extracted_text = $1, status = 'text_extracted'
        WHERE id = $2
      `, [extractedText, documentId]);

      // 2. 텍스트 청킹
      const chunks = this.createTextChunks(extractedText, this.chunkSize, this.chunkOverlap);
      
      // 청크 저장
      for (let i = 0; i < chunks.length; i++) {
        await client.query(`
          INSERT INTO document_chunks
          (document_id, workspace_id, chunk_index, content, chunk_size, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          documentId,
          document.workspace_id,
          i,
          chunks[i],
          chunks[i].length,
          JSON.stringify({
            totalChunks: chunks.length,
            chunkOverlap: this.chunkOverlap
          })
        ]);
      }

      // 3. 벡터 생성 (시뮬레이션)
      const vectors = await this.generateVectors(chunks);
      
      // 벡터 저장
      for (let i = 0; i < vectors.length; i++) {
        await client.query(`
          UPDATE document_chunks 
          SET embedding_vector = $1, vector_generated_at = CURRENT_TIMESTAMP
          WHERE document_id = $2 AND chunk_index = $3
        `, [JSON.stringify(vectors[i]), documentId, i]);
      }

      // 4. 검색 인덱스 업데이트 (시뮬레이션)
      await this.updateSearchIndex(document.workspace_id, documentId, chunks, vectors);

      // 문서 상태 업데이트
      await client.query(`
        UPDATE knowledge_documents 
        SET status = 'processed', processed_at = CURRENT_TIMESTAMP, chunk_count = $1
        WHERE id = $2
      `, [chunks.length, documentId]);

      // 처리 작업 완료
      await client.query(`
        UPDATE document_processing_jobs 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
            processing_result = $1
        WHERE id = $2
      `, [
        JSON.stringify({
          chunksCreated: chunks.length,
          vectorsGenerated: vectors.length,
          indexUpdated: true,
          processingTime: Date.now()
        }),
        processingJobId
      ]);

      await client.query('COMMIT');

      logger.info('Document processing completed successfully', {
        documentId,
        processingJobId,
        chunksCreated: chunks.length
      });

    } catch (error) {
      await client.query('ROLLBACK');
      
      // 처리 실패 상태 업데이트
      try {
        await pool.query(`
          UPDATE document_processing_jobs 
          SET status = 'failed', failed_at = CURRENT_TIMESTAMP, error_message = $1
          WHERE id = $2
        `, [error instanceof Error ? error.message : 'Unknown error', processingJobId]);

        await pool.query(`
          UPDATE knowledge_documents 
          SET status = 'processing_failed'
          WHERE id = $1
        `, [documentId]);
      } catch (updateError) {
        logger.error('Failed to update processing failure status:', updateError);
      }

      logger.error('Document processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 파일에서 텍스트 추출 (시뮬레이션)
   */
  private async extractTextFromFile(filePath: string, fileType: string): Promise<string> {
    // 실제 환경에서는 파일 타입에 따른 텍스트 추출 라이브러리 사용
    // PDF: pdf-parse, DOCX: mammoth, TXT: fs.readFile 등
    
    logger.info('Extracting text from file', { filePath, fileType });
    
    switch (fileType.toLowerCase()) {
      case 'txt':
      case 'text/plain':
        return await fs.promises.readFile(filePath, 'utf-8');
      
      case 'pdf':
      case 'application/pdf':
        // PDF 텍스트 추출 시뮬레이션
        return this.simulatePdfTextExtraction(filePath);
      
      case 'docx':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // DOCX 텍스트 추출 시뮬레이션
        return this.simulateDocxTextExtraction(filePath);
      
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * PDF 텍스트 추출 시뮬레이션
   */
  private simulatePdfTextExtraction(filePath: string): string {
    const fileName = path.basename(filePath);
    return `이것은 ${fileName} PDF 파일에서 추출된 시뮬레이션 텍스트입니다. 
실제 환경에서는 pdf-parse 라이브러리를 사용하여 PDF 내용을 추출합니다.
이 문서는 지식 관리 시스템의 테스트를 위한 샘플 콘텐츠를 포함합니다.
다양한 주제와 정보가 포함되어 있으며, 검색과 질의응답에 활용됩니다.`;
  }

  /**
   * DOCX 텍스트 추출 시뮬레이션
   */
  private simulateDocxTextExtraction(filePath: string): string {
    const fileName = path.basename(filePath);
    return `이것은 ${fileName} DOCX 파일에서 추출된 시뮬레이션 텍스트입니다.
실제 환경에서는 mammoth 라이브러리를 사용하여 Word 문서 내용을 추출합니다.
문서에는 제품 매뉴얼, 가이드라인, 정책 문서 등의 내용이 포함될 수 있습니다.
구조화된 정보와 비정형 텍스트가 혼재되어 있으며, 이를 효과적으로 검색할 수 있도록 처리됩니다.`;
  }

  /**
   * 텍스트 청킹
   */
  private createTextChunks(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentSize = 0;
    
    for (const sentence of sentences) {
      const sentenceWithPeriod = sentence.trim() + '.';
      
      if (currentSize + sentenceWithPeriod.length <= chunkSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPeriod;
        currentSize += sentenceWithPeriod.length;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        
        // 오버랩 처리
        if (overlap > 0 && chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const overlapText = lastChunk.slice(-overlap);
          currentChunk = overlapText + ' ' + sentenceWithPeriod;
          currentSize = currentChunk.length;
        } else {
          currentChunk = sentenceWithPeriod;
          currentSize = sentenceWithPeriod.length;
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * 벡터 생성 (시뮬레이션)
   */
  private async generateVectors(chunks: string[]): Promise<number[][]> {
    // 실제 환경에서는 OpenAI Embedding API나 다른 임베딩 모델 사용
    logger.info('Generating vectors for chunks', { chunkCount: chunks.length });
    
    const vectors: number[][] = [];
    const vectorDimension = 1536; // OpenAI ada-002 dimension
    
    for (const chunk of chunks) {
      // 시뮬레이션: 텍스트 기반 의사 벡터 생성
      const vector = this.generateSimulatedVector(chunk, vectorDimension);
      vectors.push(vector);
      
      // API 호출 시뮬레이션 지연
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return vectors;
  }

  /**
   * 시뮬레이션 벡터 생성
   */
  private generateSimulatedVector(text: string, dimension: number): number[] {
    const vector: number[] = [];
    const seed = this.hashString(text);
    
    for (let i = 0; i < dimension; i++) {
      // 텍스트 기반 의사 랜덤 벡터 생성
      const value = Math.sin(seed + i) * Math.cos(seed * i) * 0.5;
      vector.push(parseFloat(value.toFixed(6)));
    }
    
    // 벡터 정규화
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  /**
   * 문자열 해시 생성 (시드용)
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer로 변환
    }
    return Math.abs(hash);
  }

  /**
   * 검색 인덱스 업데이트 (시뮬레이션)
   */
  private async updateSearchIndex(
    workspaceId: string, 
    documentId: string, 
    chunks: string[], 
    vectors: number[][]
  ): Promise<void> {
    // 실제 환경에서는 Elasticsearch, Pinecone, Weaviate 등의 벡터 DB 업데이트
    logger.info('Updating search index', {
      workspaceId,
      documentId,
      chunkCount: chunks.length
    });
    
    // 인덱스 업데이트 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * 지식 문서 검색
   */
  async searchKnowledgeDocuments(request: KnowledgeSearchRequest): Promise<{
    success: boolean;
    data?: {
      documents: Array<{
        document: KnowledgeDocument;
        chunks: Array<{
          chunk: DocumentChunk;
          similarity: number;
        }>;
        relevanceScore: number;
      }>;
      total: number;
      searchTime: number;
    };
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // 검색 쿼리 벡터 생성 (시뮬레이션)
      const queryVector = this.generateSimulatedVector(request.query, 1536);

      // 유사도 기반 문서 검색
      const searchResults = await pool.query(`
        SELECT 
          d.id, d.workspace_id, d.title, d.file_name, d.file_type, d.category_id,
          d.tags, d.metadata, d.status, d.uploaded_by, d.created_at,
          c.id as chunk_id, c.chunk_index, c.content, c.embedding_vector,
          -- 시뮬레이션 유사도 계산 (실제로는 벡터 유사도 계산)
          RANDOM() * 0.3 + 0.7 as similarity
        FROM knowledge_documents d
        JOIN document_chunks c ON d.id = c.document_id
        WHERE d.workspace_id = $1 
          AND d.status = 'processed'
          AND c.embedding_vector IS NOT NULL
          ${request.categoryId ? 'AND d.category_id = $2' : ''}
          ${request.tags && request.tags.length > 0 ? 'AND d.tags && $3' : ''}
        ORDER BY similarity DESC
        LIMIT $${request.categoryId ? '4' : '3'} OFFSET $${request.categoryId ? '5' : '4'}
      `, [
        request.workspaceId,
        ...(request.categoryId ? [request.categoryId] : []),
        ...(request.tags && request.tags.length > 0 ? [request.tags] : []),
        request.limit || 10,
        request.offset || 0
      ]);

      // 결과 그룹화 및 점수 계산
      const documentMap = new Map();
      
      for (const row of searchResults.rows) {
        if (!documentMap.has(row.id)) {
          documentMap.set(row.id, {
            document: {
              id: row.id,
              workspace_id: row.workspace_id,
              title: row.title,
              file_name: row.file_name,
              file_type: row.file_type,
              category_id: row.category_id,
              tags: row.tags,
              metadata: row.metadata,
              status: row.status,
              uploaded_by: row.uploaded_by,
              created_at: row.created_at
            },
            chunks: [],
            relevanceScore: 0
          });
        }
        
        const docData = documentMap.get(row.id);
        docData.chunks.push({
          chunk: {
            id: row.chunk_id,
            chunk_index: row.chunk_index,
            content: row.content,
            embedding_vector: row.embedding_vector
          },
          similarity: row.similarity
        });
        
        // 관련성 점수 계산 (최고 유사도 청크들의 평균)
        docData.relevanceScore = Math.max(docData.relevanceScore, row.similarity);
      }

      const documents = Array.from(documentMap.values())
        .sort((a, b) => b.relevanceScore - a.relevanceScore);

      const searchTime = Date.now() - startTime;

      logger.info('Knowledge search completed', {
        workspaceId: request.workspaceId,
        query: request.query,
        resultCount: documents.length,
        searchTime
      });

      return {
        success: true,
        data: {
          documents,
          total: documents.length,
          searchTime
        }
      };

    } catch (error) {
      logger.error('Failed to search knowledge documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 지식 문서 목록 조회
   */
  async getKnowledgeDocuments(
    workspaceId: string,
    options: {
      page?: number;
      limit?: number;
      categoryId?: string;
      status?: string;
      tags?: string[];
    } = {}
  ): Promise<{
    success: boolean;
    data?: {
      documents: KnowledgeDocument[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    error?: string;
  }> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE workspace_id = $1';
      const params: any[] = [workspaceId];
      let paramIndex = 2;

      if (options.categoryId) {
        whereClause += ` AND category_id = $${paramIndex++}`;
        params.push(options.categoryId);
      }

      if (options.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(options.status);
      }

      if (options.tags && options.tags.length > 0) {
        whereClause += ` AND tags && $${paramIndex++}`;
        params.push(options.tags);
      }

      // 총 개수 조회
      const countResult = await pool.query(`
        SELECT COUNT(*) as total
        FROM knowledge_documents
        ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // 문서 목록 조회
      const documentsResult = await pool.query(`
        SELECT 
          id, workspace_id, title, file_name, file_type, file_size, category_id,
          tags, metadata, status, chunk_count, uploaded_by, created_at, updated_at, processed_at
        FROM knowledge_documents
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      return {
        success: true,
        data: {
          documents: documentsResult.rows,
          total,
          page,
          limit,
          totalPages
        }
      };

    } catch (error) {
      logger.error('Failed to get knowledge documents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 지식 문서 삭제
   */
  async deleteKnowledgeDocument(documentId: string, deletedBy: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 문서 정보 조회
      const documentResult = await client.query(
        'SELECT id, file_path FROM knowledge_documents WHERE id = $1',
        [documentId]
      );

      if (documentResult.rows.length === 0) {
        throw new Error('Document not found');
      }

      const document = documentResult.rows[0];

      // 파일 삭제
      if (fs.existsSync(document.file_path)) {
        await fs.promises.unlink(document.file_path);
      }

      // 관련 데이터 삭제 (CASCADE로 자동 삭제되지만 명시적으로 처리)
      await client.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
      await client.query('DELETE FROM document_processing_jobs WHERE document_id = $1', [documentId]);
      await client.query('DELETE FROM knowledge_documents WHERE id = $1', [documentId]);

      await client.query('COMMIT');

      logger.info('Knowledge document deleted successfully', {
        documentId,
        deletedBy
      });

      return { success: true };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete knowledge document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      client.release();
    }
  }

  /**
   * 문서 처리 상태 조회
   */
  async getProcessingStatus(documentId: string): Promise<{
    success: boolean;
    data?: DocumentProcessingJob;
    error?: string;
  }> {
    try {
      const result = await pool.query(`
        SELECT 
          id, document_id, workspace_id, job_type, status, processing_config,
          processing_result, error_message, created_by, created_at, started_at,
          completed_at, failed_at
        FROM document_processing_jobs
        WHERE document_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [documentId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Processing job not found'
        };
      }

      return {
        success: true,
        data: result.rows[0]
      };

    } catch (error) {
      logger.error('Failed to get processing status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
