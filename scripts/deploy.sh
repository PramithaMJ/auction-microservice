#!/bin/zsh

# Deploy specific version of the auction website
# Usage: ./scripts/deploy.sh [version]
# Example: ./scripts/deploy.sh v1.0.123

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to latest if no version specified
VERSION=${1:-latest}

echo -e "${BLUE}🚀 Deploying Auction Website${NC}"
echo -e "${BLUE} Version: ${VERSION}${NC}"
echo ""

# Set environment variable
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
    echo -e "${YELLOW}📥 Pulling Docker images...${NC}"
    
    services=("common" "auth" "bid" "listing" "payment" "profile" "email" "expiration" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        echo -e "  Pulling pramithamj/auction-website-ms-${service}:${VERSION}"
        if ! docker pull "pramithamj/auction-website-ms-${service}:${VERSION}" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Failed to pull ${service}:${VERSION}, will try to build locally${NC}"
        fi
    done
    
    echo -e "${GREEN} Image pull completed${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🏗️  Starting services...${NC}"
    
    # Stop any existing containers
    docker-compose down --remove-orphans
    
    # Start infrastructure services first
    echo -e "  Starting infrastructure..."
    docker-compose up -d nats-streaming redis auth-mysql bid-mysql listings-mysql payments-mysql profile-mysql
    
    # Wait for databases to be healthy
    echo -e "  Waiting for databases to be ready..."
    sleep 30
    
    # Build and start common package
    echo -e "  Building common package..."
    docker-compose up --build common
    
    # Start application services
    echo -e "  Starting application services..."
    docker-compose up -d auth bid listings payments profile email expiration api-gateway
    
    # Wait for services to start
    sleep 15
    
    # Start frontend
    echo -e "  Starting frontend..."
    docker-compose up -d frontend
    
    echo -e "${GREEN} All services started${NC}"
}

# Function to show status
show_status() {
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}🌐 Access URLs:${NC}"
    echo -e "  Frontend:    ${GREEN}http://localhost:3000${NC}"
    echo -e "  API Gateway: ${GREEN}http://localhost:3001${NC}"
    echo -e "  Auth:        ${GREEN}http://localhost:3101${NC}"
    echo -e "  Bid:         ${GREEN}http://localhost:3102${NC}"
    echo -e "  Listings:    ${GREEN}http://localhost:3103${NC}"
    echo -e "  Payments:    ${GREEN}http://localhost:3104${NC}"
    echo -e "  Profile:     ${GREEN}http://localhost:3105${NC}"
    echo -e "  Email:       ${GREEN}http://localhost:3106${NC}"
    echo -e "  Expiration:  ${GREEN}http://localhost:3107${NC}"
    
    echo ""
    echo -e "${BLUE}🗃️  Database Ports:${NC}"
    echo -e "  Auth MySQL:     ${GREEN}localhost:3306${NC}"
    echo -e "  Bid MySQL:      ${GREEN}localhost:3307${NC}"
    echo -e "  Listings MySQL: ${GREEN}localhost:3308${NC}"
    echo -e "  Payments MySQL: ${GREEN}localhost:3309${NC}"
    echo -e "  Profile MySQL:  ${GREEN}localhost:3310${NC}"
    echo -e "  Redis:          ${GREEN}localhost:6379${NC}"
    echo -e "  NATS:           ${GREEN}localhost:4222${NC}"
}

# Function to show logs
show_logs() {
    echo ""
    echo -e "${YELLOW}💡 To view logs:${NC}"
    echo -e "  All services: ${GREEN}docker-compose logs -f${NC}"
    echo -e "  Specific:     ${GREEN}docker-compose logs -f [service-name]${NC}"
    echo -e "  Example:      ${GREEN}docker-compose logs -f frontend${NC}"
}

# Main execution
main() {
    check_docker
    
    if [[ "$VERSION" != "latest" ]]; then
        pull_images
    fi
    
    start_services
    show_status
    show_logs
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE} Running version: ${VERSION}${NC}"
}

# Handle interruption
trap 'echo -e "\n${YELLOW}⚠️  Deployment interrupted${NC}"; exit 1' INT

# Run main function
main
