#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=======================================${NC}"
echo -e "${GREEN}Auction Website Production Deployment${NC}"
echo -e "${YELLOW}=======================================${NC}"

# Set server IP to the current server IP
SERVER_IP=${1:-"98.87.131.233"}
API_GATEWAY_PORT=${2:-"3001"}
FRONTEND_PORT=${3:-"3000"}

# Set environment variables
export SERVER_IP=$SERVER_IP
export API_GATEWAY_PORT=$API_GATEWAY_PORT
export FRONTEND_PORT=$FRONTEND_PORT

# Configure CORS settings
export CORS_ORIGIN="http://${SERVER_IP}:${FRONTEND_PORT},https://${SERVER_IP}:${FRONTEND_PORT},http://${SERVER_IP},https://${SERVER_IP}"

# Configure frontend API settings
export NEXT_PUBLIC_API_URL="http://${SERVER_IP}:${API_GATEWAY_PORT}"
export NEXT_PUBLIC_API_GATEWAY_PORT="${API_GATEWAY_PORT}"
export SERVER_API_URL="http://api-gateway:${API_GATEWAY_PORT}"

# Set node environment to production
export NODE_ENV="production"

echo -e "${GREEN}Environment Configuration:${NC}"
echo -e "SERVER_IP: ${SERVER_IP}"
echo -e "API_GATEWAY_PORT: ${API_GATEWAY_PORT}"
echo -e "FRONTEND_PORT: ${FRONTEND_PORT}"
echo -e "CORS_ORIGIN: ${CORS_ORIGIN}"
echo -e "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}"
echo -e "NODE_ENV: ${NODE_ENV}"
echo

# Stop any running containers
echo -e "${YELLOW}Stopping any running containers...${NC}"
docker-compose down

# Pull latest images or build them
echo -e "${YELLOW}Building/pulling services...${NC}"
docker-compose build

# Start all services
echo -e "${YELLOW}Starting all services...${NC}"
docker-compose up -d

echo
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "API Gateway: http://${SERVER_IP}:${API_GATEWAY_PORT}"
echo -e "Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
echo
echo -e "${YELLOW}You can check logs with:${NC}"
echo -e "docker-compose logs -f"
echo -e "${YELLOW}Or for a specific service:${NC}"
echo -e "docker-compose logs -f frontend"
echo -e "docker-compose logs -f api-gateway"
echo
