#!/bin/bash

# Build all Docker images locally for testing
set -e

echo " Building all Docker images locally..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Generate version tags
VERSION="v1.0.local"
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DATE=$(date +%Y%m%d)
FULL_TAG="${VERSION}-${SHORT_SHA}"

echo -e "${BLUE} Version: ${VERSION}${NC}"
echo -e "${BLUE} Full Tag: ${FULL_TAG}${NC}"
echo -e "${BLUE} Date: ${DATE}${NC}"
echo -e "${BLUE} Commit: ${SHORT_SHA}${NC}"
echo ""

# Docker username
DOCKER_USERNAME="pramithamj"

# Function to build service
build_service() {
    local service_name=$1
    local context_path=$2
    local dockerfile_path=$3
    
    echo -e "${YELLOW}Building ${service_name}...${NC}"
    
    if [ ! -f "${dockerfile_path}" ]; then
        echo -e "${RED} Dockerfile not found: ${dockerfile_path}${NC}"
        return 1
    fi
    
    docker build \
        -t "${DOCKER_USERNAME}/auction-website-ms-${service_name}:${FULL_TAG}" \
        -t "${DOCKER_USERNAME}/auction-website-ms-${service_name}:latest" \
        -f "${dockerfile_path}" \
        "${context_path}"
    
    echo -e "${GREEN} ${service_name} built successfully${NC}"
}

# Build common package
echo -e "${BLUE} Building Common Package...${NC}"
build_service "common" "./common" "./common/Dockerfile"

# Build services
echo -e "${BLUE} Building Microservices...${NC}"

services=(
    "auth:./services/auth:./services/auth/Dockerfile"
    "bid:./services/bid:./services/bid/Dockerfile"
    "listing:./services/listings:./services/listings/Dockerfile"
    "payment:./services/payments:./services/payments/Dockerfile"
    "profile:./services/profile:./services/profile/Dockerfile"
    "email:./services/email:./services/email/Dockerfile"
    "expiration:./services/expiration:./services/expiration/Dockerfile"
    "api-gateway:./services/api-gateway:./services/api-gateway/Dockerfile"
)

for service_info in "${services[@]}"; do
    IFS=':' read -r service_name context_path dockerfile_path <<< "$service_info"
    build_service "$service_name" "$context_path" "$dockerfile_path"
done

# Build frontend with dev dockerfile
echo -e "${BLUE}🎨 Building Frontend...${NC}"
build_service "frontend" "./services/frontend" "./services/frontend/Dockerfile.dev"

echo ""
echo -e "${GREEN} All images built successfully!${NC}"
echo ""
echo -e "${BLUE} Built Images:${NC}"

# List all built images
services_list=("common" "auth" "bid" "listing" "payment" "profile" "email" "expiration" "api-gateway" "frontend")

for service in "${services_list[@]}"; do
    echo -e "  ${GREEN}✓${NC} ${DOCKER_USERNAME}/auction-website-ms-${service}:${FULL_TAG}"
    echo -e "  ${GREEN}✓${NC} ${DOCKER_USERNAME}/auction-website-ms-${service}:latest"
done

echo ""
echo -e "${YELLOW} To push to Docker Hub:${NC}"
for service in "${services_list[@]}"; do
    echo -e "  docker push ${DOCKER_USERNAME}/auction-website-ms-${service}:${FULL_TAG}"
    echo -e "  docker push ${DOCKER_USERNAME}/auction-website-ms-${service}:latest"
done

echo ""
echo -e "${YELLOW} To use in docker-compose:${NC}"
echo -e "  export IMAGE_TAG=${FULL_TAG}"
echo -e "  docker-compose up -d"
