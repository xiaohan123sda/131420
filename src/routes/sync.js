const { Router } = require('express');
const { query, insert } = require('../database');
const { auth } = require('../middleware/auth');

const router = Router();

// 获取绑定状态
router.get('/bindings', auth, async (req, res) => {
  try {
    const bindings = await query(
      'SELECT id, platform, last_sync_at, created_at FROM platform_bindings WHERE user_id = ? AND binding_status = 1',
      [req.userId]
    );
    res.json({ success: true, data: bindings });
  } catch (err) {
    console.error('[Sync] Get bindings error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 绑定平台
router.post('/bind', auth, async (req, res) => {
  const { platform, accessToken, refreshToken } = req.body;
  if (!platform) return res.status(400).json({ success: false, error: { message: '请指定平台' } });

  try {
    const existing = await query('SELECT * FROM platform_bindings WHERE user_id = ? AND platform = ?', [req.userId, platform]);

    if (existing[0] && existing[0].binding_status === 1) {
      return res.status(400).json({ success: false, error: { message: '该平台已绑定' } });
    }

    if (existing[0]) {
      await query(
        'UPDATE platform_bindings SET access_token = ?, refresh_token = ?, binding_status = 1, last_sync_at = NOW() WHERE id = ?',
        [accessToken || null, refreshToken || null, existing[0].id]
      );
    } else {
      await insert(
        'INSERT INTO platform_bindings (user_id, platform, access_token, refresh_token, last_sync_at) VALUES (?, ?, ?, ?, NOW())',
        [req.userId, platform, accessToken || null, refreshToken || null]
      );
    }

    res.json({ success: true, message: '绑定成功' });
  } catch (err) {
    console.error('[Sync] Bind error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 解绑平台
router.delete('/bind/:platform', auth, async (req, res) => {
  try {
    const existing = await query('SELECT * FROM platform_bindings WHERE user_id = ? AND platform = ?', [req.userId, req.params.platform]);
    if (!existing[0]) return res.status(404).json({ success: false, error: { message: '该平台未绑定' } });

    await query('UPDATE platform_bindings SET binding_status = 0, access_token = NULL, refresh_token = NULL WHERE id = ?', [existing[0].id]);
    res.json({ success: true, message: '解绑成功' });
  } catch (err) {
    console.error('[Sync] Unbind error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 获取同步状态
router.get('/status', auth, async (req, res) => {
  try {
    const bindings = await query('SELECT platform, last_sync_at FROM platform_bindings WHERE user_id = ? AND binding_status = 1', [req.userId]);

    const status = bindings.map(b => ({
      platform: b.platform,
      lastSyncAt: b.last_sync_at,
      status: !b.last_sync_at ? 'never_synced' : 'synced',
    }));

    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[Sync] Get status error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

// 手动触发同步
router.post('/trigger', auth, async (req, res) => {
  try {
    await query("UPDATE platform_bindings SET last_sync_at = NOW() WHERE user_id = ? AND binding_status = 1", [req.userId]);
    res.json({ success: true, message: '同步任务已触发' });
  } catch (err) {
    console.error('[Sync] Trigger error:', err);
    res.status(500).json({ success: false, error: { message: '服务器错误' } });
  }
});

module.exports = router;