#!/bin/bash

# Minikube Deployment Script for Auction Website
# This script deploys the entire auction website microservices architecture to Minikube

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE_INFRA="auction-infrastructure"
NAMESPACE_APP="auction-system"
MINIKUBE_PROFILE="auction-cluster"
MINIKUBE_MEMORY="8192"
MINIKUBE_CPUS="4"

echo -e "${BLUE}🚀 Starting Minikube Deployment for Auction Website${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

if ! command_exists kubectl; then
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

if ! command_exists minikube; then
    print_error "minikube is not installed. Please install minikube first."
    exit 1
fi

if ! command_exists docker; then
    print_error "docker is not installed. Please install docker first."
    exit 1
fi

print_status "All prerequisites are installed"

# Check if Minikube is running
echo -e "${BLUE}🔍 Checking Minikube status...${NC}"

if ! minikube status -p $MINIKUBE_PROFILE >/dev/null 2>&1; then
    echo -e "${YELLOW}Starting Minikube cluster...${NC}"
    minikube start \
        --profile=$MINIKUBE_PROFILE \
        --memory=$MINIKUBE_MEMORY \
        --cpus=$MINIKUBE_CPUS \
        --driver=docker \
        --kubernetes-version=v1.28.0
    
    print_status "Minikube cluster started"
else
    print_status "Minikube cluster is already running"
fi

# Set kubectl context
kubectl config use-context $MINIKUBE_PROFILE

# Enable required addons
echo -e "${BLUE}🔧 Enabling Minikube addons...${NC}"
minikube addons enable ingress -p $MINIKUBE_PROFILE
minikube addons enable ingress-dns -p $MINIKUBE_PROFILE
minikube addons enable storage-provisioner -p $MINIKUBE_PROFILE
minikube addons enable default-storageclass -p $MINIKUBE_PROFILE
print_status "Minikube addons enabled"

# Wait for ingress controller to be ready
echo -e "${BLUE}⏳ Waiting for ingress controller to be ready...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s

print_status "Ingress controller is ready"

# Get Minikube IP
MINIKUBE_IP=$(minikube ip -p $MINIKUBE_PROFILE)
print_status "Minikube IP: $MINIKUBE_IP"

# Deploy Kubernetes resources
echo -e "${BLUE}📦 Deploying Kubernetes resources...${NC}"

# 1. Create namespaces
echo "Creating namespaces..."
kubectl apply -f k8s/namespaces.yaml
print_status "Namespaces created"

# 2. Create storage class
echo "Creating storage class..."
kubectl apply -f k8s/infrastucture/storageclass.yaml
print_status "Storage class created"

# 3. Create secrets
echo "Creating secrets..."
kubectl apply -f k8s/secrets/auction-secrets.yaml
print_status "Secrets created"

# 4. Create configmaps
echo "Creating configmaps..."
kubectl apply -f k8s/configmaps/
print_status "ConfigMaps created"

# 5. Create PVCs
echo "Creating persistent volume claims..."
kubectl apply -f k8s/infrastucture/mysql-pvcs.yaml
print_status "PVCs created"

# 6. Deploy infrastructure services
echo "Deploying infrastructure services..."
kubectl apply -f k8s/infrastucture/redis.yaml
kubectl apply -f k8s/infrastucture/nats-streaming.yaml

# Deploy MySQL databases
kubectl apply -f k8s/infrastucture/auth-mysql.yaml
kubectl apply -f k8s/infrastucture/bid-mysql.yaml
kubectl apply -f k8s/infrastucture/listings-mysql.yaml
kubectl apply -f k8s/infrastucture/payments-mysql.yaml
kubectl apply -f k8s/infrastucture/profile-mysql.yaml

print_status "Infrastructure services deployed"

# Wait for infrastructure to be ready
echo -e "${BLUE}⏳ Waiting for infrastructure services to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=nats-streaming -n $NAMESPACE_INFRA --timeout=300s

# Wait for MySQL databases
echo "Waiting for MySQL databases to be ready..."
kubectl wait --for=condition=ready pod -l app=auth-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=bid-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=listings-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=payments-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=profile-mysql -n $NAMESPACE_INFRA --timeout=300s

print_status "Infrastructure services are ready"

# 7. Deploy application services
echo "Deploying application services..."
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/

print_status "Application services deployed"

# 8. Deploy ingress
echo "Deploying ingress..."
kubectl apply -f k8s/ingress/auction-ingress.yaml
print_status "Ingress deployed"

# Wait for application services to be ready
echo -e "${BLUE}⏳ Waiting for application services to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=auth -n $NAMESPACE_APP --timeout=300s
kubectl wait --for=condition=ready pod -l app=frontend -n $NAMESPACE_APP --timeout=300s
kubectl wait --for=condition=ready pod -l app=api-gateway -n $NAMESPACE_APP --timeout=300s

print_status "Application services are ready"

# Configure local DNS (add entries to /etc/hosts)
echo -e "${BLUE}🌐 Configuring local DNS...${NC}"
print_warning "You may need to add the following entries to your /etc/hosts file:"
echo "$MINIKUBE_IP auction.local"
echo "$MINIKUBE_IP api.auction.local"

# Display access information
echo -e "${GREEN}"
echo "=============================================="
echo "🎉 Deployment completed successfully!"
echo "=============================================="
echo -e "${NC}"

echo -e "${BLUE}📍 Access Information:${NC}"
echo "Minikube IP: $MINIKUBE_IP"
echo "Frontend URL: http://auction.local"
echo "API Gateway URL: http://api.auction.local"
echo ""

echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Add the following to your /etc/hosts file:"
echo "   $MINIKUBE_IP auction.local"
echo "   $MINIKUBE_IP api.auction.local"
echo ""
echo "2. Access the application:"
echo "   Frontend: http://auction.local"
echo "   API: http://api.auction.local"
echo ""

echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "View pods: kubectl get pods -A"
echo "View services: kubectl get svc -A"
echo "View ingress: kubectl get ingress -n $NAMESPACE_APP"
echo "Minikube dashboard: minikube dashboard -p $MINIKUBE_PROFILE"
echo "View logs: kubectl logs -f deployment/[service-name] -n $NAMESPACE_APP"
echo ""

echo -e "${BLUE}🔍 Troubleshooting:${NC}"
echo "Check ingress: kubectl describe ingress auction-ingress -n $NAMESPACE_APP"
echo "Check services: kubectl get endpoints -n $NAMESPACE_APP"
echo "Restart deployment: kubectl rollout restart deployment/[service-name] -n $NAMESPACE_APP"

print_status "Deployment script completed!"
