import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: number;
}

// JWT验证中间件
export const auth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从header获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: '未登录，请先登录' },
      });
    }

    const token = authHeader.split(' ')[1];

    // 验证token
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, phone: true, wechatOpenid: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: '用户不存在' },
      });
    }

    // 将userId挂载到req上
    req.userId = user.id;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: { message: '登录已过期，请重新登录' },
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        error: { message: '无效的登录凭证' },
      });
    }
    return res.status(500).json({
      success: false,
      error: { message: '认证失败' },
    });
  }
};

// 可选认证（不强制要求登录）
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      req.userId = decoded.userId;
    }
  } catch (error) {
    // 忽略错误，继续执行
  }
  next();
};
