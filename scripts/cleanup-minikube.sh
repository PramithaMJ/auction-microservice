#!/bin/bash

# Minikube Cleanup Script for Auction Website
# This script cleans up the auction website deployment from Minikube

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

echo -e "${BLUE}🧹 Starting Minikube Cleanup for Auction Website${NC}"

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

# Check if kubectl is available
if ! command -v kubectl >/dev/null 2>&1; then
    print_error "kubectl is not installed"
    exit 1
fi

# Check if minikube profile exists
if ! minikube status -p $MINIKUBE_PROFILE >/dev/null 2>&1; then
    print_warning "Minikube profile '$MINIKUBE_PROFILE' is not running"
    exit 0
fi

# Set kubectl context
kubectl config use-context $MINIKUBE_PROFILE

echo -e "${BLUE}🗑️  Cleaning up Kubernetes resources...${NC}"

# Remove ingress
echo "Removing ingress..."
kubectl delete -f k8s/ingress/auction-ingress.yaml --ignore-not-found=true
print_status "Ingress removed"

# Remove services
echo "Removing services..."
kubectl delete -f k8s/services/ --ignore-not-found=true
print_status "Services removed"

# Remove deployments
echo "Removing deployments..."
kubectl delete -f k8s/deployments/ --ignore-not-found=true
print_status "Deployments removed"

# Remove infrastructure
echo "Removing infrastructure services..."
kubectl delete -f k8s/infrastucture/auth-mysql.yaml --ignore-not-found=true
kubectl delete -f k8s/infrastucture/bid-mysql.yaml --ignore-not-found=true
kubectl delete -f k8s/infrastucture/listings-mysql.yaml --ignore-not-found=true
kubectl delete -f k8s/infrastucture/payments-mysql.yaml --ignore-not-found=true
kubectl delete -f k8s/infrastucture/profile-mysql.yaml --ignore-not-found=true
kubectl delete -f k8s/infrastucture/redis.yaml --ignore-not-found=true
kubectl delete -f k8s/infrastucture/nats-streaming.yaml --ignore-not-found=true
print_status "Infrastructure services removed"

# Remove PVCs
echo "Removing persistent volume claims..."
kubectl delete -f k8s/infrastucture/mysql-pvcs.yaml --ignore-not-found=true
print_status "PVCs removed"

# Remove configmaps
echo "Removing configmaps..."
kubectl delete -f k8s/configmaps/ --ignore-not-found=true
print_status "ConfigMaps removed"

# Remove secrets
echo "Removing secrets..."
kubectl delete -f k8s/secrets/auction-secrets.yaml --ignore-not-found=true
print_status "Secrets removed"

# Remove storage class
echo "Removing storage class..."
kubectl delete -f k8s/infrastucture/storageclass.yaml --ignore-not-found=true
print_status "Storage class removed"

# Remove namespaces (this will also remove any remaining resources)
echo "Removing namespaces..."
kubectl delete namespace $NAMESPACE_APP --ignore-not-found=true
kubectl delete namespace $NAMESPACE_INFRA --ignore-not-found=true
print_status "Namespaces removed"

echo -e "${GREEN}"
echo "=============================================="
echo "🎉 Cleanup completed successfully!"
echo "=============================================="
echo -e "${NC}"

echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. To stop Minikube completely:"
echo "   minikube stop -p $MINIKUBE_PROFILE"
echo ""
echo "2. To delete the Minikube cluster:"
echo "   minikube delete -p $MINIKUBE_PROFILE"
echo ""
echo "3. To remove /etc/hosts entries (if added):"
echo "   Remove lines containing 'auction.local' and 'api.auction.local'"
echo ""

print_status "Cleanup script completed!"
