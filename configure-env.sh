#!/bin/bash

# Environment Configuration Script for Auction Website
# This script helps you configure the environment for different deployment scenarios

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Auction Website Environment Configuration ===${NC}"
echo ""

# Function to prompt for input with default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local varname="$3"
    
    echo -n -e "${YELLOW}${prompt} [${default}]: ${NC}"
    read input
    if [ -z "$input" ]; then
        eval "$varname='$default'"
    else
        eval "$varname='$input'"
    fi
}

# Function to validate IP address
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        return 0
    else
        return 1
    fi
}

echo "Choose your deployment environment:"
echo "1) Local Development"
echo "2) EC2/Production Server"
echo "3) Custom Configuration"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo -e "${GREEN}Configuring for Local Development...${NC}"
        cat > .env << EOF
# Local Development Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_GATEWAY_PORT=3001
FRONTEND_PORT=3000
API_GATEWAY_PORT=3001
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
SERVER_API_URL=http://api-gateway:3001

# Database Configuration
MYSQL_ROOT_PASSWORD=dev_root_password
MYSQL_PASSWORD=dev_password

# JWT Configuration
JWT_KEY=dev_jwt_secret_key_change_in_production

# Email Service (configure as needed)
EMAIL_SERVICE_USER=your_email@gmail.com
EMAIL_SERVICE_PASS=your_app_password

# Redis and NATS
REDIS_URL=redis://expiration-redis-srv:6379
NATS_URL=http://nats-srv:4222
NATS_CLUSTER_ID=auction
NATS_CLIENT_ID=expiration

# Docker
IMAGE_TAG=latest
EOF
        echo -e "${GREEN}✅ Local development environment configured!${NC}"
        ;;
        
    2)
        echo -e "${GREEN}Configuring for EC2/Production Server...${NC}"
        echo ""
        
        # Get server IP
        while true; do
            prompt_with_default "Enter your EC2 server public IP" "3.87.83.50" SERVER_IP
            if validate_ip "$SERVER_IP"; then
                break
            else
                echo -e "${RED}Invalid IP address format. Please try again.${NC}"
            fi
        done
        
        # Get ports
        prompt_with_default "Frontend port" "3000" FRONTEND_PORT
        prompt_with_default "API Gateway port" "3001" API_GATEWAY_PORT
        
        # Get domain (optional)
        prompt_with_default "Custom domain (leave empty for IP-based access)" "" CUSTOM_DOMAIN
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || date +%s | sha256sum | base64 | head -c 32)
        
        # Build CORS origins
        CORS_ORIGINS="http://${SERVER_IP}:${FRONTEND_PORT}"
        if [ ! -z "$CUSTOM_DOMAIN" ]; then
            CORS_ORIGINS="${CORS_ORIGINS},https://${CUSTOM_DOMAIN},http://${CUSTOM_DOMAIN}"
        fi
        
        cat > .env << EOF
# Production Configuration for EC2: ${SERVER_IP}
NEXT_PUBLIC_API_GATEWAY_PORT=${API_GATEWAY_PORT}
FRONTEND_PORT=${FRONTEND_PORT}
API_GATEWAY_PORT=${API_GATEWAY_PORT}
CORS_ORIGIN=${CORS_ORIGINS}
SERVER_API_URL=http://api-gateway:${API_GATEWAY_PORT}

# Database Configuration (CHANGE THESE PASSWORDS!)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 16 2>/dev/null || date +%s | sha256sum | base64 | head -c 16)
MYSQL_PASSWORD=$(openssl rand -base64 16 2>/dev/null || date +%s | sha256sum | base64 | head -c 16)

# JWT Configuration
JWT_KEY=${JWT_SECRET}

# Email Service (CONFIGURE THESE!)
EMAIL_SERVICE_USER=your_email@gmail.com
EMAIL_SERVICE_PASS=your_app_password

# Redis and NATS
REDIS_URL=redis://expiration-redis-srv:6379
NATS_URL=http://nats-srv:4222
NATS_CLUSTER_ID=auction
NATS_CLIENT_ID=expiration

# Docker
IMAGE_TAG=latest
EOF

        echo -e "${GREEN}✅ Production environment configured!${NC}"
        echo ""
        echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
        echo "1. Database passwords have been auto-generated"
        echo "2. JWT secret has been auto-generated"
        echo "3. Please configure EMAIL_SERVICE_USER and EMAIL_SERVICE_PASS"
        echo "4. Consider using HTTPS in production"
        echo ""
        echo -e "${BLUE}Your application will be accessible at:${NC}"
        echo "Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
        echo "API: http://${SERVER_IP}:${API_GATEWAY_PORT}"
        if [ ! -z "$CUSTOM_DOMAIN" ]; then
            echo "Custom Domain: https://${CUSTOM_DOMAIN}"
        fi
        ;;
        
    3)
        echo -e "${GREEN}Custom Configuration Mode...${NC}"
        echo "Copy .env.production.example to .env and edit manually"
        cp .env.production.example .env
        echo -e "${YELLOW}Please edit .env file with your custom configuration${NC}"
        ;;
        
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Configuration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the .env file: cat .env"
echo "2. Start the application: docker-compose up -d"
echo "3. Check health: curl http://localhost:${API_GATEWAY_PORT:-3001}/health"
echo ""
echo -e "${BLUE}To reconfigure, run this script again: ./configure-env.sh${NC}"
