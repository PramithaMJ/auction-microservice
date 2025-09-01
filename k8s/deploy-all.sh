#!/bin/bash

# Auction Website Kubernetes Deployment Script
# This script automates the deployment of the entire auction website on Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SKIP_INFRASTRUCTURE=${SKIP_INFRASTRUCTURE:-false}
SKIP_WAIT=${SKIP_WAIT:-false}
DRY_RUN=${DRY_RUN:-false}

# Functions
log_info() {
    echo -e "${BLUE}  $1${NC}"
}

log_success() {
    echo -e "${GREEN} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}  $1${NC}"
}

log_error() {
    echo -e "${RED} $1${NC}"
}

# Help function
show_help() {
    cat << EOF
Auction Website Kubernetes Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -s, --skip-infra        Skip infrastructure deployment (MySQL, NATS, Redis)
    -w, --skip-wait         Skip waiting for pods to be ready
    -d, --dry-run          Show commands without executing them
    
EXAMPLES:
    # Full deployment
    $0
    
    # Skip infrastructure (if already deployed)
    $0 --skip-infra
    
    # Dry run to see what would be executed
    $0 --dry-run

ENVIRONMENT VARIABLES:
    SKIP_INFRASTRUCTURE     Set to true to skip infrastructure deployment
    SKIP_WAIT              Set to true to skip waiting for pods
    DRY_RUN                Set to true for dry run mode
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -s|--skip-infra)
            SKIP_INFRASTRUCTURE=true
            shift
            ;;
        -w|--skip-wait)
            SKIP_WAIT=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Execute command (with dry run support)
execute_cmd() {
    local cmd="$1"
    local description="$2"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] $description"
        echo "  Command: $cmd"
    else
        log_info "$description"
        eval "$cmd"
    fi
}

