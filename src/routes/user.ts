import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { catchAsync, AppError } from '../middleware/error';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 更新用户信息验证
const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  monthlySavingsGoal: z.number().positive().optional().nullable(),
});

// 修改密码验证
const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

// 获取用户信息
router.get('/profile', auth, catchAsync(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      phone: true,
      nickname: true,
      avatarUrl: true,
      monthlySavingsGoal: true,
      wechatOpenid: true,
      alipayOpenid: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  res.json({
    success: true,
    data: user,
  });
}));

// 更新用户信息
router.put('/profile', auth, catchAsync(async (req: AuthRequest, res) => {
  const updates = updateProfileSchema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: updates,
    select: {
      id: true,
      phone: true,
      nickname: true,
      avatarUrl: true,
      monthlySavingsGoal: true,
    },
  });

  res.json({
    success: true,
    data: user,
  });
}));

// 修改密码
router.put('/password', auth, catchAsync(async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { password: true },
  });

  if (!user) {
    throw new AppError('用户不存在', 404);
  }

  // 验证旧密码
  if (user.password) {
    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) {
      throw new AppError('原密码错误', 400);
    }
  }

  // 加密新密码
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.userId },
    data: { password: hashedPassword },
  });

  res.json({
    success: true,
    message: '密码修改成功',
  });
}));

// 获取用户设置
router.get('/settings', auth, catchAsync(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      monthlySavingsGoal: true,
    },
  });

  res.json({
    success: true,
    data: {
      monthlySavingsGoal: user?.monthlySavingsGoal || null,
    },
  });
}));

// 更新用户设置
router.put('/settings', auth, catchAsync(async (req: AuthRequest, res) => {
  const { monthlySavingsGoal } = req.body;

  await prisma.user.update({
    where: { id: req.userId },
    data: { monthlySavingsGoal },
  });

  res.json({
    success: true,
    message: '设置已更新',
  });
}));

// 删除账号
router.delete('/account', auth, catchAsync(async (req: AuthRequest, res) => {
  // TODO: 确认删除（可以通过验证码二次确认）
  
  // 删除用户所有数据（Cascade会删除关联数据）
  await prisma.user.delete({
    where: { id: req.userId },
  });

  res.json({
    success: true,
    message: '账号已注销',
  });
}));

export default router;
