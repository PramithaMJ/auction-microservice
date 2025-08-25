#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=======================================${NC}"
echo -e "${GREEN}Auction Website Pull-Only Deployment${NC}"
echo -e "${YELLOW}=======================================${NC}"

# Get the host IP address
HOST_IP=$(ipconfig getifaddr en0 || echo "localhost")
SERVER_IP=${1:-$HOST_IP}
API_GATEWAY_PORT=${2:-"3001"}
FRONTEND_PORT=${3:-"3000"}
IMAGE_TAG=${4:-"latest"}

# Set environment variables
export SERVER_IP=$SERVER_IP
export API_GATEWAY_PORT=$API_GATEWAY_PORT
export FRONTEND_PORT=$FRONTEND_PORT
export IMAGE_TAG=$IMAGE_TAG

# Configure CORS settings
export CORS_ORIGIN="http://${SERVER_IP}:${FRONTEND_PORT},https://${SERVER_IP}:${FRONTEND_PORT},http://${SERVER_IP},https://${SERVER_IP},http://localhost:${FRONTEND_PORT},https://localhost:${FRONTEND_PORT}"

# Configure frontend API settings
export NEXT_PUBLIC_API_URL="http://${SERVER_IP}:${API_GATEWAY_PORT}"
export NEXT_PUBLIC_API_GATEWAY_PORT="${API_GATEWAY_PORT}"
export SERVER_API_URL="http://api-gateway:${API_GATEWAY_PORT}"
export NEXT_PUBLIC_SERVER_IP="${SERVER_IP}"

# Set node environment to production for optimized build
export NODE_ENV="production"

echo -e "${GREEN}Environment Configuration:${NC}"
echo -e "SERVER_IP: ${SERVER_IP}"
echo -e "API_GATEWAY_PORT: ${API_GATEWAY_PORT}"
echo -e "FRONTEND_PORT: ${FRONTEND_PORT}"
echo -e "CORS_ORIGIN: ${CORS_ORIGIN}"
echo -e "NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}"
echo -e "IMAGE_TAG: ${IMAGE_TAG}"
echo -e "NODE_ENV: ${NODE_ENV}"
echo

# Stop any running containers
echo -e "${YELLOW}Stopping any running containers...${NC}"
docker-compose -f docker-compose.pull-only.yml down

# Pull latest images
echo -e "${YELLOW}Pulling latest images...${NC}"
docker-compose -f docker-compose.pull-only.yml pull

# Start all services
echo -e "${YELLOW}Starting all services...${NC}"
docker-compose -f docker-compose.pull-only.yml up -d

echo
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "API Gateway: http://${SERVER_IP}:${API_GATEWAY_PORT}"
echo -e "Frontend: http://${SERVER_IP}:${FRONTEND_PORT}"
echo
echo -e "${YELLOW}You can check logs with:${NC}"
echo -e "docker-compose -f docker-compose.pull-only.yml logs -f"
echo -e "${YELLOW}Or for a specific service:${NC}"
echo -e "docker-compose -f docker-compose.pull-only.yml logs -f frontend"
echo -e "docker-compose -f docker-compose.pull-only.yml logs -f api-gateway"
echo
