#!/bin/bash

# Enhanced Kubernetes Deployment Script with Jaeger Support
# This script deploys the complete auction website with distributed tracing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE_INFRA="auction-infrastructure"
NAMESPACE_APP="auction-system"

echo -e "${BLUE}🚀 Starting Enhanced Kubernetes Deployment with Jaeger${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl >/dev/null 2>&1; then
        print_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    print_status "kubectl found"
}

# Function to check if cluster is accessible
check_cluster() {
    if ! kubectl cluster-info >/dev/null 2>&1; then
        print_error "Cannot connect to Kubernetes cluster. Please ensure your cluster is running."
        exit 1
    fi
    print_status "Kubernetes cluster is accessible"
}

# Function to create namespaces
create_namespaces() {
    print_info "Creating namespaces..."
    kubectl apply -f k8s/namespaces.yaml
    print_status "Namespaces created"
}

# Function to deploy infrastructure services (including Jaeger)
deploy_infrastructure() {
    print_info "Deploying infrastructure services..."
    
    # Deploy storage class and PVCs
    kubectl apply -f k8s/infrastucture/storageclass.yaml
    kubectl apply -f k8s/infrastucture/mysql-pvcs.yaml
    
    # Deploy databases
    kubectl apply -f k8s/infrastucture/auth-mysql.yaml
    kubectl apply -f k8s/infrastucture/bid-mysql.yaml
    kubectl apply -f k8s/infrastucture/listings-mysql.yaml
    kubectl apply -f k8s/infrastucture/payments-mysql.yaml
    kubectl apply -f k8s/infrastucture/profile-mysql.yaml
    
    # Deploy message broker and cache
    kubectl apply -f k8s/infrastucture/nats-streaming.yaml
    kubectl apply -f k8s/infrastucture/redis.yaml
    
    # Deploy Jaeger for distributed tracing
    kubectl apply -f k8s/infrastucture/jaeger.yaml
    
    print_status "Infrastructure services deployed"
}

# Function to wait for infrastructure to be ready
wait_for_infrastructure() {
    print_info "Waiting for infrastructure services to be ready..."
    
    # Wait for MySQL databases
    kubectl wait --for=condition=ready pod -l app=auth-mysql -n $NAMESPACE_INFRA --timeout=300s
    kubectl wait --for=condition=ready pod -l app=bid-mysql -n $NAMESPACE_INFRA --timeout=300s
    kubectl wait --for=condition=ready pod -l app=listings-mysql -n $NAMESPACE_INFRA --timeout=300s
    kubectl wait --for=condition=ready pod -l app=payments-mysql -n $NAMESPACE_INFRA --timeout=300s
    kubectl wait --for=condition=ready pod -l app=profile-mysql -n $NAMESPACE_INFRA --timeout=300s
    
    # Wait for Redis
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE_INFRA --timeout=300s
    
    # Wait for NATS
    kubectl wait --for=condition=ready pod -l app=nats-streaming -n $NAMESPACE_INFRA --timeout=300s
    
    # Wait for Jaeger
    kubectl wait --for=condition=ready pod -l app=jaeger -n $NAMESPACE_INFRA --timeout=300s
    
    print_status "Infrastructure services are ready"
}

# Function to deploy configuration
deploy_configuration() {
    print_info "Deploying configuration..."
    kubectl apply -f k8s/configmaps/
    kubectl apply -f k8s/secrets/
    print_status "Configuration deployed"
}

# Function to deploy application services
deploy_applications() {
    print_info "Deploying application services..."
    
    # Deploy microservices
    kubectl apply -f k8s/deployments/auth.yaml
    kubectl apply -f k8s/deployments/bid.yaml
    kubectl apply -f k8s/deployments/listings.yaml
    kubectl apply -f k8s/deployments/payments.yaml
    kubectl apply -f k8s/deployments/profile.yaml
    kubectl apply -f k8s/deployments/email.yaml
    kubectl apply -f k8s/deployments/expiration.yaml
    kubectl apply -f k8s/deployments/saga-orchestrator.yaml
    kubectl apply -f k8s/deployments/api-gateway.yaml
    kubectl apply -f k8s/deployments/frontend.yaml
    
    print_status "Application services deployed"
}

# Function to deploy services and ingress
deploy_networking() {
    print_info "Deploying networking..."
    kubectl apply -f k8s/services/
    
    if [ -f "k8s/ingress/auction-ingress.yaml" ]; then
        kubectl apply -f k8s/ingress/
        print_status "Ingress deployed"
    else
        print_warning "Ingress configuration not found, skipping..."
    fi
    
    print_status "Networking deployed"
}

