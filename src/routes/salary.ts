import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { catchAsync, AppError } from '../middleware/error';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 添加工资记录验证
const createSchema = z.object({
  amount: z.number().positive('工资金额必须大于0'),
  arrivedAt: z.string().datetime(),
  source: z.string().max(50).optional(),
  notes: z.string().max(255).optional(),
});

// 更新工资记录验证
const updateSchema = z.object({
  amount: z.number().positive().optional(),
  arrivedAt: z.string().datetime().optional(),
  source: z.string().max(50).optional(),
  notes: z.string().max(255).optional(),
});

// 获取工资记录列表
router.get('/', auth, catchAsync(async (req: AuthRequest, res) => {
  const { page = 1, pageSize = 20, year, month } = req.query as any;

  const where: any = { userId: req.userId };

  // 如果指定年月，过滤
  if (year && month) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    where.arrivedAt = {
      gte: startDate,
      lte: endDate,
    };
  }

  const [records, total] = await Promise.all([
    prisma.salaryRecord.findMany({
      where,
      orderBy: { arrivedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(pageSize),
      take: parseInt(pageSize),
    }),
    prisma.salaryRecord.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      list: records,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize)),
      },
    },
  });
}));

// 获取本月工资信息
router.get('/current-month', auth, catchAsync(async (req: AuthRequest, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const records = await prisma.salaryRecord.findMany({
    where: {
      userId: req.userId,
      arrivedAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: { arrivedAt: 'desc' },
  });

  const totalSalary = records.reduce((sum, r) => sum + Number(r.amount), 0);

  res.json({
    success: true,
    data: {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      totalSalary,
      records,
      recordCount: records.length,
    },
  });
}));

// 获取单条工资记录
router.get('/:id', auth, catchAsync(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const record = await prisma.salaryRecord.findFirst({
    where: { id: parseInt(id), userId: req.userId },
  });

  if (!record) {
    throw new AppError('工资记录不存在', 404);
  }

  res.json({
    success: true,
    data: record,
  });
}));

// 添加工资记录
router.post('/', auth, catchAsync(async (req: AuthRequest, res) => {
  const data = createSchema.parse(req.body);

  const record = await prisma.salaryRecord.create({
    data: {
      userId: req.userId!,
      amount: data.amount,
      arrivedAt: new Date(data.arrivedAt),
      source: data.source,
      notes: data.notes,
    },
  });

  res.status(201).json({
    success: true,
    data: record,
  });
}));

// 更新工资记录
router.put('/:id', auth, catchAsync(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const updates = updateSchema.parse(req.body);

  const existing = await prisma.salaryRecord.findFirst({
    where: { id: parseInt(id), userId: req.userId },
  });

  if (!existing) {
    throw new AppError('工资记录不存在', 404);
  }

  const record = await prisma.salaryRecord.update({
    where: { id: parseInt(id) },
    data: {
      ...updates,
      arrivedAt: updates.arrivedAt ? new Date(updates.arrivedAt) : undefined,
    },
  });

  res.json({
    success: true,
    data: record,
  });
}));

// 删除工资记录
router.delete('/:id', auth, catchAsync(async (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = await prisma.salaryRecord.findFirst({
    where: { id: parseInt(id), userId: req.userId },
  });

  if (!existing) {
    throw new AppError('工资记录不存在', 404);
  }

  await prisma.salaryRecord.delete({ where: { id: parseInt(id) } });

  res.json({
    success: true,
    message: '删除成功',
  });
}));

export default router;
