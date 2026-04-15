import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { catchAsync, AppError } from '../middleware/error';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// 验证码发送请求验证
const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});

// 登录请求验证
const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z.string().length(6, '验证码为6位数字'),
});

// 密码登录验证
const passwordLoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
});

// 注册请求验证
const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  password: z.string().min(6, '密码至少6位'),
  nickname: z.string().min(1).max(50).optional(),
  code: z.string().length(6, '验证码为6位数字'),
});

// 发送验证码
router.post('/send-code', catchAsync(async (req, res) => {
  const { phone } = sendCodeSchema.parse(req.body);
  
  // 生成6位验证码
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + config.smsCodeExpireMinutes * 60 * 1000);
  
  // 保存验证码
  await prisma.smsCode.create({
    data: { phone, code, expiresAt },
  });
  
  // TODO: 实际发送短信（这里模拟成功）
  console.log(`[SMS] 验证码已发送: ${phone} - ${code}`);
  
  res.json({
    success: true,
    message: '验证码已发送',
    // 开发环境返回验证码方便测试
    ...(config.env === 'development' && { debug_code: code }),
  });
}));

// 手机号登录
router.post('/login', catchAsync(async (req, res) => {
  const { phone, code } = loginSchema.parse(req.body);
  
  // 验证验证码
  const smsCode = await prisma.smsCode.findFirst({
    where: {
      phone,
      code,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!smsCode) {
    throw new AppError('验证码错误或已过期', 400);
  }
  
  // 标记验证码已使用
  await prisma.smsCode.update({
    where: { id: smsCode.id },
    data: { usedAt: new Date() },
  });
  
  // 查找或创建用户
  let user = await prisma.user.findUnique({ where: { phone } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        nickname: `用户${phone.slice(-4)}`,
      },
    });
  }
  
  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  
  // 生成Token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
  
  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    },
  });
}));

// 密码登录
router.post('/login-password', catchAsync(async (req, res) => {
  const { phone, password } = passwordLoginSchema.parse(req.body);
  
  const user = await prisma.user.findUnique({ where: { phone } });
  
  if (!user || !user.password) {
    throw new AppError('账号或密码错误', 401);
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    throw new AppError('账号或密码错误', 401);
  }
  
  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  
  // 生成Token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
  
  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    },
  });
}));

// 注册
router.post('/register', catchAsync(async (req, res) => {
  const { phone, password, nickname, code } = registerSchema.parse(req.body);
  
  // 验证验证码
  const smsCode = await prisma.smsCode.findFirst({
    where: {
      phone,
      code,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (!smsCode) {
    throw new AppError('验证码错误或已过期', 400);
  }
  
  // 标记验证码已使用
  await prisma.smsCode.update({
    where: { id: smsCode.id },
    data: { usedAt: new Date() },
  });
  
  // 检查是否已存在
  const existingUser = await prisma.user.findUnique({ where: { phone } });
  
  if (existingUser) {
    throw new AppError('该手机号已注册', 400);
  }
  
  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 12);
  
  // 创建用户
  const user = await prisma.user.create({
    data: {
      phone,
      password: hashedPassword,
      nickname: nickname || `用户${phone.slice(-4)}`,
    },
  });
  
  // 生成Token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
  
  res.status(201).json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    },
  });
}));

// 微信登录
router.post('/wechat-login', catchAsync(async (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    throw new AppError('缺少code参数', 400);
  }
  
  // TODO: 通过code获取微信openid（需要微信API调用）
  // const wechatResult = await getWechatSession(code);
  // const openid = wechatResult.openid;
  const openid = `wx_${uuidv4().replace(/-/g, '').slice(0, 16)}`; // 模拟
  
  // 查找或创建用户
  let user = await prisma.user.findUnique({ where: { wechatOpenid: openid } });
  
  if (!user) {
    user = await prisma.user.create({
      data: {
        wechatOpenid: openid,
        nickname: '微信用户',
      },
    });
  }
  
  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  
  // 生成Token
  const token = jwt.sign(
    { userId: user.id, phone: user.phone },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiresIn }
  );
  
  res.json({
    success: true,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        wechatBound: !!user.wechatOpenid,
      },
    },
  });
}));

// 刷新Token
router.post('/refresh', catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new AppError('缺少refreshToken', 400);
  }
  
  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret) as any;
    
    if (decoded.type !== 'refresh') {
      throw new AppError('无效的refreshToken', 401);
    }
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    
    if (!user) {
      throw new AppError('用户不存在', 401);
    }
    
    // 生成新Token
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    
    const newRefreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwtSecret,
      { expiresIn: config.jwtRefreshExpiresIn }
    );
    
    res.json({
      success: true,
      data: {
        token,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    throw new AppError('refreshToken已过期', 401);
  }
}));

// 登出
router.post('/logout', catchAsync(async (req, res) => {
  // JWT无状态，这里只需要返回成功
  // 实际可以在Redis中黑名单token
  res.json({
    success: true,
    message: '登出成功',
  });
}));

export default router;
