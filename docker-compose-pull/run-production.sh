#!/bin/bash

# Auction Website - Docker Pull and Run Script
# This script pulls the latest images from Docker Hub and runs the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Configuration
COMPOSE_FILE="docker-compose-production.yml"
ENV_FILE=".env.production"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_info " Starting Auction Website Docker Pull and Run"
print_info "Script directory: $SCRIPT_DIR"

# Change to script directory
cd "$SCRIPT_DIR"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE not found"
    if [ -f ".env.production.template" ]; then
        print_info "Copying template environment file..."
        cp .env.production.template "$ENV_FILE"
        print_error "Please edit $ENV_FILE with your production values before running this script again"
        exit 1
    else
        print_error "No environment template found. Please create $ENV_FILE manually"
        exit 1
    fi
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "Docker compose file $COMPOSE_FILE not found"
    exit 1
fi

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_status "Docker is running"
}

# Function to pull all images
pull_images() {
    print_info " Pulling latest images from Docker Hub..."
    
    # List of services to pull
    services=(
        "pramithamj/auction-website-ms-api-gateway"
        "pramithamj/auction-website-ms-auth"
        "pramithamj/auction-website-ms-bid"
        "pramithamj/auction-website-ms-listing"
        "pramithamj/auction-website-ms-payment"
        "pramithamj/auction-website-ms-profile"
        "pramithamj/auction-website-ms-email"
        "pramithamj/auction-website-ms-saga-orchestrator"
        "pramithamj/auction-website-ms-expiration"
        "pramithamj/auction-website-ms-frontend"
    )
    
    # Get IMAGE_TAG from environment file
    if [ -f "$ENV_FILE" ]; then
        IMAGE_TAG=$(grep "^IMAGE_TAG=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
        if [ -z "$IMAGE_TAG" ]; then
            IMAGE_TAG="latest"
        fi
    else
        IMAGE_TAG="latest"
    fi
    
    print_info "Using image tag: $IMAGE_TAG"
    
    for service in "${services[@]}"; do
        print_info "Pulling ${service}:${IMAGE_TAG}..."
        if docker pull "${service}:${IMAGE_TAG}"; then
            print_status "Successfully pulled ${service}:${IMAGE_TAG}"
        else
            print_error "Failed to pull ${service}:${IMAGE_TAG}"
            exit 1
        fi
    done
    
    # Pull infrastructure images
    print_info "Pulling infrastructure images..."
    docker pull mysql:8.0
    docker pull redis:7-alpine
    docker pull nats-streaming:0.24.6
    docker pull jaegertracing/all-in-one:1.49
    
    print_status "All images pulled successfully"
}

# Function to stop existing containers
stop_containers() {
    print_info " Stopping existing containers..."
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q | grep -q .; then
        docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
        print_status "Existing containers stopped"
    else
        print_info "No existing containers found"
    fi
}

# Function to start services
start_services() {
    print_info " Starting services..."
    
    # Start infrastructure services first
    print_info "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d \
        nats-streaming redis jaeger \
        auth-mysql bid-mysql listings-mysql payments-mysql profile-mysql
    
    # Wait for databases to be ready
    print_info "Waiting for databases to be ready..."
    sleep 30
    
    # Start application services
    print_info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    print_status "All services started"
}

# Function to show service status
show_status() {
    print_info " Service Status:"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    
    echo ""
    print_info " Application URLs:"
    
    # Get server IP from environment
    if [ -f "$ENV_FILE" ]; then
        SERVER_IP=$(grep "^SERVER_IP=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
        FRONTEND_PORT=$(grep "^FRONTEND_PORT=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
        API_GATEWAY_PORT=$(grep "^API_GATEWAY_PORT=" "$ENV_FILE" | cut -d '=' -f2 | tr -d '"' | tr -d "'")
        
        if [ -n "$SERVER_IP" ]; then
            echo -e "  ${GREEN}Frontend:${NC} http://$SERVER_IP:${FRONTEND_PORT:-3000}"
            echo -e "  ${GREEN}API Gateway:${NC} http://$SERVER_IP:${API_GATEWAY_PORT:-3001}"
            echo -e "  ${GREEN}Jaeger UI:${NC} http://$SERVER_IP:16686"
        else
            echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
            echo -e "  ${GREEN}API Gateway:${NC} http://localhost:3001"
            echo -e "  ${GREEN}Jaeger UI:${NC} http://localhost:16686"
        fi
    else
        echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
        echo -e "  ${GREEN}API Gateway:${NC} http://localhost:3001"
        echo -e "  ${GREEN}Jaeger UI:${NC} http://localhost:16686"
    fi
    
    echo ""
    print_info " Logs:"
    echo "  View logs: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f [service-name]"
    echo "  View all logs: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f"
    
    echo ""
    print_info " Stop services:"
    echo "  docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down"
}

# Function to clean up old images
cleanup_images() {
    print_info "🧹 Cleaning up old Docker images..."
    docker image prune -f
    print_status "Cleanup completed"
}

# Main execution
main() {
    print_info "Starting deployment process..."
    
    check_docker
    
    # Parse command line arguments
    PULL_ONLY=false
    SKIP_PULL=false
    CLEANUP=false
    
    for arg in "$@"; do
        case $arg in
            --pull-only)
                PULL_ONLY=true
                shift
                ;;
            --skip-pull)
                SKIP_PULL=true
                shift
                ;;
            --cleanup)
                CLEANUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --pull-only    Only pull images, don't start services"
                echo "  --skip-pull    Skip pulling images, only start services"
                echo "  --cleanup      Clean up old Docker images after deployment"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $arg"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    if [ "$SKIP_PULL" = false ]; then
        pull_images
    fi
    
    if [ "$PULL_ONLY" = false ]; then
        stop_containers
        start_services
        sleep 10  # Give services time to start
        show_status
    fi
    
    if [ "$CLEANUP" = true ]; then
        cleanup_images
    fi
    
    print_status " Deployment completed successfully!"
}

# Run main function with all arguments
main "$@"
