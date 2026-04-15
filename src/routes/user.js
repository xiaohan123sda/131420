const { Router } = require('express');
const { query } = require('../database');
const { auth } = require('../middleware/auth');

const router = Router();

// 获取用户信息
router.get('/profile', auth, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, phone, nickname, avatar_url, monthly_savings_goal, wechat_openid, alipay_openid, last_login_at, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    const user = users[0];
    if (!user) return res.status(404).json({ success: false, error: { message: '用户不存在' } });
    res.json({ success: true, data: user });
  } catch (err) {
    console.error('[User] Get profile error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 更新用户信息
router.put('/profile', auth, async (req, res) => {
  const { nickname, avatarUrl, monthlySavingsGoal } = req.body;

  const updates = [];
  const params = [];
  if (nickname !== undefined) { updates.push('nickname = ?'); params.push(nickname); }
  if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(avatarUrl); }
  if (monthlySavingsGoal !== undefined) { updates.push('monthly_savings_goal = ?'); params.push(monthlySavingsGoal); }

  if (updates.length === 0) return res.status(400).json({ success: false, error: { message: '没有需要更新的字段' } });

  try {
    params.push(req.userId);
    await query(`UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

    const users = await query('SELECT id, phone, nickname, avatar_url, monthly_savings_goal FROM users WHERE id = ?', [req.userId]);
    res.json({ success: true, data: users[0] });
  } catch (err) {
    console.error('[User] Update profile error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 删除账号
router.delete('/account', auth, async (req, res) => {
  try {
    await query('DELETE FROM users WHERE id = ?', [req.userId]);
    res.json({ success: true, message: '账号已注销' });
  } catch (err) {
    console.error('[User] Delete account error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

module.exports = router;