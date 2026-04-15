import rateLimit from 'express-rate-limit';

// API 限流
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100次请求
  message: {
    success: false,
    error: { message: '请求过于频繁，请稍后再试' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 登录限流（更严格）
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 登录最多10次
  message: {
    success: false,
    error: { message: '登录尝试次数过多，请15分钟后再试' },
  },
});

// 验证码限流
export const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 3, // 每分钟最多3次
  message: {
    success: false,
    error: { message: '验证码发送过于频繁，请稍后再试' },
  },
});
