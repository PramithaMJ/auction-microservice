#!/bin/zsh

# Stop all auction website services
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping Auction Website Services${NC}"

# Stop all services
echo -e "${YELLOW}Stopping containers...${NC}"
docker-compose down --remove-orphans

# Optional: Remove volumes (uncomment if you want to reset data)
# echo -e "${YELLOW}Removing volumes...${NC}"
# docker-compose down -v

# Optional: Remove images (uncomment if you want to clean up)
# echo -e "${YELLOW}Removing images...${NC}"
# docker system prune -f

echo -e "${GREEN}✅ All services stopped${NC}"

echo ""
echo -e "${YELLOW}💡 To restart:${NC}"
echo -e "  Latest version: ${GREEN}./scripts/deploy.sh${NC}"
echo -e "  Specific version: ${GREEN}./scripts/deploy.sh v1.0.123${NC}"
