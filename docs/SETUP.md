# 随手记 - 开发环境搭建指南

## 📋 前置要求

### 必需软件

| 软件 | 版本 | 用途 | 下载地址 |
|------|------|------|---------|
| Node.js | 18+ | 后端运行环境 | https://nodejs.org/ |
| Python | 3.10+ | AI 服务 | https://www.python.org/ |
| Flutter | 3.x | App 开发 | https://flutter.dev/ |
| Git | 最新 | 版本控制 | https://git-scm.com/ |

### 可选软件

| 软件 | 用途 |
|------|------|
| Docker | 本地数据库/Redis |
| VS Code | 代码编辑器 |
| DBeaver | 数据库管理 |

---

## 🖥️ 第一步：后端开发环境

### 1.1 安装 Node.js

```powershell
# 验证安装
node --version
npm --version
```

### 1.2 克隆项目

```powershell
git clone <项目地址>
cd auto-accountant/backend
```

### 1.3 安装依赖

```powershell
npm install
```

### 1.4 配置环境变量

```powershell
cp .env.example .env
# 使用记事本编辑
notepad .env
```

填写以下关键配置：
```env
NODE_ENV=development
PORT=3000

# 数据库（本地Docker或云数据库）
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auto_accountant
DB_USER=postgres
DB_PASSWORD=your_password

# JWT密钥（随机字符串）
JWT_SECRET=随便写一个随机字符串
```

### 1.5 本地数据库（使用 Docker）

```powershell
# 启动 PostgreSQL 和 Redis
docker run -d `
  --name auto-accountant-db `
  -e POSTGRES_PASSWORD=your_password `
  -e POSTGRES_DB=auto_accountant `
  -p 5432:5432 `
  postgres:16

docker run -d `
  --name auto-accountant-redis `
  -p 6379:6379 `
  redis:7
```

### 1.6 初始化数据库

```powershell
# 生成 Prisma 客户端
npm run prisma:generate

# 运行迁移
npm run prisma:migrate

# 可选：打开数据库可视化工具
npm run prisma:studio
```

### 1.7 启动后端服务

```powershell
npm run dev
```

看到以下信息表示启动成功：
```
🚀 API 服务启动成功
环境: development
端口: 3000
```

---

## 🤖 第二步：AI 服务开发环境

### 2.1 安装 Python

```powershell
# 验证安装
python --version
pip --version
```

### 2.2 创建虚拟环境

```powershell
cd ../ai-service
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\activate
```

### 2.3 安装依赖

```powershell
pip install -r requirements.txt
```

### 2.4 启动 AI 服务

```powershell
python main.py
```

看到以下信息表示启动成功：
```
🤖 AI 服务启动成功
端口: 8000
```

---

## 📱 第三步：Flutter App 开发环境

### 3.1 安装 Flutter SDK

1. 下载 Flutter SDK：https://flutter.dev/
2. 解压到指定目录（如 `D:\Flutter`）
3. 添加到系统 PATH

```powershell
# 验证安装
flutter --version
```

### 3.2 配置 Android 开发环境

```powershell
# 检查环境
flutter doctor
```

按照提示安装 Android SDK 和配置 Android 模拟器。

### 3.3 运行 App

```powershell
cd ../app
flutter pub get
flutter run
```

---

## 🌐 第四步：云端部署（腾讯云）

### 4.1 购买云服务器

1. 登录腾讯云控制台
2. 购买 CVM 实例（推荐配置：2核4G CentOS 7+）
3. 记录公网 IP

### 4.2 安装 Docker

```bash
# 连接到服务器
ssh root@你的IP

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 启动 Docker
systemctl start docker
systemctl enable docker
```

### 4.3 安装 Docker Compose

```bash
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 4.4 部署服务

```bash
# 克隆项目
git clone <项目地址>
cd auto-accountant

# 配置环境变量
cp backend/.env.example backend/.env
nano backend/.env  # 编辑配置

# 使用 Docker Compose 启动
docker-compose up -d
```

---

## 🔧 常见问题

### Q: 数据库连接失败？
A: 检查以下几点：
1. PostgreSQL 是否启动
2. 端口 5432 是否可访问
3. .env 中的数据库配置是否正确
4. 数据库是否已创建

### Q: npm install 失败？
A: 尝试以下方法：
```powershell
# 清除缓存
npm cache clean --force

# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
npm install
```

### Q: Flutter run 报错？
A: 确保：
1. Android SDK 已正确配置
2. 手机已开启开发者模式
3. 或者使用模拟器运行

### Q: AI 服务启动失败？
A: 检查 Python 版本是否为 3.10+，并确保已激活虚拟环境。

---

## 📞 技术支持

如有问题，请提交 Issue 或联系开发者。
