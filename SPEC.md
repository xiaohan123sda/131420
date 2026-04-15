# 随手记 - 自动记账App 项目规范

> 全自动、极简、无广告的智能记账工具

---

## 一、项目概述

### 1.1 项目定位
一款专注于**自动同步多支付平台账单**、**聚焦工资去向追踪**的极简记账App，解决用户"不知道工资花在哪"的核心痛点。

### 1.2 目标用户
- 20-45岁职场人士，每月有固定工资
- 主要通过微信、支付宝、花呗、拼多多消费
- 有记账需求但嫌手动记账繁琐
- 追求极简、高效、无广告体验

### 1.3 核心价值
- **全自动**：授权后自动同步账单，无需手动录入
- **极简**：3个核心页面，操作路径≤2步
- **清晰**：一眼看清工资去向、消费结构

---

## 二、技术架构

### 2.1 移动端
| 项目 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | **Flutter 3.x** | 跨平台 iOS + Android |
| 语言 | Dart 3.x | Flutter 专用语言 |
| 状态管理 | Riverpod / GetX | 推荐 Riverpod |
| 本地存储 | Hive / SQLite | 本地缓存 |
| 网络 | Dio | HTTP 请求库 |
| 图表 | fl_chart | 消费可视化 |

### 2.2 后端
| 项目 | 技术选型 | 说明 |
|------|---------|------|
| 主框架 | **Node.js 20 + Express** | API 服务 |
| AI 服务 | **Python 3.11 + FastAPI** | AI 分类、消费分析 |
| ORM | Prisma | 数据库操作 |
| 认证 | JWT | 无状态认证 |
| 缓存 | Redis | 缓存层 |
| 消息队列 | BullMQ | 账单异步同步 |

### 2.3 数据库
| 项目 | 技术选型 | 说明 |
|------|---------|------|
| 主数据库 | **PostgreSQL 16** | 用户、账单、分类数据 |
| 缓存 | Redis 7.x | 同步状态缓存 |

### 2.4 基础设施
| 项目 | 技术选型 | 说明 |
|------|---------|------|
| 云服务器 | 腾讯云 ECS | 2核4G起步 |
| 云数据库 | 腾讯云 RDS PostgreSQL | 托管数据库 |
| 对象存储 | 腾讯云 COS | 头像、导出文件 |
| 域名 | 自购域名 + SSL | HTTPS |

### 2.5 架构图
```
┌─────────────────────────────────────────────────────────────┐
│                    Flutter App (iOS + Android)               │
│  首页 │ 收支明细 │ 我的                                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS (REST API)
┌────────────────────────▼────────────────────────────────────┐
│                 Node.js API Server (Express)                  │
│  用户模块 │ 账单模块 │ 分类模块 │ 报告模块 │ 同步模块           │
│  JWT认证 │ Redis缓存 │ BullMQ队列                            │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
       ▼                      ▼
┌─────────────┐      ┌─────────────────────┐
│ PostgreSQL  │      │   Python AI Service │
│  (RDS)      │      │  FastAPI + Transformers│
│ 用户/账单   │      │  AI分类 │ 消费分析  │
└─────────────┘      └─────────────────────┘
```

---

## 三、数据模型

### 3.1 ER 图概览
```
users ──1:N──> transactions
users ──1:N──> salary_records
users ──1:N──> platform_bindings
users ──1:N──> monthly_reports
transactions ──M:N──> categories (via category_rules)
```

### 3.2 核心表结构

#### users (用户表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| phone | VARCHAR(20) | 手机号 |
| nickname | VARCHAR(50) | 昵称 |
| avatar_url | VARCHAR(500) | 头像URL |
| monthly_savings_goal | DECIMAL(12,2) | 月度存钱目标 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### transactions (账单明细表 - 核心表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| user_id | BIGINT | 用户ID |
| platform | VARCHAR(20) | 平台(wechat/alipay/huabei/pinduoduo) |
| external_id | VARCHAR(200) | 第三方账单ID(防重复) |
| amount | DECIMAL(12,2) | 金额 |
| type | VARCHAR(10) | income/expense |
| merchant_name | VARCHAR(255) | 商户名 |
| trade_time | TIMESTAMP | 交易时间 |
| pay_method | VARCHAR(50) | 支付方式 |
| category_big | VARCHAR(50) | 大分类 |
| category_small | VARCHAR(100) | 小分类 |
| category_confidence | DECIMAL(5,4) | AI置信度 |
| user_category_override | VARCHAR(100) | 用户手动分类 |
| is_necessary | SMALLINT | -1未标记/0非必要/1必要 |
| notes | VARCHAR(500) | 备注 |
| is_anomaly | SMALLINT | 异常标记 |
| anomaly_reason | VARCHAR(255) | 异常原因 |
| sync_status | VARCHAR(20) | 同步状态 |
| created_at | TIMESTAMP | 创建时间 |

