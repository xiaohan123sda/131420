-- ============================================
-- 随手记 - 数据库初始化脚本
-- 适用于 PostgreSQL 16
-- 运行方式: psql -U postgres -f init-db.sql
-- ============================================

-- 创建数据库
CREATE DATABASE auto_accountant 
  WITH ENCODING = 'UTF8'
  LC_COLLATE = 'zh_CN.UTF-8'
  LC_CTYPE = 'zh_CN.UTF-8'
  TEMPLATE = template0;

-- 连接数据库
\c auto_accountant;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  nickname VARCHAR(50),
  avatar_url VARCHAR(500),
  wechat_openid VARCHAR(100) UNIQUE,
  alipay_openid VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  monthly_savings_goal DECIMAL(12, 2),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 账单明细表（核心表）
-- ============================================
CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  external_id VARCHAR(200),
  trade_no VARCHAR(100),
  amount DECIMAL(12, 2) NOT NULL,
  type VARCHAR(10) NOT NULL,
  merchant_name VARCHAR(255),
  trade_time TIMESTAMP WITH TIME ZONE NOT NULL,
  pay_method VARCHAR(50),
  category_big VARCHAR(50),
  category_small VARCHAR(100),
  category_confidence DECIMAL(5, 4),
  user_category_override VARCHAR(100),
  is_necessary SMALLINT DEFAULT -1,
  notes VARCHAR(500),
  is_anomaly SMALLINT DEFAULT 0,
  anomaly_reason VARCHAR(255),
  sync_status VARCHAR(20) DEFAULT 'success',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, external_id)
);

-- ============================================
-- 工资记录表
-- ============================================
CREATE TABLE salary_records (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  arrived_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source VARCHAR(50),
  notes VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 平台绑定表
-- ============================================
CREATE TABLE platform_bindings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  binding_status SMALLINT DEFAULT 1,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, platform)
);

-- ============================================
-- 分类规则表
-- ============================================
CREATE TABLE category_rules (
  id BIGSERIAL PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL,
  category_big VARCHAR(50) NOT NULL,
  category_small VARCHAR(100),
  weight INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 月度报告表
-- ============================================
CREATE TABLE monthly_reports (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_month VARCHAR(7) NOT NULL,
  total_expense DECIMAL(12, 2),
  total_income DECIMAL(12, 2),
  category_breakdown JSONB,
  unnecessary_expense DECIMAL(12, 2),
  suggestions TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, report_month)
);

-- ============================================
-- 短信验证码表
-- ============================================
CREATE TABLE sms_codes (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX idx_transactions_user_time ON transactions(user_id, trade_time DESC);
CREATE INDEX idx_transactions_platform ON transactions(platform);
CREATE INDEX idx_transactions_category ON transactions(category_big);
CREATE INDEX idx_salary_records_user ON salary_records(user_id);
CREATE INDEX idx_salary_records_arrived ON salary_records(arrived_at DESC);
CREATE INDEX idx_platform_bindings_user ON platform_bindings(user_id);
CREATE INDEX idx_monthly_reports_user ON monthly_reports(user_id);
CREATE INDEX idx_sms_codes_phone_expires ON sms_codes(phone, expires_at DESC);
CREATE INDEX idx_category_rules_keyword ON category_rules(keyword);

-- ============================================
-- 更新触发器（自动更新 updated_at）
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_salary_records_updated_at BEFORE UPDATE ON salary_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_platform_bindings_updated_at BEFORE UPDATE ON platform_bindings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 初始化分类规则数据
-- ============================================
INSERT INTO category_rules (keyword, category_big, category_small, weight) VALUES
-- 餐饮
('外卖', '餐饮', '外卖', 10),
('美团外卖', '餐饮', '外卖', 10),
('饿了么', '餐饮', '外卖', 10),
('餐厅', '餐饮', '堂食', 8),
('饭店', '餐饮', '堂食', 8),
('快餐', '餐饮', '堂食', 8),
('小吃', '餐饮', '堂食', 6),
('星巴克', '餐饮', '饮品', 10),
('瑞幸', '餐饮', '饮品', 10),
('奶茶', '餐饮', '饮品', 8),
('咖啡', '餐饮', '饮品', 8),
('麦当劳', '餐饮', '堂食', 10),
('肯德基', '餐饮', '堂食', 10),
('火锅', '餐饮', '堂食', 8),
('烧烤', '餐饮', '堂食', 8),

-- 购物
('淘宝', '购物', '网购', 10),
('天猫', '购物', '网购', 10),
('京东', '购物', '网购', 10),
('拼多多', '购物', '网购', 10),
('唯品会', '购物', '网购', 8),
('服装', '购物', '服装', 8),
('手机', '购物', '电子产品', 10),
('电脑', '购物', '电子产品', 10),
('化妆品', '购物', '化妆品', 8),
('护肤品', '购物', '化妆品', 8),

-- 交通
('滴滴', '交通', '打车', 10),
('打车', '交通', '打车', 10),
('出租车', '交通', '打车', 8),
('地铁', '交通', '公交地铁', 10),
('公交', '交通', '公交地铁', 8),
('高铁', '交通', '公交地铁', 6),
('停车', '交通', '私家车', 8),
('加油', '交通', '私家车', 8),

-- 人情往来
('红包', '人情往来', '红包礼物', 10),
('转账', '人情往来', '转账', 8),
('请客', '人情往来', '请客吃饭', 8),
('送礼', '人情往来', '红包礼物', 8),

-- 居家缴费
('房租', '居家缴费', '房租', 10),
('水电', '居家缴费', '水电煤', 10),
('燃气', '居家缴费', '水电煤', 10),
('物业', '居家缴费', '房租', 6),
('宽带', '居家缴费', '水电煤', 8),
('话费', '居家缴费', '话费', 10),

-- 其他
('电影', '其他', '娱乐', 10),
('KTV', '其他', '娱乐', 10),
('健身', '其他', '娱乐', 8),
('医院', '其他', '医疗', 10),
('药店', '其他', '医疗', 8),
('培训', '其他', '教育', 8);

-- ============================================
-- 创建只读用户（可选，用于数据导出）
-- ============================================
-- CREATE USER auto_accountant_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE auto_accountant TO auto_accountant_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO auto_accountant_readonly;

-- ============================================
-- 完成
-- ============================================
\echo '✅ 数据库初始化完成！'
\echo '   数据库名: auto_accountant'
\echo '   表数量: 7'
\echo '   分类规则: 已插入'
