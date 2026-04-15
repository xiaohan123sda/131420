const { Router } = require('express');
const { query } = require('../database');
const { auth } = require('../middleware/auth');

const router = Router();

// 获取账单列表
router.get('/', auth, async (req, res) => {
  const { page = 1, pageSize = 20, platform, type, categoryBig, startDate, endDate, keyword } = req.query;

  let where = 'WHERE user_id = ?';
  const params = [req.userId];

  if (platform) { where += ' AND platform = ?'; params.push(platform); }
  if (type) { where += ' AND type = ?'; params.push(type); }
  if (categoryBig) { where += ' AND (category_big = ? OR user_category_override = ?)'; params.push(categoryBig, categoryBig); }
  if (startDate) { where += ' AND trade_time >= ?'; params.push(startDate); }
  if (endDate) { where += ' AND trade_time <= ?'; params.push(endDate + ' 23:59:59'); }
  if (keyword) { where += ' AND merchant_name LIKE ?'; params.push(`%${keyword}%`); }

  try {
    const countResult = await query(`SELECT COUNT(*) as cnt FROM transactions ${where}`, params);
    const total = countResult[0].cnt;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const list = await query(
      `SELECT * FROM transactions ${where} ORDER BY trade_time DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    res.json({
      success: true,
      data: {
        list,
        pagination: { page: parseInt(page), pageSize: parseInt(pageSize), total, totalPages: Math.ceil(total / parseInt(pageSize)) },
      },
    });
  } catch (err) {
    console.error('[Transactions] List error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 获取收支汇总
router.get('/summary', auth, async (req, res) => {
  const { startDate, endDate } = req.query;

  let dateFilter = '';
  const params = [req.userId];
  if (startDate) { dateFilter += ' AND trade_time >= ?'; params.push(startDate); }
  if (endDate) { dateFilter += ' AND trade_time <= ?'; params.push(endDate + ' 23:59:59'); }

  try {
    const incomeResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income'${dateFilter}`,
      params
    );
    const income = parseFloat(incomeResult[0].total) || 0;

    const expenseResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense'${dateFilter}`,
      params
    );
    const expense = parseFloat(expenseResult[0].total) || 0;

    // 分类汇总
    const catParams = [req.userId];
    let catDateFilter = '';
    if (startDate) { catDateFilter += ' AND trade_time >= ?'; catParams.push(startDate); }
    if (endDate) { catDateFilter += ' AND trade_time <= ?'; catParams.push(endDate + ' 23:59:59'); }
    
    const categories = await query(
      `SELECT COALESCE(user_category_override, category_big) as category, SUM(amount) as amount, COUNT(*) as count FROM transactions WHERE user_id = ? AND type = 'expense'${catDateFilter} GROUP BY category ORDER BY amount DESC`,
      catParams
    );

    // 最近工资
    const salaries = await query('SELECT * FROM salary_records WHERE user_id = ? ORDER BY arrived_at DESC LIMIT 1', [req.userId]);
    const latestSalary = salaries[0] || null;

    res.json({
      success: true,
      data: {
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense,
        categoryBreakdown: categories,
        latestSalary,
      },
    });
  } catch (err) {
    console.error('[Transactions] Summary error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 获取单条账单
router.get('/:id', auth, async (req, res) => {
  try {
    const transactions = await query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    const t = transactions[0];
    if (!t) return res.status(404).json({ success: false, error: { message: '账单不存在' } });
    res.json({ success: true, data: t });
  } catch (err) {
    console.error('[Transactions] Get error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 更新账单
router.put('/:id', auth, async (req, res) => {
  const { categoryBig, categorySmall, isNecessary, notes } = req.body;

  try {
    const existing = await query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing[0]) return res.status(404).json({ success: false, error: { message: '账单不存在' } });

    const updates = [];
    const params = [];
    if (categoryBig !== undefined) { 
      updates.push('category_big = ?'); 
      params.push(categoryBig); 
      updates.push('user_category_override = ?'); 
      params.push(categoryBig); 
    }
    if (categorySmall !== undefined) { updates.push('category_small = ?'); params.push(categorySmall); }
    if (isNecessary !== undefined) { updates.push('is_necessary = ?'); params.push(isNecessary); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }

    if (updates.length === 0) return res.status(400).json({ success: false, error: { message: '没有需要更新的字段' } });

    params.push(req.params.id);
    await query(`UPDATE transactions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    const updated = await query('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('[Transactions] Update error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 删除账单
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM transactions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing[0]) return res.status(404).json({ success: false, error: { message: '账单不存在' } });

    await query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('[Transactions] Delete error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 导出账单 (CSV)
router.get('/export/csv', auth, async (req, res) => {
  try {
    const transactions = await query('SELECT * FROM transactions WHERE user_id = ? ORDER BY trade_time DESC', [req.userId]);

    const BOM = '\uFEFF';
    const headers = ['交易时间', '平台', '商户', '金额', '类型', '分类', '备注'];
    const rows = transactions.map(t => [
      t.trade_time, t.platform, t.merchant_name || '', t.amount,
      t.type === 'income' ? '收入' : '支出',
      t.user_category_override || t.category_big || '未分类',
      t.notes || '',
    ]);

    const csv = BOM + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('[Transactions] Export error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

module.exports = router;