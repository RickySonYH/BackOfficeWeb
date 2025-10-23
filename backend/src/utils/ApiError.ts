// backend/src/utils/ApiError.ts

export class ApiError extends Error {
  public statusCode: number;
  public code?: string | undefined;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || undefined;
    this.name = 'ApiError';
  }
}

export default ApiError;
