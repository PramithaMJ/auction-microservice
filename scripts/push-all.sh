#!/bin/bash

# Push all Docker images to Docker Hub
set -e

echo "🚀 Pushing all Docker images to Docker Hub..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}⚠️  Not logged in to Docker Hub. Please run:${NC}"
    echo -e "  docker login"
    exit 1
fi

# Generate version tags
VERSION="v1.0.local"
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
FULL_TAG="${VERSION}-${SHORT_SHA}"

echo -e "${BLUE} Version: ${VERSION}${NC}"
echo -e "${BLUE}🔖 Full Tag: ${FULL_TAG}${NC}"
echo ""

# Docker username
DOCKER_USERNAME="pramithamj"

# Function to push service
push_service() {
    local service_name=$1
    
    echo -e "${YELLOW}Pushing ${service_name}...${NC}"
    
    # Check if images exist
    if ! docker image inspect "${DOCKER_USERNAME}/auction-website-ms-${service_name}:${FULL_TAG}" > /dev/null 2>&1; then
        echo -e "${RED} Image not found: ${DOCKER_USERNAME}/auction-website-ms-${service_name}:${FULL_TAG}${NC}"
        echo -e "${YELLOW}💡 Run ./scripts/build-all.sh first${NC}"
        return 1
    fi
    
    # Push both tags
    docker push "${DOCKER_USERNAME}/auction-website-ms-${service_name}:${FULL_TAG}"
    docker push "${DOCKER_USERNAME}/auction-website-ms-${service_name}:latest"
    
    echo -e "${GREEN} ${service_name} pushed successfully${NC}"
}

# Services to push
services=("common" "auth" "bid" "listing" "payment" "profile" "email" "expiration" "api-gateway" "frontend")

for service in "${services[@]}"; do
    push_service "$service"
done

echo ""
echo -e "${GREEN}🎉 All images pushed successfully to Docker Hub!${NC}"
echo ""
echo -e "${BLUE}📋 Pushed Images:${NC}"

for service in "${services[@]}"; do
    echo -e "  ${GREEN}✓${NC} ${DOCKER_USERNAME}/auction-website-ms-${service}:${FULL_TAG}"
    echo -e "  ${GREEN}✓${NC} ${DOCKER_USERNAME}/auction-website-ms-${service}:latest"
done

echo ""
echo -e "${YELLOW}💡 View on Docker Hub:${NC}"
echo -e "  https://hub.docker.com/u/${DOCKER_USERNAME}"
