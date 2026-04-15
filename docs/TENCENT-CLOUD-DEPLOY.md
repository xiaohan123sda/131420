# 随手记 - 腾讯云部署操作指南

## 📋 前置准备

### 需要购买的腾讯云资源

| 资源 | 推荐配置 | 月费参考 | 链接 |
|------|---------|---------|------|
| 云服务器 CVM | 2核4G CentOS 7.9 | ¥60-80 | https://console.cloud.tencent.com/cvm |
| 云数据库 RDS | 2核4G PostgreSQL 16 | ¥80-120 | https://console.cloud.tencent.com/cdb |
| 域名（可选） | .com / .cn | ¥30-60/年 | https://console.cloud.tencent.com/domain |

> 💡 新用户首购有优惠，2核4G 服务器最低可至 ¥50/年

---

## 🚀 方式一：一键部署（推荐）

### 步骤 1：购买云服务器

1. 打开 https://console.cloud.tencent.com/cvm
2. 点击「新建实例」
3. 选择配置：
   - 地域：广州/上海（就近）
   - 镜像：CentOS 7.9 64位
   - 规格：2核4G
   - 存储：50GB SSD
   - 带宽：1Mbps（按量计费更便宜）
4. 设置密码（记住！）
5. 购买

### 步骤 2：购买云数据库（推荐）

1. 打开 https://console.cloud.tencent.com/cdb
2. 点击「新建实例」
3. 选择配置：
   - 数据库引擎：PostgreSQL 16
   - 地域：与服务器同地域
   - 规格：2核4G
   - 硬盘：50GB
4. 设置数据库密码
5. 购买

> 💡 如果预算有限，可以先不买 RDS，用服务器上的 Docker 跑 PostgreSQL

### 步骤 3：配置安全组

打开 https://console.cloud.tencent.com/vpc/securitygroup

添加入站规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 0.0.0.0/0 | SSH 登录 |
| TCP | 80 | 0.0.0.0/0 | HTTP |
| TCP | 443 | 0.0.0.0/0 | HTTPS |
| TCP | 3000 | 0.0.0.0/0 | API 服务 |
| TCP | 5432 | 内网IP | 数据库（仅内网） |

### 步骤 4：连接服务器

```powershell
# 在 Windows PowerShell 中连接
ssh root@你的服务器公网IP
# 输入密码
```

### 步骤 5：上传项目文件

在本地 Windows 上执行：
```powershell
# 方法一：使用 scp 上传
scp -r C:\Users\韩青利\.qclaw\workspace\projects\auto-accountant root@你的IP:/opt/

# 方法二：使用 Git（需要先推送到远程仓库）
# 在服务器上：
git clone https://github.com/你的用户名/auto-accountant.git /opt/auto-accountant
```

### 步骤 6：运行部署脚本

```bash
# 在服务器上执行
cd /opt/auto-accountant
chmod +x scripts/deploy.sh
bash scripts/deploy.sh
```

按照提示输入数据库信息，脚本会自动：
1. 安装 Docker
2. 配置环境变量
3. 构建镜像
4. 启动服务
5. 配置防火墙

### 步骤 7：验证部署

```bash
# 检查服务状态
docker-compose ps

# 查看 API 日志
docker-compose logs -f api

# 健康检查
curl http://localhost:3000/health
```

在浏览器中访问：
- API 健康检查：http://你的IP:3000/health
- API 接口：http://你的IP:3000/api/v1

---

## 🖥️ 方式二：本地开发（不花钱）

如果暂时不想购买云服务器，可以在本地用 Docker 开发：

### 步骤 1：安装 Docker Desktop

下载地址：https://www.docker.com/products/docker-desktop

安装后启动 Docker Desktop

### 步骤 2：运行启动脚本

```powershell
cd C:\Users\韩青利\.qclaw\workspace\projects\auto-accountant
.\scripts\start-local.ps1
```

脚本会自动：
1. 检查 Docker
2. 启动 PostgreSQL + Redis
3. 初始化数据库
4. 启动后端 API 服务

### 步骤 3：验证

- 打开浏览器访问：http://localhost:3000/health
- 应该看到：`{"status":"ok","timestamp":"..."}`

---

## 📊 腾讯云 RDS PostgreSQL 配置

### 创建数据库

1. 登录腾讯云 RDS 控制台
2. 找到你的 PostgreSQL 实例
3. 点击「数据库管理」→「创建数据库」
4. 数据库名：`auto_accountant`
5. 字符集：UTF-8

### 获取连接信息

1. 实例详情 → 「连接信息」
2. 记录以下信息：
   - 内网地址（如：gz-cdb-xxx.sql.tencentcdb.com）
   - 端口（默认 5432）
   - 用户名（如：root）
   - 密码

### 初始化表结构

```bash
# 在服务器上执行
psql -h 你的RDS地址 -U root -d auto_accountant -f /opt/auto-accountant/scripts/init-db.sql
```

---

## 🔧 常用运维命令

```bash
# 查看服务状态
cd /opt/auto-accountant && docker-compose ps

# 查看日志
docker-compose logs -f api          # API 日志
docker-compose logs -f ai           # AI 服务日志
docker-compose logs -f --tail=100   # 最近100行

# 重启服务
docker-compose restart api

# 更新代码后重新部署
git pull
docker-compose build --no-cache
docker-compose up -d

# 数据库备份
docker exec auto-accountant-pg pg_dump -U postgres auto_accountant > backup.sql

# 数据库恢复
cat backup.sql | docker exec -i auto-accountant-pg psql -U postgres auto_accountant
```

---

## 🔐 安全建议

1. **修改 SSH 端口**：不用默认 22
2. **禁用 root 密码登录**：使用 SSH Key
3. **数据库密码强度**：8位以上，包含大小写+数字+符号
4. **JWT 密钥**：使用 32 位以上随机字符串
5. **定期备份**：每天自动备份数据库
6. **HTTPS**：配置 SSL 证书

---

## 📞 常见问题

### Q: 连接服务器超时？
A: 检查安全组是否开放 22 端口

### Q: 数据库连接不上？
A: 确保服务器和 RDS 在同一个地域和 VPC

### Q: Docker 安装失败？
A: 尝试手动安装：
```bash
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
```

### Q: 端口被占用？
A: 修改 docker-compose.yml 中的端口映射
