#!/bin/bash
# ============================================
# 随手记 - 一键部署脚本
# 运行此脚本自动部署到腾讯云服务器
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   随手记 - 一键部署脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo -e "${YELLOW}提示: sudo bash deploy.sh${NC}"
    exit 1
fi

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        echo -e "${RED}无法检测操作系统${NC}"
        exit 1
    fi
    echo -e "${GREEN}检测到操作系统: $OS${NC}"
}

# 安装 Docker
install_docker() {
    echo -e "${YELLOW}正在安装 Docker...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}Docker 已安装${NC}"
        docker --version
        return
    fi
    
    case $OS in
        centos|rhel)
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        ubuntu|debian)
            apt-get update
            apt-get install -y ca-certificates curl gnupg lsb-release
            mkdir -p /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        *)
            echo -e "${RED}不支持的操作系统${NC}"
            exit 1
            ;;
    esac
    
    # 启动 Docker
    systemctl start docker
    systemctl enable docker
    
    echo -e "${GREEN}Docker 安装成功！${NC}"
    docker --version
}

# 创建项目目录
create_directory() {
    echo -e "${YELLOW}创建项目目录...${NC}"
    
    PROJECT_DIR="/opt/auto-accountant"
    if [ -d "$PROJECT_DIR" ]; then
        echo -e "${YELLOW}项目目录已存在，是否重新部署？${NC}"
        read -p "输入 'yes' 重新部署: " confirm
        if [ "$confirm" != "yes" ]; then
            echo "取消部署"
            exit 0
        fi
    else
        mkdir -p $PROJECT_DIR
    fi
    
    echo -e "${GREEN}项目目录: $PROJECT_DIR${NC}"
}

# 配置环境变量
setup_env() {
    echo ""
    echo -e "${YELLOW}请配置数据库连接信息:${NC}"
    echo ""
    
    read -p "数据库主机 [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "数据库端口 [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "数据库名称 [auto_accountant]: " DB_NAME
    DB_NAME=${DB_NAME:-auto_accountant}
    
    read -p "数据库用户名 [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -s -p "数据库密码: " DB_PASSWORD
    echo ""
    
    read -p "Redis 地址 [redis:6379]: " REDIS_URL
    REDIS_URL=${REDIS_URL:-redis:6379}
    
    read -p "API 域名或IP [http://your-server-ip]: " CORS_ORIGIN
    CORS_ORIGIN=${CORS_ORIGIN:-http://your-server-ip}
    
    # 生成随机 JWT 密钥
    JWT_SECRET=$(openssl rand -base64 32)
    
    # 创建环境变量文件
    cat > /opt/auto-accountant/.env << EOF
NODE_ENV=production
PORT=3000

DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

REDIS_URL=redis://$REDIS_URL

JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=$CORS_ORIGIN

SMS_ENABLED=false
EOF
    
    echo -e "${GREEN}环境变量配置完成！${NC}"
}

# 部署服务
deploy_services() {
    echo ""
    echo -e "${YELLOW}正在部署服务...${NC}"
    
    cd /opt/auto-accountant
    
    # 拉取最新代码（如果有 git 仓库）
    if [ -d ".git" ]; then
        echo -e "${YELLOW}拉取最新代码...${NC}"
        git pull
    fi
    
    # 构建并启动服务
    docker-compose down 2>/dev/null || true
    docker-compose build --no-cache
    docker-compose up -d
    
    echo -e "${GREEN}服务启动中...${NC}"
    
    # 等待服务启动
    sleep 10
    
    # 检查服务状态
    echo ""
    echo -e "${YELLOW}检查服务状态...${NC}"
    docker-compose ps
    
    # 检查健康状态
    echo ""
    echo -e "${YELLOW}检查服务健康状态...${NC}"
    
    # API 服务
    if curl -f http://localhost:3000/health 2>/dev/null; then
        echo -e "${GREEN}✓ API 服务运行正常${NC}"
    else
        echo -e "${RED}✗ API 服务可能未正常启动${NC}"
    fi
    
    # AI 服务
    if curl -f http://localhost:8000/health 2>/dev/null; then
        echo -e "${GREEN}✓ AI 服务运行正常${NC}"
    else
        echo -e "${RED}✗ AI 服务可能未正常启动${NC}"
    fi
}

# 配置防火墙
setup_firewall() {
    echo ""
    echo -e "${YELLOW}配置防火墙...${NC}"
    
    # 开放端口
    case $OS in
        centos|rhel)
            if command -v firewall-cmd &> /dev/null; then
                firewall-cmd --permanent --add-port=80/tcp
                firewall-cmd --permanent --add-port=443/tcp
                firewall-cmd --permanent --add-port=3000/tcp
                firewall-cmd --reload
            fi
            ;;
        ubuntu|debian)
            if command -v ufw &> /dev/null; then
                ufw allow 80/tcp
                ufw allow 443/tcp
                ufw allow 3000/tcp
            fi
            ;;
    esac
    
    # 开放阿里云/腾讯云安全组（需要手动在控制台操作）
    echo -e "${YELLOW}请确保在云服务器控制台开放以下端口:${NC}"
    echo "  - 80 (HTTP)"
    echo "  - 443 (HTTPS)"
    echo "  - 3000 (API)"
}

# 初始化数据库
init_database() {
    echo ""
    echo -e "${YELLOW}初始化数据库...${NC}"
    
    # 等待数据库就绪
    echo -e "${YELLOW}等待数据库连接...${NC}"
    sleep 5
    
    # 创建数据库（如果使用本地 PostgreSQL）
    if [ "$DB_HOST" = "localhost" ]; then
        docker exec auto-accountant-api sh -c "npx prisma migrate deploy" || echo -e "${YELLOW}数据库迁移完成或已存在${NC}"
    fi
}

# 显示部署结果
show_result() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${GREEN}   部署完成！${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${GREEN}服务地址:${NC}"
    echo "  - API 服务: http://你的服务器IP:3000"
    echo "  - AI 服务:  http://你的服务器IP:8000"
    echo "  - API 文档: http://你的服务器IP:3000/docs"
    echo ""
    echo -e "${GREEN}常用命令:${NC}"
    echo "  查看状态: cd /opt/auto-accountant && docker-compose ps"
    echo "  查看日志: cd /opt/auto-accountant && docker-compose logs -f"
    echo "  重启服务: cd /opt/auto-accountant && docker-compose restart"
    echo "  停止服务: cd /opt/auto-accountant && docker-compose down"
    echo ""
    echo -e "${YELLOW}请在浏览器中访问 http://你的服务器IP:3000/health 验证服务${NC}"
    echo ""
}

# 主函数
main() {
    detect_os
    install_docker
    create_directory
    setup_env
    deploy_services
    setup_firewall
    init_database
    show_result
}

main "$@"
