# 随手记 - 自动记账App

> 全自动、极简、无广告的智能记账工具

## 📁 项目结构

```
auto-accountant/
├── backend/                 # 后端服务 (Node.js + Express)
│   ├── src/
│   │   ├── config/         # 配置文件
│   │   ├── middleware/      # 中间件
│   │   ├── routes/         # API路由
│   │   └── index.ts        # 入口文件
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/              # AI分类服务 (Python + FastAPI)
│   ├── main.py             # AI服务入口
│   └── requirements.txt
│
├── app/                     # Flutter App
│   ├── lib/
│   │   ├── core/           # 核心配置
│   │   ├── models/          # 数据模型
│   │   ├── pages/           # 页面
│   │   ├── providers/       # 状态管理
│   │   └── widgets/         # 组件
│   └── pubspec.yaml
│
├── docs/                    # 项目文档
│   └── SPEC.md             # 详细规范文档
│
└── README.md               # 项目说明
```

## 🚀 快速开始

### 1. 后端服务

```bash
cd backend

# 安装依赖
npm install

# 复制环境配置
cp .env.example .env
# 编辑 .env 填写数据库等信息

# 生成 Prisma 客户端
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# 启动开发服务器
npm run dev
```

### 2. AI 服务

```bash
cd ai-service

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python main.py
```

### 3. Flutter App

```bash
cd app

# 安装依赖
flutter pub get

# 运行（需要Flutter SDK）
flutter run
```

## 📋 功能清单

### 核心功能 ✅
- [x] 用户注册/登录（手机号验证码 + 微信一键登录）
- [x] 账单列表查询
- [x] 账单分类修改
- [x] 收支汇总统计
- [x] 工资记录管理
- [x] 月度消费报告

### 待开发 🔨
- [ ] 支付平台绑定与授权
- [ ] 账单自动同步
- [ ] AI 智能分类
- [ ] 消费分析推送
- [ ] 数据导出
- [ ] 多账号管理

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 移动端 | Flutter 3.x + Riverpod |
| 后端 | Node.js + Express + TypeScript |
| AI | Python + FastAPI |
| 数据库 | PostgreSQL + Prisma ORM |
| 缓存 | Redis |
| 部署 | Docker + 腾讯云 |

## 📊 数据库

使用 Prisma ORM，支持 PostgreSQL。

```bash
# 初始化数据库
npm run prisma:migrate

# 查看/编辑数据
npm run prisma:studio
```

## 🔐 环境变量

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/auto_accountant

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 微信支付
WECHAT_APP_ID=your-app-id
WECHAT_APP_SECRET=your-secret
```

## 🌐 API 文档

启动后端服务后访问：
- 开发环境：http://localhost:3000
- API 文档：http://localhost:3000/api/v1

### 主要接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/send-code | 发送验证码 |
| POST | /api/v1/auth/login | 手机号登录 |
| GET | /api/v1/transactions | 获取账单列表 |
| GET | /api/v1/transactions/summary | 收支汇总 |
| GET | /api/v1/reports/monthly | 月度报告 |

## 🚢 部署

### Docker 部署

```bash
# 构建
docker-compose build

# 启动
docker-compose up -d
```

### 腾讯云部署

1. 购买云服务器 ECS (CentOS 7+)
2. 安装 Docker
3. 克隆代码
4. 配置环境变量
5. 使用 Docker Compose 启动服务

## 📱 开发计划

- [ ] 第一阶段：基础框架搭建 ✅
- [ ] 第二阶段：核心 API 开发
- [ ] 第三阶段：Flutter App 开发
- [ ] 第四阶段：AI 服务集成
- [ ] 第五阶段：支付平台接入
- [ ] 第六阶段：测试与上线

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
