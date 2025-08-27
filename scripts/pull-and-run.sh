#!/bin/zsh

# Pull and run Docker images only - no building
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version from command line or use default
VERSION=${1:-latest}

echo -e "${BLUE} Docker Compose - Pull & Run Only${NC}"
echo -e "${BLUE} Version: ${VERSION}${NC}"
echo ""

# Set environment variable for docker-compose
export IMAGE_TAG=$VERSION

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED} Docker is not running. Please start Docker and try again.${NC}"
        exit 1
    fi
}

# Function to pull all images
pull_images() {
    echo -e "${YELLOW}📥 Pulling Docker images (version: ${VERSION})...${NC}"
    
    services=("auth" "bid" "listing" "payment" "profile" "email" "expiration" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        echo -e "  Pulling pramithamj/auction-website/${service}:${VERSION}"
        docker pull "pramithamj/auction-website/${service}:${VERSION}" || {
            echo -e "${RED} Failed to pull ${service}:${VERSION}${NC}"
            echo -e "${YELLOW}💡 Make sure the image exists on Docker Hub${NC}"
            exit 1
        }
    done
    
    echo -e "${GREEN} All images pulled successfully${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW} Starting services with docker-compose...${NC}"
    
    # Use the pull-only compose file
    docker-compose -f docker-compose.pull-only.yml down --remove-orphans
    docker-compose -f docker-compose.pull-only.yml up -d
    
    echo -e "${GREEN} All services started${NC}"
}

# Function to show status
show_status() {
    echo ""
    echo -e "${BLUE} Service Status:${NC}"
    docker-compose -f docker-compose.pull-only.yml ps
    
    echo ""
    echo -e "${BLUE} Access URLs:${NC}"
    echo -e "  Frontend:    ${GREEN}http://localhost:3000${NC}"
    echo -e "  API Gateway: ${GREEN}http://localhost:3001${NC}"
    echo -e "  Auth:        ${GREEN}http://localhost:3101${NC}"
    echo -e "  Bid:         ${GREEN}http://localhost:3102${NC}"
    echo -e "  Listings:    ${GREEN}http://localhost:3103${NC}"
    echo -e "  Payments:    ${GREEN}http://localhost:3104${NC}"
    echo -e "  Profile:     ${GREEN}http://localhost:3105${NC}"
    echo -e "  Email:       ${GREEN}http://localhost:3106${NC}"
    echo -e "  Expiration:  ${GREEN}http://localhost:3107${NC}"
}

# Function to show usage
show_usage() {
    echo ""
    echo -e "${YELLOW}💡 Usage Examples:${NC}"
    echo -e "  Latest version:    ${GREEN}./scripts/pull-and-run.sh${NC}"
    echo -e "  Specific version:  ${GREEN}./scripts/pull-and-run.sh v1.0.123${NC}"
    echo -e "  With commit SHA:   ${GREEN}./scripts/pull-and-run.sh v1.0.123-abc1234${NC}"
    echo ""
    echo -e "${YELLOW}💡 To stop services:${NC}"
    echo -e "  ${GREEN}docker-compose -f docker-compose.pull-only.yml down${NC}"
    echo ""
    echo -e "${YELLOW}💡 To view logs:${NC}"
    echo -e "  ${GREEN}docker-compose -f docker-compose.pull-only.yml logs -f${NC}"
}

# Main execution
main() {
    check_docker
    
    if [[ "$VERSION" != "latest" ]]; then
        pull_images
    else
        echo -e "${YELLOW}📥 Using latest images (pulling latest)...${NC}"
        pull_images
    fi
    
    start_services
    show_status
    show_usage
    
    echo ""
    echo -e "${GREEN} Deployment completed successfully!${NC}"
    echo -e "${BLUE} Running version: ${VERSION}${NC}"
}

# Handle interruption
trap 'echo -e "\n${YELLOW}  Deployment interrupted${NC}"; exit 1' INT

# Run main function
main
