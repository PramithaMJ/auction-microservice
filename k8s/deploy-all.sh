#!/bin/bash

# Complete Kubernetes Deployment Script for Auction Website
# This script deploys the entire auction website infrastructure and applications

set -e

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WAIT_TIMEOUT=300
INFRASTRUCTURE_NS="auction-infrastructure"
SYSTEM_NS="auction-system"

# Functions
log_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC} ${CYAN}$1${NC} ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

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

log_step() {
    echo -e "${CYAN}🔹 $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
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
    
    # Check if we're in the right directory
    if [[ ! -f "infrastucture/storageclass.yaml" ]]; then
        log_error "Please run this script from the k8s directory"
        log_info "Usage: cd k8s && ./deploy-all.sh"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Wait for pods to be ready
wait_for_pods() {
    local label="$1"
    local namespace="$2"
    local timeout="${3:-$WAIT_TIMEOUT}"
    local description="$4"
    
    log_step "Waiting for $description..."
    
    if kubectl wait --for=condition=ready pod -l "$label" -n "$namespace" --timeout="${timeout}s" &>/dev/null; then
        log_success "$description ready"
    else
        log_warning "$description not ready within timeout, continuing..."
    fi
}

# Create namespaces
create_namespaces() {
    log_step "Creating namespaces..."
    
    kubectl create namespace $INFRASTRUCTURE_NS --dry-run=client -o yaml | kubectl apply -f -
    kubectl create namespace $SYSTEM_NS --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Namespaces created"
}

# Deploy storage
deploy_storage() {
    log_step "Deploying storage components..."
    
    # Handle existing StorageClass
    if kubectl get storageclass auction-fast-ssd &>/dev/null; then
        log_warning "StorageClass 'auction-fast-ssd' already exists, skipping creation"
    else
        kubectl apply -f infrastucture/storageclass.yaml
        log_success "StorageClass created"
    fi
    
    # Create PVCs
    kubectl apply -f infrastucture/mysql-pvcs.yaml
    log_success "Persistent Volume Claims created"
    
    # Wait a moment for PVCs to be bound
    sleep 5
}

# Deploy MySQL databases
deploy_mysql() {
    log_step "Deploying MySQL databases..."
    
    # Deploy all MySQL instances
    kubectl apply -f infrastucture/auth-mysql.yaml
    kubectl apply -f infrastucture/bid-mysql.yaml
    kubectl apply -f infrastucture/listings-mysql.yaml
    kubectl apply -f infrastucture/payments-mysql.yaml
    kubectl apply -f infrastucture/profile-mysql.yaml
    
    log_success "MySQL deployments created"
    
    # Wait for MySQL pods to be ready
    wait_for_pods "app=auth-mysql" "$INFRASTRUCTURE_NS" 300 "Auth MySQL"
    wait_for_pods "app=bid-mysql" "$INFRASTRUCTURE_NS" 300 "Bid MySQL"
    wait_for_pods "app=listings-mysql" "$INFRASTRUCTURE_NS" 300 "Listings MySQL"
    wait_for_pods "app=payments-mysql" "$INFRASTRUCTURE_NS" 300 "Payments MySQL"
    wait_for_pods "app=profile-mysql" "$INFRASTRUCTURE_NS" 300 "Profile MySQL"
}

# Deploy message broker and cache
deploy_messaging() {
    log_step "Deploying NATS Streaming and Redis..."
    
    # Deploy NATS Streaming
    kubectl apply -f infrastucture/nats-streaming.yaml
    wait_for_pods "app=nats-streaming" "$INFRASTRUCTURE_NS" 180 "NATS Streaming"
    
    # Deploy Redis
    kubectl apply -f infrastucture/redis.yaml
    wait_for_pods "app=redis" "$INFRASTRUCTURE_NS" 180 "Redis"
    
    log_success "Messaging infrastructure deployed"
}

# Deploy configuration
deploy_configuration() {
    log_step "Deploying configuration and secrets..."
    
    # Apply ConfigMaps
    kubectl apply -f configmaps/auction-configmap.yaml
    
    # Apply MySQL init scripts if they exist
    if [[ -f "configmaps/mysql-init-scripts.yaml" ]]; then
        kubectl apply -f configmaps/mysql-init-scripts.yaml
    fi
    
    # Apply Secrets
    kubectl apply -f secrets/auction-secrets.yaml
    
    log_success "Configuration deployed"
}

# Deploy core microservices
deploy_microservices() {
    log_step "Deploying microservices..."
    
    # Core business services
    local core_services=("auth" "bid" "listings" "payments" "profile")
    for service in "${core_services[@]}"; do
        kubectl apply -f "deployments/${service}.yaml"
        log_info "Deployed $service service"
    done
    
    # Wait for core services to be ready
    log_step "Waiting for core services to be ready..."
    for service in "${core_services[@]}"; do
        wait_for_pods "app=$service" "$SYSTEM_NS" 240 "$service service"
    done
    
    # Support services
    local support_services=("email" "expiration" "saga-orchestrator")
    for service in "${support_services[@]}"; do
        kubectl apply -f "deployments/${service}.yaml"
        log_info "Deployed $service service"
    done
    
    # Wait for support services
    for service in "${support_services[@]}"; do
        wait_for_pods "app=$service" "$SYSTEM_NS" 180 "$service service"
    done
    
    log_success "Microservices deployed"
}

# Deploy API Gateway
deploy_api_gateway() {
    log_step "Deploying API Gateway..."
    
    kubectl apply -f deployments/api-gateway.yaml
    wait_for_pods "app=api-gateway" "$SYSTEM_NS" 180 "API Gateway"
    
    log_success "API Gateway deployed"
}

# Deploy Frontend
deploy_frontend() {
    log_step "Deploying Frontend application..."
    
    kubectl apply -f deployments/frontend.yaml
    wait_for_pods "app=frontend" "$SYSTEM_NS" 240 "Frontend"
    
    log_success "Frontend deployed"
}

# Create Kubernetes services
deploy_services() {
    log_step "Creating Kubernetes services..."
    
    kubectl apply -f services/api-gateway-service.yaml
    kubectl apply -f services/frontend-service.yaml
    kubectl apply -f services/microservices-services.yaml
    
    log_success "Services created"
}

# Deploy ingress
deploy_ingress() {
    log_step "Setting up ingress..."
    
    # Check if NGINX Ingress Controller exists
    if ! kubectl get pods -n ingress-nginx -l app.kubernetes.io/component=controller &> /dev/null; then
        log_warning "NGINX Ingress Controller not found"
        log_info "For Minikube: minikube addons enable ingress"
        log_info "For AWS EKS: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml"
        log_info "For other clouds: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml"
    fi
    
    kubectl apply -f ingress/auction-ingress.yaml
    log_success "Ingress configured"
}

# Display deployment status
show_deployment_status() {
    log_header "Deployment Status"
    
    echo ""
    echo -e "${CYAN}📊 Infrastructure Pods:${NC}"
    kubectl get pods -n $INFRASTRUCTURE_NS -o wide 2>/dev/null || echo "No infrastructure pods found"
    
    echo ""
    echo -e "${CYAN}📊 Application Pods:${NC}"
    kubectl get pods -n $SYSTEM_NS -o wide 2>/dev/null || echo "No application pods found"
    
    echo ""
    echo -e "${CYAN}🌐 Services:${NC}"
    kubectl get svc -n $SYSTEM_NS 2>/dev/null || echo "No services found"
    
    echo ""
    echo -e "${CYAN}🔗 Ingress:${NC}"
    kubectl get ingress -n $SYSTEM_NS 2>/dev/null || echo "No ingress found"
    
    echo ""
    echo -e "${CYAN}💾 Storage:${NC}"
    kubectl get pvc -n $INFRASTRUCTURE_NS 2>/dev/null || echo "No PVCs found"
}

# Show access information
show_access_info() {
    log_header "Access Information"
    
    echo ""
    echo -e "${GREEN}🚀 Application Access Options:${NC}"
    echo ""
    
    # Get ingress IP if available
    local ingress_ip=$(kubectl get ingress auction-ingress -n $SYSTEM_NS -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    local ingress_hostname=$(kubectl get ingress auction-ingress -n $SYSTEM_NS -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "")
    
    if [[ -n "$ingress_ip" ]]; then
        echo -e "${CYAN}🌍 Via Ingress (IP):${NC}"
        echo "  Frontend: http://$ingress_ip/"
        echo "  API:      http://$ingress_ip/api"
    elif [[ -n "$ingress_hostname" ]]; then
        echo -e "${CYAN}🌍 Via Ingress (Hostname):${NC}"
        echo "  Frontend: http://$ingress_hostname/"
        echo "  API:      http://$ingress_hostname/api"
    else
        echo -e "${YELLOW}🌍 Ingress IP not yet assigned${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}🔌 Via Port Forward (Local Access):${NC}"
    echo "  kubectl port-forward svc/frontend-service 3000:3000 -n $SYSTEM_NS"
    echo "  kubectl port-forward svc/api-gateway-service 3001:3001 -n $SYSTEM_NS"
    echo ""
    echo "  Then access:"
    echo "  Frontend: http://localhost:3000"
    echo "  API:      http://localhost:3001"
    
    echo ""
    echo -e "${CYAN}🔍 Monitoring Commands:${NC}"
    echo "  kubectl get pods -n $SYSTEM_NS"
    echo "  kubectl logs -f deployment/api-gateway -n $SYSTEM_NS"
    echo "  kubectl logs -f deployment/frontend -n $SYSTEM_NS"
}

# Health check
perform_health_check() {
    log_header "Health Check"
    
    log_step "Checking pod health..."
    
    # Check infrastructure pods
    local infra_ready=0
    local infra_total=0
    while IFS= read -r line; do
        if [[ $line == *"Running"* && $line == *"1/1"* ]]; then
            ((infra_ready++))
        fi
        ((infra_total++))
    done < <(kubectl get pods -n $INFRASTRUCTURE_NS --no-headers 2>/dev/null)
    
    # Check application pods
    local app_ready=0
    local app_total=0
    while IFS= read -r line; do
        if [[ $line == *"Running"* && $line == *"1/1"* ]]; then
            ((app_ready++))
        fi
        ((app_total++))
    done < <(kubectl get pods -n $SYSTEM_NS --no-headers 2>/dev/null)
    
    echo ""
    echo -e "${CYAN}📈 Health Summary:${NC}"
    echo "  Infrastructure: $infra_ready/$infra_total pods ready"
    echo "  Application:    $app_ready/$app_total pods ready"
    
    if [[ $infra_ready -eq $infra_total && $app_ready -eq $app_total && $infra_total -gt 0 && $app_total -gt 0 ]]; then
        log_success "All pods are healthy!"
    elif [[ $infra_total -eq 0 || $app_total -eq 0 ]]; then
        log_warning "No pods found - deployment may still be in progress"
    else
        log_warning "Some pods are not ready - check logs for issues"
    fi
}

# Main deployment function
main() {
    # Banner
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║            🏛️  AUCTION WEBSITE DEPLOYMENT 🏛️                ║"
    echo "║                                                              ║"
    echo "║              Complete Kubernetes Deployment                  ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    local start_time=$(date +%s)
    
    # Deployment steps
    check_prerequisites
    create_namespaces
    deploy_storage
    deploy_mysql
    deploy_messaging
    deploy_configuration
    deploy_microservices
    deploy_api_gateway
    deploy_frontend
    deploy_services
    deploy_ingress
    
    # Wait a moment for everything to settle
    log_step "Waiting for final stabilization..."
    sleep 10
    
    # Show results
    show_deployment_status
    perform_health_check
    show_access_info
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_header "Deployment Complete!"
    echo ""
    log_success "🎉 Auction Website deployed successfully!"
    log_info "⏱️  Total deployment time: ${duration} seconds"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Wait for all pods to be fully ready (may take a few more minutes)"
    echo "2. Access the application using the methods shown above"
    echo "3. Check logs if any issues occur"
    echo "4. Update DNS records if using custom domain"
    echo ""
    echo -e "${BLUE}Troubleshooting:${NC}"
    echo "  kubectl get events --sort-by='.lastTimestamp' -n $SYSTEM_NS"
    echo "  kubectl describe pod <pod-name> -n $SYSTEM_NS"
    echo ""
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