# Wait for pods to be ready
wait_for_pods() {
    local label="$1"
    local namespace="$2"
    local timeout="${3:-300s}"
    
    if [[ "$SKIP_WAIT" == "true" ]]; then
        log_warning "Skipping wait for pods with label $label"
        return 0
    fi
    
    execute_cmd "kubectl wait --for=condition=ready pod -l $label -n $namespace --timeout=$timeout" \
                "Waiting for pods with label '$label' in namespace '$namespace'"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Create namespaces
create_namespaces() {
    log_info "Creating namespaces..."
    
    execute_cmd "kubectl create namespace auction-infrastructure --dry-run=client -o yaml | kubectl apply -f -" \
                "Creating auction-infrastructure namespace"
    
    execute_cmd "kubectl create namespace auction-system --dry-run=client -o yaml | kubectl apply -f -" \
                "Creating auction-system namespace"
    
    log_success "Namespaces created"
}

# Deploy infrastructure
deploy_infrastructure() {
    if [[ "$SKIP_INFRASTRUCTURE" == "true" ]]; then
        log_warning "Skipping infrastructure deployment"
        return 0
    fi
    
    log_info "Deploying infrastructure components..."
    
    # Storage
    execute_cmd "kubectl apply -f k8s/infrastucture/storageclass.yaml" \
                "Applying storage class configuration"
    
    execute_cmd "kubectl apply -f k8s/infrastucture/mysql-pvcs.yaml" \
                "Creating persistent volume claims for MySQL"
    
    # MySQL Databases
    log_info "Deploying MySQL databases..."
    execute_cmd "kubectl apply -f k8s/infrastucture/auth-mysql.yaml" \
                "Deploying Auth MySQL database"
    
    execute_cmd "kubectl apply -f k8s/infrastucture/bid-mysql.yaml" \
                "Deploying Bid MySQL database"
    
    execute_cmd "kubectl apply -f k8s/infrastucture/listings-mysql.yaml" \
                "Deploying Listings MySQL database"
    
    execute_cmd "kubectl apply -f k8s/infrastucture/payments-mysql.yaml" \
                "Deploying Payments MySQL database"
    
    execute_cmd "kubectl apply -f k8s/infrastucture/profile-mysql.yaml" \
                "Deploying Profile MySQL database"
    
    # Wait for MySQL databases
    wait_for_pods "app=auth-mysql" "auction-infrastructure"
    wait_for_pods "app=bid-mysql" "auction-infrastructure"
    wait_for_pods "app=listings-mysql" "auction-infrastructure"
    wait_for_pods "app=payments-mysql" "auction-infrastructure"
    wait_for_pods "app=profile-mysql" "auction-infrastructure"
    
    # NATS Streaming
    execute_cmd "kubectl apply -f k8s/infrastucture/nats-streaming.yaml" \
                "Deploying NATS Streaming server"
    wait_for_pods "app=nats-streaming" "auction-infrastructure"
    
    # Redis
    execute_cmd "kubectl apply -f k8s/infrastucture/redis.yaml" \
                "Deploying Redis cache"
    wait_for_pods "app=redis" "auction-infrastructure"
    
    log_success "Infrastructure deployment completed"
}

# Deploy configuration
deploy_configuration() {
    log_info "Deploying configuration..."
    
    execute_cmd "kubectl apply -f k8s/configmaps/auction-configmap.yaml" \
                "Applying auction configuration"
    
    execute_cmd "kubectl apply -f k8s/configmaps/mysql-init-scripts.yaml" \
                "Applying MySQL initialization scripts"
    
    execute_cmd "kubectl apply -f k8s/secrets/auction-secrets.yaml" \
                "Applying secrets configuration"
    
    log_success "Configuration deployment completed"
}

# Deploy microservices
deploy_microservices() {
    log_info "Deploying microservices..."
    
    # Core services
    local services=("auth" "bid" "listings" "payments" "profile" "email" "expiration" "saga-orchestrator")
    
    for service in "${services[@]}"; do
        execute_cmd "kubectl apply -f k8s/deployments/${service}.yaml" \
                    "Deploying $service service"
    done
    
    # Wait for core services
    for service in "${services[@]}"; do
        wait_for_pods "app=$service" "auction-system"
    done
    
    # API Gateway
    execute_cmd "kubectl apply -f k8s/deployments/api-gateway.yaml" \
                "Deploying API Gateway"
    wait_for_pods "app=api-gateway" "auction-system"
    
    # Frontend
    execute_cmd "kubectl apply -f k8s/deployments/frontend.yaml" \
                "Deploying Frontend application"
    wait_for_pods "app=frontend" "auction-system"
    
    log_success "Microservices deployment completed"
}

# Deploy services
deploy_services() {
    log_info "Deploying Kubernetes services..."
    
    execute_cmd "kubectl apply -f k8s/services/api-gateway-service.yaml" \
                "Creating API Gateway service"
    
    execute_cmd "kubectl apply -f k8s/services/frontend-service.yaml" \
                "Creating Frontend service"
    
    execute_cmd "kubectl apply -f k8s/services/microservices-services.yaml" \
                "Creating microservices services"
    
    log_success "Services deployment completed"
}

# Deploy ingress
deploy_ingress() {
    log_info "Deploying ingress configuration..."
    
    # Check if NGINX Ingress Controller exists
    if ! kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller &> /dev/null; then
        log_warning "NGINX Ingress Controller not found. Please install it first."
        log_info "For Minikube: minikube addons enable ingress"
        log_info "For other clusters: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml"
    fi
    
    execute_cmd "kubectl apply -f k8s/ingress/auction-ingress.yaml" \
                "Applying ingress rules"
    
    log_success "Ingress deployment completed"
}

# Display deployment status
show_status() {
    log_info "Deployment Status:"
    
    echo ""
    echo "=== Infrastructure Pods ==="
    kubectl get pods -n auction-infrastructure 2>/dev/null || log_warning "No infrastructure pods found"
    
    echo ""
    echo "=== Application Pods ==="
    kubectl get pods -n auction-system 2>/dev/null || log_warning "No application pods found"
    
    echo ""
    echo "=== Services ==="
    kubectl get svc -n auction-system 2>/dev/null || log_warning "No services found"
    
    echo ""
    echo "=== Ingress ==="
    kubectl get ingress -n auction-system 2>/dev/null || log_warning "No ingress found"
    
    echo ""
    log_info "To check logs: kubectl logs -f deployment/<service-name> -n auction-system"
    log_info "To access the application: kubectl port-forward svc/frontend-service 3000:3000 -n auction-system"
}

# Main deployment function
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 Auction Website K8s Deployment              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "Running in DRY RUN mode - no actual changes will be made"
    fi
    
    check_prerequisites
    create_namespaces
    deploy_infrastructure
    deploy_configuration
    deploy_microservices
    deploy_services
    deploy_ingress
    
    echo ""
    log_success "🎉 Auction Website deployment completed successfully!"
    
    if [[ "$DRY_RUN" != "true" ]]; then
        show_status
        
        echo ""
        log_info "Next steps:"
        echo "1. Wait for all pods to be running"
        echo "2. Update your DNS/hosts file if using custom domain"
        echo "3. Access the application via ingress or port-forward"
        echo "4. Check logs if any issues occur"
    fi
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