#### salary_records (工资记录表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| user_id | BIGINT | 用户ID |
| amount | DECIMAL(12,2) | 工资金额 |
| arrived_at | TIMESTAMP | 到账时间 |
| source | VARCHAR(50) | 来源 |
| notes | VARCHAR(255) | 备注 |

#### platform_bindings (平台绑定表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| user_id | BIGINT | 用户ID |
| platform | VARCHAR(20) | 平台 |
| access_token | TEXT | 访问令牌 |
| refresh_token | TEXT | 刷新令牌 |
| token_expires_at | TIMESTAMP | 令牌过期时间 |
| binding_status | SMALLINT | 绑定状态 |
| last_sync_at | TIMESTAMP | 最后同步时间 |

#### monthly_reports (月度报告表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| user_id | BIGINT | 用户ID |
| report_month | VARCHAR(7) | 报告月份(2025-04) |
| total_expense | DECIMAL(12,2) | 总支出 |
| total_income | DECIMAL(12,2) | 总收入 |
| category_breakdown | JSONB | 分类占比 |
| unnecessary_expense | DECIMAL(12,2) | 非必要消费 |
| suggestions | TEXT | 优化建议 |
| generated_at | TIMESTAMP | 生成时间 |

#### category_rules (分类规则表)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键 |
| keyword | VARCHAR(100) | 关键词 |
| category_big | VARCHAR(50) | 大分类 |
| category_small | VARCHAR(100) | 小分类 |
| weight | INT | 权重 |

---

## 四、功能模块

### 4.1 核心功能

#### F1: 多平台账单自动同步
- 支持：微信、支付宝、花呗、拼多多
- 授权后自动同步近3个月历史账单
- 实时同步新消费（10秒内）
- 同步状态实时反馈

#### F2: AI智能分类
- 6大分类：餐饮、购物、交通、人情往来、居家缴费、其他
- 15+细分小类
- 准确率目标≥95%
- 支持用户手动调整

#### F3: 工资去向可视化
- 自动识别工资到账
- 首页展示：工资/已花/剩余
- 饼图/条形图展示消费结构
- 按周/月查看明细

### 4.2 辅助功能

#### F4: 收支提醒
- 工资到账提醒
- 支出超30%/50%/80%提醒
- 异常账单提醒

#### F5: 消费分析
- 月度消费报告
- 非必要消费识别
- 消费优化建议

#### F6: 数据管理
- 云端备份/恢复
- 数据导出(Excel/CSV)
- 多账号切换

### 4.3 基础功能

#### F7: 用户体系
- 微信/支付宝一键登录
- 手机号登录
- 权限管理

#### F8: 设置中心
- 权限管理
- 提醒设置
- 隐私设置
- 缓存清理
- 账号注销

---

## 五、API 设计

### 5.1 认证模块
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/send-code | 发送验证码 |
| POST | /api/v1/auth/login | 手机号登录 |
| POST | /api/v1/auth/wechat-login | 微信登录 |
| POST | /api/v1/auth/refresh | 刷新Token |
| POST | /api/v1/auth/logout | 登出 |

### 5.2 用户模块
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/users/profile | 获取用户信息 |
| PUT | /api/v1/users/profile | 更新用户信息 |
| PUT | /api/v1/users/settings | 更新设置 |

### 5.3 账单模块
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/transactions | 获取账单列表 |
| GET | /api/v1/transactions/:id | 获取账单详情 |
| PUT | /api/v1/transactions/:id | 更新账单(分类/备注) |
| DELETE | /api/v1/transactions/:id | 删除账单 |
| GET | /api/v1/transactions/summary | 获取收支汇总 |
| GET | /api/v1/transactions/export | 导出账单 |

### 5.4 同步模块
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/sync/bind | 绑定平台 |
| DELETE | /api/v1/sync/bind/:platform | 解绑平台 |
| POST | /api/v1/sync/trigger | 手动触发同步 |
| GET | /api/v1/sync/status | 获取同步状态 |

### 5.5 工资模块
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/salary | 获取工资记录 |
| POST | /api/v1/salary | 添加工资记录 |
| PUT | /api/v1/salary/:id | 更新工资记录 |

