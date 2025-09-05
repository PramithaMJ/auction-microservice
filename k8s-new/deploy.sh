#!/bin/bash

# Kubernetes Deployment Script for Auction Microservices
# This script deploys the complete auction microservices application to Kubernetes

set -e

# Colors for output
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
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_status "Starting deployment of Auction Microservices to Kubernetes..."

# Navigate to k8s-new directory
cd "$(dirname "$0")"

# Deploy in order
print_status "1. Creating namespace..."
kubectl apply -f 00-namespace.yaml

print_status "2. Creating ConfigMaps..."
kubectl apply -f 01-configmap.yaml

print_status "3. Creating Secrets..."
kubectl apply -f 02-secrets.yaml

print_status "4. Creating Persistent Volume Claims..."
kubectl apply -f 03-persistent-volumes.yaml

print_status "5. Deploying MySQL databases..."
kubectl apply -f 04-mysql-deployments.yaml

print_status "6. Deploying infrastructure services (NATS, Redis, Jaeger)..."
kubectl apply -f 05-infrastructure-deployments.yaml

print_status "7. Waiting for infrastructure services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/nats-streaming -n auction
kubectl wait --for=condition=available --timeout=300s deployment/redis -n auction
kubectl wait --for=condition=available --timeout=300s deployment/jaeger -n auction

print_status "8. Waiting for MySQL databases to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/auth-mysql -n auction
kubectl wait --for=condition=available --timeout=300s deployment/bid-mysql -n auction
kubectl wait --for=condition=available --timeout=300s deployment/listings-mysql -n auction
kubectl wait --for=condition=available --timeout=300s deployment/payments-mysql -n auction
kubectl wait --for=condition=available --timeout=300s deployment/profile-mysql -n auction

print_status "9. Deploying application services..."
kubectl apply -f 06-app-deployments.yaml

print_status "10. Creating services..."
kubectl apply -f 07-services.yaml

print_status "11. Creating ingress (if NGINX ingress controller is available)..."
if kubectl get ingressclass nginx &> /dev/null; then
    kubectl apply -f 08-ingress.yaml
    print_success "Ingress created successfully"
else
    print_warning "NGINX ingress controller not found. Skipping ingress creation."
    print_warning "You can access services using NodePort services or port-forwarding."
fi

print_status "12. Waiting for application services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n auction
kubectl wait --for=condition=available --timeout=300s deployment/auth -n auction
kubectl wait --for=condition=available --timeout=300s deployment/bid -n auction
kubectl wait --for=condition=available --timeout=300s deployment/listings -n auction
kubectl wait --for=condition=available --timeout=300s deployment/payments -n auction
kubectl wait --for=condition=available --timeout=300s deployment/profile -n auction
kubectl wait --for=condition=available --timeout=300s deployment/email -n auction
kubectl wait --for=condition=available --timeout=300s deployment/saga-orchestrator -n auction
kubectl wait --for=condition=available --timeout=300s deployment/expiration -n auction
kubectl wait --for=condition=available --timeout=300s deployment/frontend -n auction

print_success "Deployment completed successfully!"

echo ""
print_status "Checking deployment status..."
kubectl get pods -n auction

echo ""
print_status "Service endpoints:"
kubectl get svc -n auction

echo ""
print_status "Access Information:"
print_status "===================="

# Get node IP for NodePort services
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')
if [ -z "$NODE_IP" ]; then
    NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
fi

echo -e "${GREEN}Frontend:${NC} http://$NODE_IP:30000"
echo -e "${GREEN}API Gateway:${NC} http://$NODE_IP:30001"
echo -e "${GREEN}Jaeger UI:${NC} http://$NODE_IP:30686"

if kubectl get ingress -n auction &> /dev/null; then
    echo ""
    print_status "Ingress endpoints (add these to your /etc/hosts file):"
    echo "$NODE_IP auction.local"
    echo "$NODE_IP api.auction.local"
    echo "$NODE_IP jaeger.auction.local"
fi

echo ""
print_status "To view logs of a specific service, use:"
print_status "kubectl logs -f deployment/<service-name> -n auction"

echo ""
print_status "To access services via port-forwarding:"
print_status "kubectl port-forward svc/frontend 3000:3000 -n auction"
print_status "kubectl port-forward svc/api-gateway 3001:3001 -n auction"
print_status "kubectl port-forward svc/jaeger 16686:16686 -n auction"

print_success "Auction Microservices deployment completed!"
