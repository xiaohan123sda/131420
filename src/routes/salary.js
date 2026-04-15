const { Router } = require('express');
const { query, insert } = require('../database');
const { auth } = require('../middleware/auth');

const router = Router();

// 获取工资记录
router.get('/', auth, async (req, res) => {
  try {
    const records = await query('SELECT * FROM salary_records WHERE user_id = ? ORDER BY arrived_at DESC', [req.userId]);
    res.json({ success: true, data: records });
  } catch (err) {
    console.error('[Salary] List error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 本月工资
router.get('/current-month', auth, async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  try {
    const records = await query(
      'SELECT * FROM salary_records WHERE user_id = ? AND arrived_at >= ? AND arrived_at <= ?',
      [req.userId, monthStart, monthEnd]
    );
    const totalSalary = records.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    res.json({
      success: true,
      data: {
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        totalSalary,
        records,
      },
    });
  } catch (err) {
    console.error('[Salary] Current month error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 添加工资记录
router.post('/', auth, async (req, res) => {
  const { amount, arrivedAt, source, notes } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: { message: '工资金额必须大于0' } });
  if (!arrivedAt) return res.status(400).json({ success: false, error: { message: '请选择到账时间' } });

  try {
    const result = await insert(
      'INSERT INTO salary_records (user_id, amount, arrived_at, source, notes) VALUES (?, ?, ?, ?, ?)',
      [req.userId, amount, arrivedAt, source || null, notes || null]
    );

    const records = await query('SELECT * FROM salary_records WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: records[0] });
  } catch (err) {
    console.error('[Salary] Add error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 删除工资记录
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM salary_records WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!existing[0]) return res.status(404).json({ success: false, error: { message: '工资记录不存在' } });

    await query('DELETE FROM salary_records WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '删除成功' });
  } catch (err) {
    console.error('[Salary] Delete error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

module.exports = router;