# Function to wait for applications to be ready
wait_for_applications() {
    print_info "Waiting for application services to be ready..."
    
    # Wait for each service to have at least one ready pod
    services=("auth" "bid" "listings" "payments" "profile" "email" "expiration" "saga-orchestrator" "api-gateway" "frontend")
    
    for service in "${services[@]}"; do
        print_info "Waiting for $service service..."
        kubectl wait --for=condition=ready pod -l app=$service -n $NAMESPACE_APP --timeout=300s
        print_status "$service service is ready"
    done
    
    print_status "All application services are ready"
}

# Function to show deployment status
show_status() {
    echo ""
    echo -e "${BLUE}📊 Deployment Status${NC}"
    echo ""
    
    echo -e "${CYAN}Infrastructure Services:${NC}"
    kubectl get pods -n $NAMESPACE_INFRA -o wide
    
    echo ""
    echo -e "${CYAN}Application Services:${NC}"
    kubectl get pods -n $NAMESPACE_APP -o wide
    
    echo ""
    echo -e "${CYAN}Services:${NC}"
    kubectl get svc -n $NAMESPACE_APP
    
    echo ""
    echo -e "${CYAN}External Access:${NC}"
    
    # Check for LoadBalancer or NodePort services
    API_GATEWAY_SERVICE=$(kubectl get svc api-gateway-service -n $NAMESPACE_APP -o jsonpath='{.spec.type}')
    FRONTEND_SERVICE=$(kubectl get svc frontend-service -n $NAMESPACE_APP -o jsonpath='{.spec.type}' 2>/dev/null || echo "ClusterIP")
    
    if [ "$API_GATEWAY_SERVICE" = "LoadBalancer" ]; then
        API_GATEWAY_IP=$(kubectl get svc api-gateway-service -n $NAMESPACE_APP -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        if [ -n "$API_GATEWAY_IP" ]; then
            echo -e "API Gateway: ${GREEN}http://$API_GATEWAY_IP:3001${NC}"
        else
            echo -e "API Gateway: ${YELLOW}Waiting for LoadBalancer IP...${NC}"
        fi
    elif [ "$API_GATEWAY_SERVICE" = "NodePort" ]; then
        NODE_PORT=$(kubectl get svc api-gateway-service -n $NAMESPACE_APP -o jsonpath='{.spec.ports[0].nodePort}')
        echo -e "API Gateway: ${GREEN}http://<node-ip>:$NODE_PORT${NC}"
    fi
    
    # Show Jaeger UI access
    JAEGER_NODE_PORT=$(kubectl get svc jaeger-ui -n $NAMESPACE_INFRA -o jsonpath='{.spec.ports[0].nodePort}')
    echo -e "Jaeger UI: ${GREEN}http://<node-ip>:$JAEGER_NODE_PORT${NC}"
}

# Function to show helpful commands
show_helpful_commands() {
    echo ""
    echo -e "${BLUE}🔧 Helpful Commands${NC}"
    echo ""
    echo -e "${CYAN}Monitor pods:${NC}"
    echo "kubectl get pods -n $NAMESPACE_APP -w"
    echo ""
    echo -e "${CYAN}Check logs:${NC}"
    echo "kubectl logs -f deployment/api-gateway -n $NAMESPACE_APP"
    echo "kubectl logs -f deployment/frontend -n $NAMESPACE_APP"
    echo ""
    echo -e "${CYAN}Access Jaeger UI:${NC}"
    echo "kubectl port-forward svc/jaeger-ui 16686:16686 -n $NAMESPACE_INFRA"
    echo "Then visit: http://localhost:16686"
    echo ""
    echo -e "${CYAN}Access services locally:${NC}"
    echo "kubectl port-forward svc/api-gateway-service 3001:3001 -n $NAMESPACE_APP"
    echo "kubectl port-forward svc/frontend-service 3000:3000 -n $NAMESPACE_APP"
    echo ""
    echo -e "${CYAN}Debug:${NC}"
    echo "kubectl describe pod <pod-name> -n $NAMESPACE_APP"
    echo "kubectl exec -it <pod-name> -n $NAMESPACE_APP -- /bin/sh"
}

# Main deployment function
main() {
    echo -e "${BLUE}Starting deployment...${NC}"
    
    # Check prerequisites
    check_kubectl
    check_cluster
    
    # Deploy in order
    create_namespaces
    deploy_infrastructure
    wait_for_infrastructure
    deploy_configuration
    deploy_applications
    deploy_networking
    wait_for_applications
    
    # Show results
    show_status
    show_helpful_commands
    
    echo ""
    print_status "Deployment completed successfully!"
    echo -e "${CYAN}🎉 Your auction website with Jaeger tracing is now running!${NC}"
}

# Run main function
main
