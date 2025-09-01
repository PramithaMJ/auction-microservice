#!/bin/bash

# Pre-deployment check script for Auction Website Kubernetes deployment
# This script verifies that all required files exist before starting deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
missing_files=0
total_checks=0

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if file exists
check_file() {
    local file="$1"
    local description="$2"
    
    total_checks=$((total_checks + 1))
    
    if [[ -f "$file" ]]; then
        log_success "$description: $file"
    else
        log_error "$description: $file (MISSING)"
        missing_files=$((missing_files + 1))
    fi
}

# Check if directory exists
check_dir() {
    local dir="$1"
    local description="$2"
    
    total_checks=$((total_checks + 1))
    
    if [[ -d "$dir" ]]; then
        log_success "$description: $dir"
    else
        log_error "$description: $dir (MISSING)"
        missing_files=$((missing_files + 1))
    fi
}

# Main check function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              Pre-deployment Verification Check              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    log_info "Checking if all required Kubernetes files exist..."
    echo ""
    
    # Check directories
    log_info "=== Checking Directories ==="
    check_dir "configmaps" "ConfigMaps directory"
    check_dir "deployments" "Deployments directory"
    check_dir "infrastucture" "Infrastructure directory"
    check_dir "ingress" "Ingress directory"
    check_dir "secrets" "Secrets directory"
    check_dir "services" "Services directory"
    
    echo ""
    log_info "=== Checking Infrastructure Files ==="
    check_file "infrastucture/storageclass.yaml" "Storage Class"
    check_file "infrastucture/mysql-pvcs.yaml" "MySQL PVCs"
    check_file "infrastucture/auth-mysql.yaml" "Auth MySQL"
    check_file "infrastucture/bid-mysql.yaml" "Bid MySQL"
    check_file "infrastucture/listings-mysql.yaml" "Listings MySQL"
    check_file "infrastucture/payments-mysql.yaml" "Payments MySQL"
    check_file "infrastucture/profile-mysql.yaml" "Profile MySQL"
    check_file "infrastucture/nats-streaming.yaml" "NATS Streaming"
    check_file "infrastucture/redis.yaml" "Redis"
    
    echo ""
    log_info "=== Checking Configuration Files ==="
    check_file "configmaps/auction-configmap.yaml" "Auction ConfigMap"
    check_file "secrets/auction-secrets.yaml" "Auction Secrets"
    
    echo ""
    log_info "=== Checking Deployment Files ==="
    check_file "deployments/auth.yaml" "Auth Service"
    check_file "deployments/bid.yaml" "Bid Service"
    check_file "deployments/listings.yaml" "Listings Service"
    check_file "deployments/payments.yaml" "Payments Service"
    check_file "deployments/profile.yaml" "Profile Service"
    check_file "deployments/email.yaml" "Email Service"
    check_file "deployments/expiration.yaml" "Expiration Service"
    check_file "deployments/saga-orchestrator.yaml" "Saga Orchestrator"
    check_file "deployments/api-gateway.yaml" "API Gateway"
    check_file "deployments/frontend.yaml" "Frontend"
    
    echo ""
    log_info "=== Checking Service Files ==="
    check_file "services/api-gateway-service.yaml" "API Gateway Service"
    check_file "services/frontend-service.yaml" "Frontend Service"
    check_file "services/microservices-services.yaml" "Microservices Services"
    
    echo ""
    log_info "=== Checking Ingress Files ==="
    check_file "ingress/auction-ingress.yaml" "Auction Ingress"
    
    echo ""
    log_info "=== Checking Scripts ==="
    check_file "deploy-all.sh" "Deployment Script"
    check_file "cleanup.sh" "Cleanup Script"
    
    # Optional files check
    echo ""
    log_info "=== Checking Optional Files ==="
    if [[ -f "configmaps/mysql-init-scripts.yaml" ]]; then
        log_success "MySQL Init Scripts: configmaps/mysql-init-scripts.yaml"
    else
        log_warning "MySQL Init Scripts: configmaps/mysql-init-scripts.yaml (OPTIONAL - not found)"
    fi
    
    # Summary
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                         Summary                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    
    if [[ $missing_files -eq 0 ]]; then
        log_success "All $total_checks required files are present! ✨"
        echo ""
        log_info "You can now run the deployment:"
        echo "  ./deploy-all.sh"
        exit 0
    else
        log_error "$missing_files out of $total_checks files are missing!"
        echo ""
        log_warning "Please ensure all required files exist before running deployment."
        log_info "You can check the main repository or documentation for missing files."
        exit 1
    fi
}

# Check if running from correct directory
if [[ ! -f "deploy-all.sh" ]]; then
    log_error "This script must be run from the k8s directory"
    log_info "Usage: cd k8s && ./pre-check.sh"
    exit 1
fi

# Run main function
main "$@"
