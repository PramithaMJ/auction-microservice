#!/bin/bash

# Test script to validate environment configuration
# Run this after configuring your environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Environment Configuration Test ===${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED} .env file not found!${NC}"
    echo "Run ./configure-env.sh to create your environment configuration"
    exit 1
fi

echo -e "${GREEN} .env file found${NC}"

# Load environment variables
set -a
source .env
set +a

# Test function
test_config() {
    local name="$1"
    local value="$2"
    local required="$3"
    
    if [ -z "$value" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED} $name is not set (required)${NC}"
            return 1
        else
            echo -e "${YELLOW}⚠️  $name is not set (optional)${NC}"
            return 0
        fi
    else
        echo -e "${GREEN} $name = $value${NC}"
        return 0
    fi
}

echo ""
echo "Frontend Configuration:"
test_config "NEXT_PUBLIC_API_URL" "$NEXT_PUBLIC_API_URL" "false"
test_config "NEXT_PUBLIC_API_GATEWAY_PORT" "$NEXT_PUBLIC_API_GATEWAY_PORT" "false"
test_config "FRONTEND_PORT" "$FRONTEND_PORT" "false"

echo ""
echo "API Gateway Configuration:"
test_config "API_GATEWAY_PORT" "$API_GATEWAY_PORT" "false"
test_config "CORS_ORIGIN" "$CORS_ORIGIN" "true"
test_config "SERVER_API_URL" "$SERVER_API_URL" "false"

echo ""
echo "Security Configuration:"
test_config "JWT_KEY" "${JWT_KEY:0:10}..." "true"
test_config "MYSQL_ROOT_PASSWORD" "${MYSQL_ROOT_PASSWORD:0:5}..." "true"
test_config "MYSQL_PASSWORD" "${MYSQL_PASSWORD:0:5}..." "true"

echo ""
echo "Service URLs that will be used:"

# Determine API URL based on configuration priority
if [ ! -z "$NEXT_PUBLIC_API_URL" ]; then
    API_URL="$NEXT_PUBLIC_API_URL"
    echo -e "${BLUE}API URL (from NEXT_PUBLIC_API_URL): $API_URL${NC}"
elif [ ! -z "$NEXT_PUBLIC_API_GATEWAY_PORT" ]; then
    echo -e "${BLUE}API URL (dynamic): http://[current-hostname]:$NEXT_PUBLIC_API_GATEWAY_PORT${NC}"
else
    DEFAULT_PORT="${API_GATEWAY_PORT:-3001}"
    echo -e "${BLUE}API URL (default): http://localhost:$DEFAULT_PORT${NC}"
fi

FRONTEND_URL="http://localhost:${FRONTEND_PORT:-3000}"
echo -e "${BLUE}Frontend URL: $FRONTEND_URL${NC}"

echo ""
echo "Testing Docker Compose configuration..."

# Test docker-compose config
if docker-compose config > /dev/null 2>&1; then
    echo -e "${GREEN} Docker Compose configuration is valid${NC}"
else
    echo -e "${RED} Docker Compose configuration has errors${NC}"
    echo "Run: docker-compose config"
    exit 1
fi

echo ""
echo "Quick validation complete!"
echo ""
echo "To start the application:"
echo "  docker-compose up -d"
echo ""
echo "To test connectivity after startup:"
echo "  curl http://localhost:${API_GATEWAY_PORT:-3001}/health"
echo "  curl $FRONTEND_URL"
