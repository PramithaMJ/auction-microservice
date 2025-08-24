#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE} Stopping Auction Website Services${NC}"

# Kill all Node.js processes that might be our services
echo -e "${YELLOW} Stopping Node.js services...${NC}"
pkill -f "node.*services"
pkill -f "npm.*start"
pkill -f "npm.*dev"
pkill -f "next"

# Stop Docker infrastructure
echo -e "${YELLOW} Stopping Docker infrastructure...${NC}"
docker-compose -f docker-compose.infrastructure.yml down

echo -e "${GREEN} All services stopped successfully!${NC}"

# Clean up logs if they exist
if [ -d "logs" ]; then
    echo -e "${YELLOW} Cleaning up log files...${NC}"
    rm -rf logs/*.log
fi

echo -e "${GREEN} Cleanup complete!${NC}"
