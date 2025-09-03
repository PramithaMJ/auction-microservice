#!/bin/bash

# Auction System Restart Script with Updated Stripe Configuration
# This script rebuilds and restarts the entire Docker Compose setup

echo " Restarting Auction System with Updated Stripe Configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN} $1 successful${NC}"
    else
        echo -e "${RED} $1 failed${NC}"
        exit 1
    fi
}

echo -e "${BLUE} Step 1: Stopping existing containers...${NC}"
docker-compose down
check_status "Container shutdown"

echo -e "${BLUE} Step 2: Cleaning up old images and containers...${NC}"
docker system prune -f
check_status "System cleanup"

echo -e "${BLUE} Step 3: Pulling latest images...${NC}"
docker-compose pull
check_status "Image pull"

echo -e "${BLUE}🔨 Step 4: Building updated services...${NC}"
docker-compose build --no-cache
check_status "Service build"

echo -e "${BLUE} Step 5: Starting services with updated configuration...${NC}"
docker-compose up -d
check_status "Service startup"

echo -e "${BLUE}⏳ Waiting for services to initialize...${NC}"
sleep 30

echo -e "${GREEN} Restart Complete!${NC}"
echo ""
echo -e "${YELLOW} Checking service status...${NC}"
echo ""

# Check container status
echo -e "${BLUE}Running containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${GREEN} To check specific service logs, use:${NC}"
echo "docker logs <container-name>"
echo ""
echo -e "${GREEN} Application URLs:${NC}"
echo "Frontend: http://44.207.118.24:3000"
echo "API Gateway: http://44.207.118.24:3001"
echo ""
echo -e "${YELLOW}  Updated Configuration:${NC}"
echo "- Stripe Secret Key: Updated in payments service"
echo "- Stripe Publishable Key: Updated in frontend"
echo "- Environment variables: Loaded from .env file"
echo ""
echo -e "${GREEN} System restart completed successfully!${NC}"
