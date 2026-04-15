import { Router } from 'express';
import { PrismaClient, Platform, TransactionType } from '@prisma/client';
import { z } from 'zod';
import { catchAsync, AppError } from '../middleware/error';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 查询参数验证
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  platform: z.enum(['wechat', 'alipay', 'huabei', 'pinduoduo', 'bank', 'other']).optional(),
  type: z.enum(['income', 'expense']).optional(),
  categoryBig: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  keyword: z.string().optional(),
});

// 更新账单验证
const updateSchema = z.object({
  categoryBig: z.string().optional(),
  categorySmall: z.string().optional(),
  isNecessary: z.number().min(-1).max(1).optional(),
  notes: z.string().max(500).optional(),
});

// 获取账单列表
router.get('/', auth, catchAsync(async (req: AuthRequest, res) => {
  const { page, pageSize, platform, type, categoryBig, startDate, endDate, keyword } = querySchema.parse(req.query);
  
  const where: any = { userId: req.userId };
  
  if (platform) where.platform = platform;
  if (type) where.type = type;
  if (categoryBig) where.categoryBig = categoryBig;
  if (startDate) where.tradeTime = { ...where.tradeTime, gte: new Date(startDate) };
  if (endDate) where.tradeTime = { ...where.tradeTime, lte: new Date(endDate + 'T23:59:59.999Z') };
  if (keyword) where.merchantName = { contains: keyword, mode: 'insensitive' };
  
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { tradeTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ]);
  
  res.json({
    success: true,
    data: {
      list: transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    },
  });
}));

// 获取收支汇总
router.get('/summary', auth, catchAsync(async (req: AuthRequest, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  
  const where: any = { userId: req.userId };
  if (startDate) where.tradeTime = { gte: new Date(startDate) };
  if (endDate) where.tradeTime = { ...where.tradeTime, lte: new Date(endDate + 'T23:59:59.999Z') };
  
  // 获取收支汇总
  const summary = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true },
    _count: true,
  });
  
  // 获取分类汇总
  const categorySummary = await prisma.transaction.groupBy({
    by: ['categoryBig'],
    where: { ...where, type: 'EXPENSE' },
    _sum: { amount: true },
    _count: true,
    orderBy: { _sum: { amount: 'desc' } },
  });
  
  // 计算工资收入
  const salaryRecords = await prisma.salaryRecord.findMany({
    where: { userId: req.userId },
    orderBy: { arrivedAt: 'desc' },
  });
  
  const totalIncome = summary.find(s => s.type === 'INCOME')?._sum?.amount || 0;
  const totalExpense = summary.find(s => s.type === 'EXPENSE')?._sum?.amount || 0;
  
  res.json({
    success: true,
    data: {
      totalIncome,
      totalExpense,
      balance: Number(totalIncome) - Number(totalExpense),
      transactionCount: summary.reduce((acc, s) => acc + s._count, 0),
      categoryBreakdown: categorySummary.map(c => ({
        category: c.categoryBig || '其他',
        amount: c._sum?.amount || 0,
        count: c._count,
      })),
      latestSalary: salaryRecords[0] || null,
      monthlySalary: salaryRecords.filter(s => {
        const now = new Date();
        const salaryDate = new Date(s.arrivedAt);
        return salaryDate.getMonth() === now.getMonth() && salaryDate.getFullYear() === now.getFullYear();
      }),
    },
  });
}));

// 获取单条账单详情
router.get('/:id', auth, catchAsync(async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const transaction = await prisma.transaction.findFirst({
    where: { id: parseInt(id), userId: req.userId },
  });
  
  if (!transaction) {
    throw new AppError('账单不存在', 404);
  }
  
  res.json({
    success: true,
    data: transaction,
  });
}));

// 更新账单（分类、备注、必要性标记）
router.put('/:id', auth, catchAsync(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = updateSchema.parse(req.body);
  
  // 检查账单是否存在且属于当前用户
  const existing = await prisma.transaction.findFirst({
    where: { id: parseInt(id), userId: req.userId },
  });
  
  if (!existing) {
    throw new AppError('账单不存在', 404);
  }
  
  const updated = await prisma.transaction.update({
    where: { id: parseInt(id) },
    data: {
      ...updates,
      // 如果用户手动修改了分类，记录为覆盖
      userCategoryOverride: updates.categoryBig || existing.userCategoryOverride,
    },
  });
  
  res.json({
    success: true,
    data: updated,
  });
}));

// 删除账单
router.delete('/:id', auth, catchAsync(async (req: AuthRequest, res) => {
  const { id } = req.params;
  
  const existing = await prisma.transaction.findFirst({
    where: { id: parseInt(id), userId: req.userId },
  });
  
  if (!existing) {
    throw new AppError('账单不存在', 404);
  }
  
  await prisma.transaction.delete({ where: { id: parseInt(id) } });
  
  res.json({
    success: true,
    message: '删除成功',
  });
}));

// 导出账单
router.get('/export/excel', auth, catchAsync(async (req: AuthRequest, res) => {
  const { startDate, endDate, platform, type } = req.query as any;
  
  const where: any = { userId: req.userId };
  if (startDate) where.tradeTime = { gte: new Date(startDate) };
  if (endDate) where.tradeTime = { ...where.tradeTime, lte: new Date(endDate + 'T23:59:59.999Z') };
  if (platform) where.platform = platform;
  if (type) where.type = type;
  
  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { tradeTime: 'desc' },
  });
  
  // 生成CSV格式
  const headers = ['交易时间', '平台', '商户', '金额', '类型', '分类', '备注'];
  const rows = transactions.map(t => [
    new Date(t.tradeTime).toLocaleString('zh-CN'),
    t.platform,
    t.merchantName || '',
    t.amount.toString(),
    t.type === 'INCOME' ? '收入' : '支出',
    t.userCategoryOverride || t.categoryBig || '未分类',
    t.notes || '',
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');
  
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);
  res.send(csvContent);
}));

export default router;
