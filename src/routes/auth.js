const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query, insert } = require('../database');
const { config } = require('../config');

const router = Router();

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, error: { message: '手机号格式不正确' } });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  try {
    await query(
      'INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, ?)',
      [phone, code, expiresAt]
    );
  } catch (e) {
    // 表可能不存在，忽略
  }

  console.log(`[SMS] 验证码: ${phone} - ${code}`);

  res.json({
    success: true,
    message: '验证码已发送',
    ...(config.env === 'development' && { debug_code: code }),
  });
});

// 手机号登录
router.post('/login', async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ success: false, error: { message: '手机号格式不正确' } });
  }
  if (!code || code.length !== 6) {
    return res.status(400).json({ success: false, error: { message: '验证码为6位数字' } });
  }

  try {
    // 验证验证码
    const smsCodes = await query(
      "SELECT * FROM sms_codes WHERE phone = ? AND code = ? AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [phone, code]
    );
    const smsCode = smsCodes[0];

    if (!smsCode) {
      return res.status(400).json({ success: false, error: { message: '验证码错误或已过期' } });
    }

    // 标记已使用
    await query('UPDATE sms_codes SET used_at = NOW() WHERE id = ?', [smsCode.id]);

    // 查找或创建用户
    let users = await query('SELECT * FROM users WHERE phone = ?', [phone]);
    let user = users[0];
    
    if (!user) {
      const result = await insert(
        'INSERT INTO users (phone, nickname) VALUES (?, ?)',
        [phone, `用户${phone.slice(-4)}`]
      );
      users = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = users[0];
    }

    // 更新登录时间
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtSecret, { expiresIn: '30d' });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar_url: user.avatar_url },
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 密码登录
router.post('/login-password', async (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ success: false, error: { message: '手机号和密码不能为空' } });
  }

  try {
    const users = await query('SELECT * FROM users WHERE phone = ?', [phone]);
    const user = users[0];

    if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ success: false, error: { message: '账号或密码错误' } });
    }

    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtSecret, { expiresIn: '30d' });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: { id: user.id, phone: user.phone, nickname: user.nickname, avatar_url: user.avatar_url },
      },
    });
  } catch (err) {
    console.error('[Auth] Password login error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 微信登录
router.post('/wechat-login', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, error: { message: '缺少code参数' } });

  const openid = `wx_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  try {
    let users = await query('SELECT * FROM users WHERE wechat_openid = ?', [openid]);
    let user = users[0];
    
    if (!user) {
      const result = await insert('INSERT INTO users (wechat_openid, nickname) VALUES (?, ?)', [openid, '微信用户']);
      users = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = users[0];
    }

    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwtSecret, { expiresIn: '30d' });

    res.json({
      success: true,
      data: { token, refreshToken, user: { id: user.id, nickname: user.nickname } },
    });
  } catch (err) {
    console.error('[Auth] WeChat login error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 刷新Token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, error: { message: '缺少refreshToken' } });

  try {
    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    if (decoded.type !== 'refresh') return res.status(401).json({ success: false, error: { message: '无效的refreshToken' } });

    const token = jwt.sign({ userId: decoded.userId }, config.jwtSecret, { expiresIn: '7d' });
    const newRefresh = jwt.sign({ userId: decoded.userId, type: 'refresh' }, config.jwtSecret, { expiresIn: '30d' });

    res.json({ success: true, data: { token, refreshToken: newRefresh } });
  } catch (err) {
    res.status(401).json({ success: false, error: { message: 'refreshToken已过期' } });
  }
});

module.exports = router;