import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { catchAsync } from '../middleware/error';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 获取月度报告
router.get('/monthly', auth, catchAsync(async (req: AuthRequest, res) => {
  const { year, month } = req.query as { year?: string; month?: string };

  const now = new Date();
  const targetYear = year ? parseInt(year) : now.getFullYear();
  const targetMonth = month ? parseInt(month) : now.getMonth() + 1;

  const startDate = new Date(targetYear, targetMonth - 1, 1);
  const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

  // 获取该月工资
  const salaryRecords = await prisma.salaryRecord.findMany({
    where: {
      userId: req.userId,
      arrivedAt: { gte: startDate, lte: endDate },
    },
  });
  const totalSalary = salaryRecords.reduce((sum, r) => sum + Number(r.amount), 0);

  // 获取该月所有交易
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: req.userId,
      tradeTime: { gte: startDate, lte: endDate },
    },
    orderBy: { tradeTime: 'desc' },
  });

  // 计算收支
  const incomeTransactions = transactions.filter(t => t.type === 'INCOME');
  const expenseTransactions = transactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  // 按分类汇总支出
  const categoryBreakdown: Record<string, number> = {};
  expenseTransactions.forEach(t => {
    const category = t.userCategoryOverride || t.categoryBig || '其他';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Number(t.amount);
  });

  // 非必要消费
  const unnecessaryExpenses = expenseTransactions
    .filter(t => t.isNecessary === 0)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // 生成优化建议
  const suggestions = generateSuggestions(categoryBreakdown, totalExpense, transactions);

  // 查询或创建月度报告
  const monthStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
  let report = await prisma.monthlyReport.findUnique({
    where: {
      userId_reportMonth: {
        userId: req.userId!,
        reportMonth: monthStr,
      },
    },
  });

  if (!report) {
    report = await prisma.monthlyReport.create({
      data: {
        userId: req.userId!,
        reportMonth: monthStr,
        totalExpense,
        totalIncome,
        categoryBreakdown,
        unnecessaryExpense: unnecessaryExpenses,
        suggestions,
      },
    });
  }

  res.json({
    success: true,
    data: {
      ...report,
      categoryBreakdown: JSON.parse(JSON.stringify(report.categoryBreakdown)),
      totalSalary,
      salaryRecords,
      transactionCount: transactions.length,
      expenseCount: expenseTransactions.length,
    },
  });
}));

// 获取收支趋势
router.get('/trends', auth, catchAsync(async (req: AuthRequest, res) => {
  const { months = 6 } = req.query as { months?: string };

  const trendMonths = parseInt(months) || 6;
  const now = new Date();
  const trends = [];

  for (let i = 0; i < trendMonths; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    // 获取工资
    const salaryRecords = await prisma.salaryRecord.findMany({
      where: {
        userId: req.userId,
        arrivedAt: { gte: startDate, lte: endDate },
      },
    });
    const totalSalary = salaryRecords.reduce((sum, r) => sum + Number(r.amount), 0);

    // 获取支出
    const expenseResult = await prisma.transaction.aggregate({
      where: {
        userId: req.userId,
        type: 'EXPENSE',
        tradeTime: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    // 按分类
    const expenses = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        type: 'EXPENSE',
        tradeTime: { gte: startDate, lte: endDate },
      },
    });

    const categoryBreakdown: Record<string, number> = {};
    expenses.forEach(t => {
      const category = t.userCategoryOverride || t.categoryBig || '其他';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + Number(t.amount);
    });

    trends.push({
      month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
      totalSalary,
      totalExpense: Number(expenseResult._sum?.amount) || 0,
      transactionCount: expenseResult._count || 0,
      categoryBreakdown,
    });
  }

  res.json({
    success: true,
    data: trends.reverse(),
  });
}));

// 生成消费优化建议
function generateSuggestions(
  categoryBreakdown: Record<string, number>,
  totalExpense: number,
  transactions: any[]
): string {
  const suggestions: string[] = [];

  const total = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0) || 1;

  // 餐饮占比过高
  if (categoryBreakdown['餐饮']) {
    const foodRatio = categoryBreakdown['餐饮'] / total;
    if (foodRatio > 0.4) {
      suggestions.push(`餐饮支出占比${(foodRatio * 100).toFixed(0)}%，建议减少外卖次数，自己做饭更省钱健康`);
    }
  }

  // 购物占比过高
  if (categoryBreakdown['购物']) {
    const shopRatio = categoryBreakdown['购物'] / total;
    if (shopRatio > 0.3) {
      suggestions.push(`购物支出占比较高，建议先加入购物车冷静一下，避免冲动消费`);
    }
  }

  // 非必要消费
  const unnecessaryCount = transactions.filter(t => t.isNecessary === 0).length;
  if (unnecessaryCount > 10) {
    suggestions.push(`本月有${unnecessaryCount}笔标记为非必要的消费，可以尝试记账复盘避免类似支出`);
  }

  // 结余提醒
  const salary = Object.values(categoryBreakdown).length; // 简化，实际应该用工资
  const savingsRate = 1 - (totalExpense / (salary || totalExpense));
  if (savingsRate < 0.2 && savingsRate > 0) {
    suggestions.push(`本月结余率仅${(savingsRate * 100).toFixed(0)}%，建议设置月度存钱目标`);
  }

  if (suggestions.length === 0) {
    suggestions.push('本月消费结构健康，继续保持！');
  }

  return suggestions.join('；') + '。';
}

export default router;
