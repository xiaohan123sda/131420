import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { errorHandler, notFoundHandler } from './middleware/error';
import { rateLimiter } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import transactionRoutes from './routes/transaction';
import syncRoutes from './routes/sync';
import salaryRoutes from './routes/salary';
import reportRoutes from './routes/report';

const app = express();

// 全局中间件
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 限流
app.use(rateLimiter);

// 健康检查
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/salary', salaryRoutes);
app.use('/api/v1/reports', reportRoutes);

// 错误处理
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 随手记 API 服务启动成功                           ║
║                                                       ║
║   环境: ${config.env.padEnd(42)}║
║   端口: ${String(PORT).padEnd(42)}║
║   数据库: ${config.dbHost.padEnd(39)}║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
