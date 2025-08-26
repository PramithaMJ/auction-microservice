#!/bin/bash

# Docker Repository Migration Script
# This script helps migrate from old naming convention (auction-website/service) 
# to new naming convention (auction-website-ms-service)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOCKER_USERNAME="${DOCKER_USERNAME:-pramithamj}"

echo -e "${BLUE}=== Docker Repository Migration Tool ===${NC}"
echo ""
echo "This script will help you migrate from the old naming convention:"
echo "  OLD: ${DOCKER_USERNAME}/auction-website/service-name"
echo "  NEW: ${DOCKER_USERNAME}/auction-website-ms-service-name"
echo ""

# List of services
services=("api-gateway" "auth" "bid" "listing" "payment" "profile" "email" "expiration" "frontend" "common")

echo "Available migration options:"
echo "1) Tag existing local images with new names"
echo "2) Pull images with old names and retag"
echo "3) Check which images exist locally"
echo "4) Clean up old image tags"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo -e "${GREEN}Tagging existing local images with new names...${NC}"
        echo ""
        
        for service in "${services[@]}"; do
            old_name="${DOCKER_USERNAME}/auction-website/${service}"
            new_name="${DOCKER_USERNAME}/auction-website-ms-${service}"
            
            # Check if old image exists
            if docker image inspect "${old_name}:latest" > /dev/null 2>&1; then
                echo -e "${BLUE}Tagging: ${old_name}:latest → ${new_name}:latest${NC}"
                docker tag "${old_name}:latest" "${new_name}:latest"
                
                # Also tag any versioned images
                for tag in $(docker images --format "table {{.Tag}}" "${old_name}" | tail -n +2 | grep -v "latest" | grep -v "TAG"); do
                    if [ ! -z "$tag" ] && [ "$tag" != "<none>" ]; then
                        echo -e "${BLUE}Tagging: ${old_name}:${tag} → ${new_name}:${tag}${NC}"
                        docker tag "${old_name}:${tag}" "${new_name}:${tag}"
                    fi
                done
                
                echo -e "${GREEN} Tagged ${service}${NC}"
            else
                echo -e "${YELLOW}⚠️  ${old_name}:latest not found locally${NC}"
            fi
        done
        ;;
        
    2)
        echo -e "${GREEN}Pulling images with old names and retagging...${NC}"
        echo ""
        
        for service in "${services[@]}"; do
            old_name="${DOCKER_USERNAME}/auction-website/${service}"
            new_name="${DOCKER_USERNAME}/auction-website-ms-${service}"
            
            echo -e "${BLUE}Attempting to pull: ${old_name}:latest${NC}"
            if docker pull "${old_name}:latest" 2>/dev/null; then
                echo -e "${BLUE}Tagging: ${old_name}:latest → ${new_name}:latest${NC}"
                docker tag "${old_name}:latest" "${new_name}:latest"
                echo -e "${GREEN} Pulled and tagged ${service}${NC}"
            else
                echo -e "${YELLOW}⚠️  Could not pull ${old_name}:latest${NC}"
            fi
        done
        ;;
        
    3)
        echo -e "${GREEN}Checking existing local images...${NC}"
        echo ""
        
        echo "OLD FORMAT IMAGES:"
        for service in "${services[@]}"; do
            old_name="${DOCKER_USERNAME}/auction-website/${service}"
            if docker image inspect "${old_name}:latest" > /dev/null 2>&1; then
                echo -e "${GREEN} ${old_name}:latest${NC}"
            else
                echo -e "${RED}❌ ${old_name}:latest${NC}"
            fi
        done
        
        echo ""
        echo "NEW FORMAT IMAGES:"
        for service in "${services[@]}"; do
            new_name="${DOCKER_USERNAME}/auction-website-ms-${service}"
            if docker image inspect "${new_name}:latest" > /dev/null 2>&1; then
                echo -e "${GREEN} ${new_name}:latest${NC}"
            else
                echo -e "${RED}❌ ${new_name}:latest${NC}"
            fi
        done
        ;;
        
    4)
        echo -e "${YELLOW}⚠️  This will remove old format image tags${NC}"
        echo "Images to be removed:"
        for service in "${services[@]}"; do
            old_name="${DOCKER_USERNAME}/auction-website/${service}"
            if docker image inspect "${old_name}:latest" > /dev/null 2>&1; then
                echo "  - ${old_name}:latest"
            fi
        done
        echo ""
        read -p "Are you sure you want to remove these tags? (y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            for service in "${services[@]}"; do
                old_name="${DOCKER_USERNAME}/auction-website/${service}"
                
                # Remove all tags for this service
                docker images --format "table {{.Tag}}" "${old_name}" | tail -n +2 | grep -v "TAG" | while read tag; do
                    if [ ! -z "$tag" ] && [ "$tag" != "<none>" ]; then
                        echo -e "${BLUE}Removing: ${old_name}:${tag}${NC}"
                        docker rmi "${old_name}:${tag}" 2>/dev/null || true
                    fi
                done
            done
            echo -e "${GREEN} Old format images cleaned up${NC}"
        else
            echo "Cleanup cancelled"
        fi
        ;;
        
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Migration operation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify your images: docker images | grep auction-website"
echo "2. Test your Docker Compose setup: docker-compose config"
echo "3. Build/push new images if needed: ./scripts/build-all.sh"
echo ""
echo -e "${BLUE}New repository naming convention is now active!${NC}"
