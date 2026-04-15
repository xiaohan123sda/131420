/**
 * Database initialization for MySQL
 * Note: Tables are already created manually via SQL scripts
 * This file only provides utility functions
 */

const { query } = require('./database');

async function initDatabase() {
  console.log('[DB] MySQL 数据库已就绪 ✅');
}

async function seedTestData() {
  // 检查是否已有测试用户
  const users = await query('SELECT COUNT(*) as cnt FROM users');
  if (users[0].cnt > 0) {
    console.log('[DB] 已有数据，跳过测试数据插入');
    return;
  }

  // 创建测试用户 (密码: 123456)
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('123456', 10);
  
  const result = await query(
    'INSERT INTO users (phone, nickname, password) VALUES (?, ?, ?)',
    ['13800138000', '测试用户', hashedPassword]
  );
  const userId = result.insertId;

  // 插入测试账单
  const now = new Date();
  const transactions = [
    [userId, 'wechat', 42.0, 'expense', '星巴克咖啡', new Date(now - 2*3600000).toISOString().slice(0,19).replace('T',' '), '微信支付', '餐饮', '饮品', 0.95],
    [userId, 'alipay', 35.5, 'expense', '美团外卖', new Date(now - 5*3600000).toISOString().slice(0,19).replace('T',' '), '支付宝', '餐饮', '外卖', 0.98],
    [userId, 'huabei', 199.0, 'expense', '淘宝-数码配件', new Date(now - 86400000).toISOString().slice(0,19).replace('T',' '), '花呗', '购物', '电子产品', 0.92],
    [userId, 'wechat', 6.0, 'expense', '地铁', new Date(now - 2*86400000).toISOString().slice(0,19).replace('T',' '), '微信支付', '交通', '公交地铁', 0.99],
    [userId, 'alipay', 120.0, 'expense', '超市买菜', new Date(now - 3*86400000).toISOString().slice(0,19).replace('T',' '), '支付宝', '居家缴费', '水电煤', 0.85],
  ];

  for (const t of transactions) {
    await query(
      `INSERT INTO transactions (user_id, platform, amount, type, merchant_name, trade_time, pay_method, category_big, category_small, category_confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t
    );
  }

  // 插入工资记录
  await query(
    'INSERT INTO salary_records (user_id, amount, arrived_at, source, notes) VALUES (?, ?, ?, ?, ?)',
    [userId, 15000.0, new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0,19).replace('T',' '), '银行转账', '本月工资']
  );

  console.log(`[DB] 已插入测试数据 ✅`);
}

module.exports = { initDatabase, seedTestData };