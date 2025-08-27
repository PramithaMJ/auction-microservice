#!/bin/bash

# Kubernetes Status and Monitoring Script
# This script provides comprehensive status of auction website deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
DETAILED=false
WATCH_MODE=false
LOGS_SERVICE=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

print_subheader() {
    echo -e "${PURPLE}--- $1 ---${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|staging|production) [default: development]"
    echo "  -d, --detailed          Show detailed information including resource usage"
    echo "  -w, --watch             Watch mode - continuously update status"
    echo "  -l, --logs SERVICE      Show logs for a specific service"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Basic status for development"
    echo "  $0 -e production -d     # Detailed status for production"
    echo "  $0 -w                   # Watch mode"
    echo "  $0 -l api-gateway       # Show API gateway logs"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -d|--detailed)
            DETAILED=true
            shift
            ;;
        -w|--watch)
            WATCH_MODE=true
            shift
            ;;
        -l|--logs)
            LOGS_SERVICE="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

# Function to show service logs
show_logs() {
    local service=$1
    print_header "Logs for $service"
    
    if kubectl get deployment $service -n auction-system &> /dev/null; then
        kubectl logs -f deployment/$service -n auction-system
    else
        print_error "Service $service not found in auction-system namespace"
        print_status "Available services:"
        kubectl get deployments -n auction-system --no-headers | awk '{print $1}'
        exit 1
    fi
}

# Function to get pod status with colors
get_pod_status() {
    local namespace=$1
    local detailed=$2
    
    if [[ "$detailed" == true ]]; then
        kubectl get pods -n $namespace -o wide
        echo ""
        print_subheader "Resource Usage in $namespace"
        kubectl top pods -n $namespace 2>/dev/null || print_warning "Metrics server not available"
    else
        kubectl get pods -n $namespace
    fi
}

# Function to check service health
check_service_health() {
    local namespace=$1
    
    print_subheader "Service Health Check"
    
    # Get all services and their endpoints
    kubectl get endpoints -n $namespace
    
    echo ""
    print_subheader "Service Status"
    kubectl get services -n $namespace
}

# Function to show ingress information
show_ingress_info() {
    print_subheader "Ingress Information"
    
    if kubectl get ingress -n auction-system &> /dev/null; then
        kubectl get ingress -n auction-system
        
        # Get ingress details
        if [[ "$DETAILED" == true ]]; then
            echo ""
            kubectl describe ingress -n auction-system
        fi
    else
        print_warning "No ingress found"
    fi
}

# Function to show persistent volumes
show_storage_info() {
    print_subheader "Storage Information"
    
    print_status "Persistent Volume Claims:"
    kubectl get pvc -n auction-infrastructure
    
    if [[ "$DETAILED" == true ]]; then
        echo ""
        print_status "Persistent Volumes:"
        kubectl get pv
    fi
}

# Function to show events
show_events() {
    print_subheader "Recent Events"
    
    print_status "Events in auction-system:"
    kubectl get events -n auction-system --sort-by='.lastTimestamp' | tail -10
    
    echo ""
    print_status "Events in auction-infrastructure:"
    kubectl get events -n auction-infrastructure --sort-by='.lastTimestamp' | tail -10
}

# Function to show comprehensive status
show_status() {
    clear
    print_header "Auction Website Kubernetes Status"
    print_status "Environment: $ENVIRONMENT"
    print_status "Timestamp: $(date)"
    
    echo ""
    print_header "Infrastructure Services (auction-infrastructure)"
    get_pod_status "auction-infrastructure" "$DETAILED"
    
    echo ""
    print_header "Application Services (auction-system)"
    get_pod_status "auction-system" "$DETAILED"
    
    echo ""
    check_service_health "auction-system"
    
    echo ""
    show_ingress_info
    
    if [[ "$DETAILED" == true ]]; then
        echo ""
        show_storage_info
        
        echo ""
        show_events
        
        echo ""
        print_subheader "Node Information"
        kubectl get nodes -o wide
        
        echo ""
        print_subheader "Cluster Resource Usage"
        kubectl top nodes 2>/dev/null || print_warning "Metrics server not available"
    fi
    
    echo ""
    print_header "Quick Health Summary"
    
    # Count running pods
    local total_app_pods=$(kubectl get pods -n auction-system --no-headers | wc -l | tr -d ' ')
    local running_app_pods=$(kubectl get pods -n auction-system --no-headers | grep "Running" | wc -l | tr -d ' ')
    local total_infra_pods=$(kubectl get pods -n auction-infrastructure --no-headers | wc -l | tr -d ' ')
    local running_infra_pods=$(kubectl get pods -n auction-infrastructure --no-headers | grep "Running" | wc -l | tr -d ' ')
    
    print_status "Application Services: $running_app_pods/$total_app_pods running"
    print_status "Infrastructure Services: $running_infra_pods/$total_infra_pods running"
    
    # Check if all are running
    if [[ "$running_app_pods" -eq "$total_app_pods" ]] && [[ "$running_infra_pods" -eq "$total_infra_pods" ]]; then
        echo -e "${GREEN}✓ All services are running${NC}"
    else
        echo -e "${YELLOW}⚠ Some services may have issues${NC}"
    fi
}

# Main execution
main() {
    # Show logs if requested
    if [[ -n "$LOGS_SERVICE" ]]; then
        show_logs "$LOGS_SERVICE"
        exit 0
    fi
    
    # Watch mode
    if [[ "$WATCH_MODE" == true ]]; then
        print_status "Starting watch mode (press Ctrl+C to exit)..."
        while true; do
            show_status
            sleep 10
        done
    else
        show_status
    fi
}

# Run main function
main
