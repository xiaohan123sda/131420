import { Request, Response, NextFunction } from 'express';

// 自定义错误类
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 异步处理包装器
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局错误处理中间件
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 开发环境输出完整错误
  const isDev = process.env.NODE_ENV === 'development';

  // 默认值
  let statusCode = 500;
  let message = '服务器内部错误';

  // 如果是自定义错误
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Zod验证错误
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = '参数验证失败';
  }

  // Prisma错误
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      statusCode = 409;
      message = '数据已存在，请勿重复创建';
    }
    if (prismaErr.code === 'P2025') {
      statusCode = 404;
      message = '数据不存在';
    }
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的Token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token已过期';
  }

  console.error(`[Error] ${statusCode} - ${message}`, {
    path: req.path,
    method: req.method,
    stack: isDev ? err.stack : undefined,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(isDev && { stack: err.stack }),
    },
  });
};

// 404处理
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `接口 ${req.method} ${req.path} 不存在`,
    },
  });
};
