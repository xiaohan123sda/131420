import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  // 环境
  env: process.env.NODE_ENV || 'development',
  
  // 服务
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  
  // 数据库
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT || '5432'),
  dbName: process.env.DB_NAME || 'auto_accountant',
  dbUser: process.env.DB_USER || 'postgres',
  dbPassword: process.env.DB_PASSWORD || 'postgres',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // 短信配置
  smsEnabled: process.env.SMS_ENABLED === 'true',
  smsCodeExpireMinutes: parseInt(process.env.SMS_CODE_EXPIRE_MINUTES || '5'),
  
  // 微信支付配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    merchantId: process.env.WECHAT_MERCHANT_ID || '',
    apiKey: process.env.WECHAT_API_KEY || '',
  },
  
  // 支付宝配置
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || '',
  },
  
  // 腾讯云配置
  tencentCloud: {
    secretId: process.env.TENCENT_CLOUD_SECRET_ID || '',
    secretKey: process.env.TENCENT_CLOUD_SECRET_KEY || '',
    region: process.env.TENCENT_CLOUD_REGION || 'ap-guangzhou',
  },
};

// 数据库连接URL
export const DATABASE_URL = `postgresql://${config.dbUser}:${config.dbPassword}@${config.dbHost}:${config.dbPort}/${config.dbName}?schema=public`;
