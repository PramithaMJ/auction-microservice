#!/bin/bash

# Auction Website Kubernetes Deployment Script
# This script deploys the entire auction microservices system to Kubernetes

set -e

echo "🚀 Starting Auction Website Kubernetes Deployment..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot access Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_success "Kubernetes cluster is accessible"

# Create namespaces first
print_status "Creating namespaces..."
kubectl apply -f 00-namespace.yaml

# Wait for namespaces to be ready
kubectl wait --for=condition=Ready namespace/auction-system --timeout=60s || true
kubectl wait --for=condition=Ready namespace/auction-infrastructure --timeout=60s || true

print_success "Namespaces created successfully"

# Apply secrets and configmaps
print_status "Applying secrets and configmaps..."
kubectl apply -f secrets/
kubectl apply -f configmaps/

print_success "Secrets and configmaps applied"

# Deploy infrastructure services (databases, message queues, cache)
print_status "Deploying infrastructure services..."
kubectl apply -f infrastucture/

print_status "Waiting for infrastructure services to be ready..."

# Wait for NATS
kubectl wait --for=condition=available --timeout=300s deployment/nats-streaming -n auction-infrastructure

# Wait for Redis
kubectl wait --for=condition=available --timeout=300s deployment/redis -n auction-infrastructure

# Wait for MySQL databases
kubectl wait --for=condition=available --timeout=300s deployment/auth-mysql -n auction-infrastructure
kubectl wait --for=condition=available --timeout=300s deployment/bid-mysql -n auction-infrastructure
kubectl wait --for=condition=available --timeout=300s deployment/listings-mysql -n auction-infrastructure
kubectl wait --for=condition=available --timeout=300s deployment/payments-mysql -n auction-infrastructure
kubectl wait --for=condition=available --timeout=300s deployment/profile-mysql -n auction-infrastructure

print_success "Infrastructure services are ready"

# Deploy application services
print_status "Deploying application services..."
kubectl apply -f deployments/

print_status "Waiting for application services to be ready..."

# Wait for core services
kubectl wait --for=condition=available --timeout=300s deployment/auth -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/listings -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/bid -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/payments -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/profile -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/email -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/saga-orchestrator -n auction-system
kubectl wait --for=condition=available --timeout=300s deployment/expiration -n auction-system

# Wait for API Gateway
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n auction-system

# Wait for Frontend
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n auction-system

print_success "Application services are ready"

# Apply ingress
print_status "Applying ingress configuration..."
kubectl apply -f ingress/

print_success "Ingress configuration applied"

# Display deployment status
print_status "Deployment Status:"
echo ""
echo "Infrastructure Services (auction-infrastructure namespace):"
kubectl get pods -n auction-infrastructure
echo ""
echo "Application Services (auction-system namespace):"
kubectl get pods -n auction-system
echo ""
echo "Services:"
kubectl get services -n auction-system
echo ""
echo "Ingress:"
kubectl get ingress -n auction-system

print_success "🎉 Auction Website deployment completed successfully!"
print_status "You can access the application at:"
print_status "- Frontend: http://your-domain.com or http://your-cluster-ip:3000"
print_status "- API Gateway: http://api.your-domain.com or http://your-cluster-ip:3001"

# Show how to get external IPs
print_status "To get external IPs for LoadBalancer services:"
echo "kubectl get services -n auction-system --field-selector spec.type=LoadBalancer"

print_status "To check logs for any service:"
echo "kubectl logs -f deployment/<service-name> -n auction-system"

print_status "To scale services:"
echo "kubectl scale deployment <service-name> --replicas=<number> -n auction-system"
