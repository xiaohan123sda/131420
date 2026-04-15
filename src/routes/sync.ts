import { Router } from 'express';
import { PrismaClient, Platform } from '@prisma/client';
import { z } from 'zod';
import { catchAsync, AppError } from '../middleware/error';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 绑定平台验证
const bindSchema = z.object({
  platform: z.enum(['wechat', 'alipay', 'huabei', 'pinduoduo', 'bank']),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
});

// 获取绑定状态
router.get('/bindings', auth, catchAsync(async (req: AuthRequest, res) => {
  const bindings = await prisma.platformBinding.findMany({
    where: { userId: req.userId, bindingStatus: 1 },
    select: {
      id: true,
      platform: true,
      lastSyncAt: true,
      createdAt: true,
    },
  });

  res.json({
    success: true,
    data: bindings,
  });
}));

// 绑定平台
router.post('/bind', auth, catchAsync(async (req: AuthRequest, res) => {
  const { platform, accessToken, refreshToken } = bindSchema.parse(req.body);

  // 检查是否已绑定
  const existing = await prisma.platformBinding.findUnique({
    where: {
      userId_platform: {
        userId: req.userId!,
        platform: platform.toUpperCase() as any,
      },
    },
  });

  if (existing && existing.bindingStatus === 1) {
    throw new AppError('该平台已绑定', 400);
  }

  // 创建或更新绑定
  const binding = await prisma.platformBinding.upsert({
    where: {
      userId_platform: {
        userId: req.userId!,
        platform: platform.toUpperCase() as any,
      },
    },
    update: {
      accessToken,
      refreshToken,
      bindingStatus: 1,
      lastSyncAt: new Date(),
    },
    create: {
      userId: req.userId!,
      platform: platform.toUpperCase() as any,
      accessToken,
      refreshToken,
      bindingStatus: 1,
      lastSyncAt: new Date(),
    },
  });

  res.json({
    success: true,
    data: {
      id: binding.id,
      platform: binding.platform.toLowerCase(),
      bindingStatus: binding.bindingStatus,
      lastSyncAt: binding.lastSyncAt,
    },
  });
}));

// 解绑平台
router.delete('/bind/:platform', auth, catchAsync(async (req: AuthRequest, res) => {
  const { platform } = req.params;

  const existing = await prisma.platformBinding.findUnique({
    where: {
      userId_platform: {
        userId: req.userId!,
        platform: platform.toUpperCase() as any,
      },
    },
  });

  if (!existing) {
    throw new AppError('该平台未绑定', 404);
  }

  await prisma.platformBinding.update({
    where: { id: existing.id },
    data: { bindingStatus: 0, accessToken: null, refreshToken: null },
  });

  res.json({
    success: true,
    message: '解绑成功',
  });
}));

// 获取同步状态
router.get('/status', auth, catchAsync(async (req: AuthRequest, res) => {
  const bindings = await prisma.platformBinding.findMany({
    where: { userId: req.userId, bindingStatus: 1 },
    select: {
      platform: true,
      lastSyncAt: true,
      tokenExpiresAt: true,
    },
  });

  // 计算各平台同步状态
  const status = bindings.map(b => ({
    platform: b.platform.toLowerCase(),
    lastSyncAt: b.lastSyncAt,
    isExpired: b.tokenExpiresAt ? b.tokenExpiresAt < new Date() : null,
    status: !b.lastSyncAt 
      ? 'never_synced' 
      : (Date.now() - new Date(b.lastSyncAt).getTime()) > 10 * 60 * 1000 
        ? 'stale' 
        : 'synced',
  }));

  res.json({
    success: true,
    data: status,
  });
}));

// 手动触发同步
router.post('/trigger', auth, catchAsync(async (req: AuthRequest, res) => {
  const { platform } = req.body as { platform?: string };

  // TODO: 这里应该触发实际的同步任务（通过消息队列）
  // 目前模拟返回
  
  const bindings = platform
    ? await prisma.platformBinding.findMany({
        where: { userId: req.userId, platform: platform.toUpperCase() as any, bindingStatus: 1 },
      })
    : await prisma.platformBinding.findMany({
        where: { userId: req.userId, bindingStatus: 1 },
      });

  if (bindings.length === 0) {
    throw new AppError('没有绑定的平台', 400);
  }

  // 更新最后同步时间（模拟）
  await Promise.all(
    bindings.map(b =>
      prisma.platformBinding.update({
        where: { id: b.id },
        data: { lastSyncAt: new Date() },
      })
    )
  );

  res.json({
    success: true,
    message: '同步任务已触发',
    data: {
      platforms: bindings.map(b => b.platform.toLowerCase()),
      triggeredAt: new Date().toISOString(),
    },
  });
}));

// 获取同步历史
router.get('/history', auth, catchAsync(async (req: AuthRequest, res) => {
  const { page = 1, pageSize = 20 } = req.query as any;

  // 模拟同步历史（实际应该存到单独的表）
  const history = [
    {
      id: 1,
      platform: 'wechat',
      status: 'success',
      syncedCount: 45,
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      completedAt: new Date(Date.now() - 29 * 60 * 1000),
    },
    {
      id: 2,
      platform: 'alipay',
      status: 'success',
      syncedCount: 23,
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 59 * 60 * 1000),
    },
  ];

  res.json({
    success: true,
    data: {
      list: history,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: history.length,
        totalPages: 1,
      },
    },
  });
}));

export default router;
