import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';

function safeErrorCode(err: any) {
  return typeof err?.code === 'string' && /^[A-Z0-9_.-]{1,80}$/.test(err.code) ? err.code : undefined;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = (req as any).requestId;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Erro de validação dos dados de entrada.',
      errors: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
      requestId,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Registro duplicado. Conflito de dados.',
        fields: err.meta?.target,
        requestId,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Registro não encontrado no banco de dados.',
        requestId,
      });
    }
  }

  // Never return stack traces, raw error objects, request bodies, headers or credential values.
  console.error('[Unhandled Error]', {
    requestId,
    name: err?.name,
    code: safeErrorCode(err),
    message: err?.message,
  });

  return res.status(500).json({
    status: 'error',
    message: 'Erro interno no servidor.',
    requestId,
  });
};