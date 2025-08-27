#!/bin/bash

# Expiration Service Monitoring Script
# This script helps monitor and manage the expiration service

set -e

# Configuration
EXPIRATION_HEALTH_URL="http://localhost:8080"
REDIS_CONTAINER="auction-redis"
EXPIRATION_CONTAINER="auction-expiration"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if container is running
check_container() {
    local container=$1
    if docker ps --filter "name=${container}" --format "table {{.Names}}" | grep -q "${container}"; then
        return 0
    else
        return 1
    fi
}

# Function to check service health
check_health() {
    print_status $BLUE " Checking expiration service health..."
    
    if ! check_container $EXPIRATION_CONTAINER; then
        print_status $RED "❌ Expiration container is not running"
        return 1
    fi
    
    # Try to get health status
    local health_response
    if health_response=$(curl -s "${EXPIRATION_HEALTH_URL}/health" 2>/dev/null); then
        local healthy=$(echo "$health_response" | grep -o '"healthy":[^,]*' | cut -d':' -f2)
        if [[ "$healthy" == "true" ]]; then
            print_status $GREEN "✅ Expiration service is healthy"
            return 0
        else
            print_status $YELLOW "⚠️  Expiration service is unhealthy"
            echo "$health_response" | jq '.' 2>/dev/null || echo "$health_response"
            return 1
        fi
    else
        print_status $RED "❌ Cannot connect to expiration service health endpoint"
        return 1
    fi
}

# Function to check queue status
check_queue() {
    print_status $BLUE "📊 Checking queue status..."
    
    local queue_response
    if queue_response=$(curl -s "${EXPIRATION_HEALTH_URL}/queue-status" 2>/dev/null); then
        echo "$queue_response" | jq '.' 2>/dev/null || echo "$queue_response"
    else
        print_status $RED "❌ Cannot get queue status"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    print_status $BLUE "🔴 Checking Redis status..."
    
    if ! check_container $REDIS_CONTAINER; then
        print_status $RED "❌ Redis container is not running"
        return 1
    fi
    
    # Check Redis connection
    if docker exec $REDIS_CONTAINER redis-cli ping >/dev/null 2>&1; then
        print_status $GREEN "✅ Redis is responding"
        
        # Check for failed expiration jobs
        local failed_jobs=$(docker exec $REDIS_CONTAINER redis-cli ZCARD bull:listing:expiration:failed 2>/dev/null || echo "0")
        if [[ "$failed_jobs" -gt 0 ]]; then
            print_status $YELLOW "⚠️  Found $failed_jobs failed expiration jobs"
        else
            print_status $GREEN "✅ No failed expiration jobs"
        fi
        
        return 0
    else
        print_status $RED "❌ Redis is not responding"
        return 1
    fi
}

# Function to restart expiration service
restart_service() {
    print_status $YELLOW "🔄 Restarting expiration service..."
    docker restart $EXPIRATION_CONTAINER
    
    # Wait for service to start
    sleep 10
    
    if check_health; then
        print_status $GREEN "✅ Expiration service restarted successfully"
    else
        print_status $RED "❌ Expiration service failed to restart properly"
    fi
}

# Function to clean up failed jobs
cleanup_failed_jobs() {
    print_status $YELLOW "🧹 Cleaning up failed expiration jobs..."
    
    # Use the health endpoint to trigger cleanup
    local cleanup_response
    if cleanup_response=$(curl -s -X POST "${EXPIRATION_HEALTH_URL}/cleanup" \
        -H "Content-Type: application/json" \
        -d '{"retryFailedJobs": true, "maxRetryAttempts": 3}' 2>/dev/null); then
        print_status $GREEN "✅ Cleanup triggered successfully"
        echo "$cleanup_response" | jq '.' 2>/dev/null || echo "$cleanup_response"
    else
        print_status $RED "❌ Failed to trigger cleanup"
        print_status $YELLOW "🔧 Trying manual Redis cleanup..."
        
        # Manual Redis cleanup as fallback
        docker exec $REDIS_CONTAINER redis-cli ZREM bull:listing:expiration:failed $(docker exec $REDIS_CONTAINER redis-cli ZRANGE bull:listing:expiration:failed 0 -1)
        print_status $GREEN "✅ Manual Redis cleanup completed"
    fi
}

# Function to show logs
show_logs() {
    local lines=${1:-50}
    print_status $BLUE "📋 Showing last $lines lines of expiration service logs..."
    docker logs $EXPIRATION_CONTAINER --tail $lines
}

# Function to emergency cleanup
emergency_cleanup() {
    print_status $RED "🚨 Starting emergency cleanup..."
    
    # Try API first
    local cleanup_response
    if cleanup_response=$(curl -s -X POST "${EXPIRATION_HEALTH_URL}/cleanup" \
        -H "Content-Type: application/json" \
        -d '{"emergency": true}' 2>/dev/null); then
        print_status $GREEN "✅ Emergency cleanup via API successful"
        echo "$cleanup_response" | jq '.' 2>/dev/null || echo "$cleanup_response"
    else
        print_status $YELLOW "⚠️  API cleanup failed, using direct Redis cleanup..."
        
        # Direct Redis cleanup
        docker exec $REDIS_CONTAINER redis-cli FLUSHDB
        print_status $GREEN "✅ Redis database flushed"
        
        # Restart service
        restart_service
    fi
}

# Main menu
show_menu() {
    echo ""
    print_status $BLUE "🔧 Expiration Service Monitor"
    echo "1. Check service health"
    echo "2. Check queue status" 
    echo "3. Check Redis status"
    echo "4. Show logs"
    echo "5. Restart service"
    echo "6. Cleanup failed jobs"
    echo "7. Emergency cleanup"
    echo "8. Full status check"
    echo "9. Exit"
    echo ""
}

# Full status check
full_status() {
    print_status $BLUE "🔍 Running full status check..."
    echo ""
    
    check_health
    echo ""
    check_redis
    echo ""
    check_queue
    echo ""
    
    print_status $BLUE "📊 Container status:"
    docker ps --filter "name=auction-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Main script logic
case "${1:-menu}" in
    "health")
        check_health
        ;;
    "queue")
        check_queue
        ;;
    "redis")
        check_redis
        ;;
    "logs")
        show_logs "${2:-50}"
        ;;
    "restart")
        restart_service
        ;;
    "cleanup")
        cleanup_failed_jobs
        ;;
    "emergency")
        emergency_cleanup
        ;;
    "status")
        full_status
        ;;
    "menu"|*)
        while true; do
            show_menu
            read -p "Choose an option (1-9): " choice
            
            case $choice in
                1) check_health ;;
                2) check_queue ;;
                3) check_redis ;;
                4) 
                    read -p "Number of log lines to show (default 50): " lines
                    show_logs "${lines:-50}"
                    ;;
                5) restart_service ;;
                6) cleanup_failed_jobs ;;
                7) 
                    read -p "Are you sure you want to do emergency cleanup? (y/N): " confirm
                    if [[ $confirm == [yY] ]]; then
                        emergency_cleanup
                    fi
                    ;;
                8) full_status ;;
                9) 
                    print_status $GREEN "👋 Goodbye!"
                    exit 0
                    ;;
                *) 
                    print_status $RED "❌ Invalid option"
                    ;;
            esac
            echo ""
            read -p "Press Enter to continue..."
        done
        ;;
esac