### 5.6 报告模块
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/reports/monthly | 获取月度报告 |
| GET | /api/v1/reports/trends | 获取收支趋势 |

---

## 六、页面结构

### 6.1 页面清单
```
App
├── 启动页 (SplashScreen)
├── 引导页 (OnboardingScreen) - 首次安装
├── 登录页 (LoginScreen)
│   ├── 手机号登录
│   └── 微信一键登录
├── 首页 (HomeScreen) - 核心
│   ├── 工资概览
│   ├── 消费结构图
│   └── 近期账单列表
├── 收支明细页 (TransactionsScreen)
│   ├── 按周/月切换
│   ├── 筛选(平台/分类)
│   └── 搜索
├── 我的页 (ProfileScreen)
│   ├── 账号信息
│   ├── 平台绑定管理
│   ├── 数据备份
│   ├── 消费报告
│   └── 设置
├── 消费分析页 (ReportScreen)
│   ├── 月度分析
│   ├── 分类占比
│   └── 优化建议
└── 设置页 (SettingsScreen)
    ├── 权限管理
    ├── 提醒设置
    ├── 隐私设置
    └── 账号注销
```

---

## 七、AI 分类方案

### 7.1 分类体系
```
餐饮
├── 外卖
├── 堂食
├── 零食
└── 饮品

购物
├── 服装
├── 电子产品
├── 日用品
└── 化妆品

交通
├── 打车
├── 公交地铁
└── 私家车

人情往来
├── 请客吃饭
├── 红包礼物
└── 转账

居家缴费
├── 水电煤
├── 房租
├── 话费
└── 网购

其他
├── 医疗
├── 教育
├── 娱乐
└── 公益
```

### 7.2 AI 分类策略
1. **关键词匹配**：基于商户名关键词匹配
2. **规则引擎**：正则表达式匹配金额、时间等
3. **机器学习**：TF-IDF + 朴素贝叶斯分类器
4. **用户反馈学习**：用户修改分类后自动学习

---

## 八、第三方平台接入方案

### 8.1 银行账单邮箱解析（推荐）
- 用户授权邮箱（QQ邮箱/网易邮箱）
- 服务器定时抓取银行通知邮件
- 解析金额、时间、交易描述
- 优点：绕过平台 API 限制，支持所有银行卡

### 8.2 微信支付 API
- 需要微信商户平台
- 可查询交易记录、账单

### 8.3 支付宝 API
- 需要支付宝开放平台
- 可查询账单、消费记录

---

## 九、部署方案

### 9.1 开发环境
- Docker Compose 本地开发
- PostgreSQL + Redis + Node.js + Python

### 9.2 生产环境（腾讯云）
```
┌─────────────────────────────────────────┐
│  腾讯云 VPC 私有网络                      │
│  ┌───────────────────────────────────┐  │
│  │  应用服务器 (CVM)                   │  │
│  │  Node.js API (Docker)             │  │
│  │  Python AI (Docker)               │  │
│  └───────────────────────────────────┘  │
│  ┌──────────┐  ┌────────────────────┐  │
│  │ RDS PG   │  │   Redis 缓存        │  │
│  └──────────┘  └────────────────────┘  │
└─────────────────────────────────────────┘
```

### 9.3 域名与HTTPS
- 购买域名
- 腾讯云SSL证书
- 备案（国内必须）

---

## 十、开发计划

### 第一阶段：基础设施（1-2周）
- [ ] 项目结构初始化
- [ ] 数据库设计与迁移
- [ ] 后端 API 框架搭建
- [ ] Docker Compose 本地开发环境

### 第二阶段：核心功能（3-6周）
- [ ] 用户认证模块
- [ ] 账单同步模块
- [ ] AI 分类服务
- [ ] Flutter App 核心页面

### 第三阶段：完善功能（7-10周）
- [ ] 消费分析报告
- [ ] 收支提醒
- [ ] 数据导出
- [ ] 多账号支持

### 第四阶段：测试上线（11-12周）
- [ ] 全流程测试
- [ ] 性能优化
- [ ] 应用市场上架
- [ ] 灰度发布

---

## 十一、项目规范

### 代码规范
- ESLint + Prettier（格式化）
- Git Commit 规范（Conventional Commits）
- RESTful API 规范

### 安全规范
- 密码加密存储（bcrypt）
- JWT Token 有效期控制
- HTTPS 全站加密
- 敏感数据脱敏

### 隐私规范
- 数据最小化收集
- 账单数据加密存储
- 支持账号注销和数据删除
