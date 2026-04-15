# 随手记 - 本地开发快速启动

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "   随手记 - 本地开发环境启动" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

# 检查 Docker Desktop
Write-Host "[1/5] 检查 Docker Desktop..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker info 2>$null | Out-Null
    $dockerRunning = $true
    Write-Host "  ✓ Docker 正在运行" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Docker 未运行" -ForegroundColor Red
    Write-Host "  请先启动 Docker Desktop" -ForegroundColor Yellow
    Write-Host "  下载地址: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Read-Host "按 Enter 退出"
    exit 1
}

# 检查 Node.js
Write-Host ""
Write-Host "[2/5] 检查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js 未安装" -ForegroundColor Red
    Write-Host "  下载地址: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按 Enter 退出"
    exit 1
}

# 启动本地数据库
Write-Host ""
Write-Host "[3/5] 启动本地 PostgreSQL + Redis..." -ForegroundColor Yellow

# 检查是否已有容器在运行
$pgRunning = docker ps --filter "name=auto-accountant-pg" --format "{{.Names}}" 2>$null
$redisRunning = docker ps --filter "name=auto-accountant-redis" --format "{{.Names}}" 2>$null

if (-not $pgRunning) {
    Write-Host "  启动 PostgreSQL..." -ForegroundColor Gray
    docker run -d `
        --name auto-accountant-pg `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=auto_accountant `
        -e POSTGRES_USER=postgres `
        -p 5432:5432 `
        postgres:16-alpine 2>$null
    
    # 等待 PostgreSQL 启动
    Write-Host "  等待 PostgreSQL 就绪..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    Write-Host "  ✓ PostgreSQL 已启动 (端口 5432)" -ForegroundColor Green
} else {
    Write-Host "  ✓ PostgreSQL 已在运行" -ForegroundColor Green
}

if (-not $redisRunning) {
    Write-Host "  启动 Redis..." -ForegroundColor Gray
    docker run -d `
        --name auto-accountant-redis `
        -p 6379:6379 `
        redis:7-alpine 2>$null
    Write-Host "  ✓ Redis 已启动 (端口 6379)" -ForegroundColor Green
} else {
    Write-Host "  ✓ Redis 已在运行" -ForegroundColor Green
}

# 初始化数据库
Write-Host ""
Write-Host "[4/5] 初始化数据库..." -ForegroundColor Yellow

$projectRoot = Split-Path -Parent $PSScriptRoot

# 安装后端依赖
Set-Location "$projectRoot\backend"
if (-not (Test-Path "node_modules")) {
    Write-Host "  安装后端依赖..." -ForegroundColor Gray
    npm install 2>$null
}

# 创建环境配置
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  ✓ 已创建 .env 配置文件" -ForegroundColor Green
}

# 生成 Prisma 客户端
Write-Host "  生成 Prisma 客户端..." -ForegroundColor Gray
npx prisma generate 2>$null | Out-Null

# 运行数据库迁移
Write-Host "  运行数据库迁移..." -ForegroundColor Gray
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auto_accountant?schema=public"
npx prisma migrate deploy 2>$null | Out-Null

# 插入分类规则
Write-Host "  初始化分类规则数据..." -ForegroundColor Gray
$initScript = "$projectRoot\scripts\init-db.sql"
if (Test-Path $initScript) {
    Get-Content $initScript | docker exec -i auto-accountant-pg psql -U postgres -d auto_accountant 2>$null | Out-Null
}

Write-Host "  ✓ 数据库初始化完成" -ForegroundColor Green

# 启动后端服务
Write-Host ""
Write-Host "[5/5] 启动后端服务..." -ForegroundColor Yellow
$env:NODE_ENV = "development"
$env:DB_HOST = "localhost"
$env:DB_PORT = "5432"
$env:DB_NAME = "auto_accountant"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "postgres"
$env:REDIS_URL = "redis://localhost:6379"

Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$projectRoot\backend" -NoNewWindow

# 显示结果
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   ✓ 本地开发环境启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "服务地址:" -ForegroundColor Cyan
Write-Host "  API:  http://localhost:3000" -ForegroundColor White
Write-Host "  文档: http://localhost:3000/docs" -ForegroundColor White
Write-Host ""
Write-Host "数据库:" -ForegroundColor Cyan
Write-Host "  Host: localhost:5432" -ForegroundColor White
Write-Host "  数据库: auto_accountant" -ForegroundColor White
Write-Host "  用户: postgres" -ForegroundColor White
Write-Host "  密码: postgres" -ForegroundColor White
Write-Host ""
Write-Host "管理工具:" -ForegroundColor Cyan
Write-Host "  Prisma Studio: cd backend && npx prisma studio" -ForegroundColor White
Write-Host ""
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
