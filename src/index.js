const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config');
const { initDatabase, seedTestData } = require('./init-db');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/user');
const syncRoutes = require('./routes/sync');
const salaryRoutes = require('./routes/salary');

const app = express();

// 全局中间件
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 限流
const rateLimit = require('express-rate-limit');
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// 健康检查
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: '随手记 API' });
});

// API 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/salary', salaryRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: `接口 ${req.method} ${req.path} 不存在` } });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`, err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: { message: err.message || '服务器内部错误' },
  });
});

const PORT = config.port;

app.listen(PORT, () => {
  // 先初始化数据库，再显示启动信息
  initDatabase().then(() => {
    seedTestData();
    console.log('');
    console.log('==================================================');
    console.log('  随手记 API 服务启动成功                         ');
    console.log('==================================================');
    console.log(`  环境: ${config.env}`);
    console.log(`  端口: ${PORT}`);
    console.log(`  数据库: MySQL ${config.db.host}:${config.db.port}/${config.db.database}`);
    console.log('');
    console.log('  测试账号: 13800138000');
    console.log('  测试密码: 123456');
    console.log('==================================================');
    console.log('');
  }).catch(err => {
    console.error('[DB] 数据库初始化失败:', err);
  });
});

module.exports = app;