#!/bin/bash

# Kubernetes Deployment Script for Auction Website
# This script deploys the auction microservices with proper dependency ordering

set -e

echo "🚀 Starting Kubernetes deployment for Auction Website..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Set the base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../k8s" && pwd)"
echo "Base directory: $BASE_DIR"

print_status "Step 1: Creating namespaces..."
kubectl apply -f "$BASE_DIR/namespaces.yaml"

print_status "Step 2: Applying ConfigMaps..."
kubectl apply -f "$BASE_DIR/configmaps/"

print_status "Step 3: Applying Secrets..."
kubectl apply -f "$BASE_DIR/secrets/"

print_status "Step 4: Deploying Infrastructure Services..."

# Deploy PVCs first
print_status "  4.1: Creating Persistent Volume Claims..."
kubectl apply -f "$BASE_DIR/infrastucture/mysql-pvcs.yaml"
kubectl apply -f "$BASE_DIR/infrastucture/storageclass.yaml"

# Deploy supporting infrastructure
print_status "  4.2: Deploying NATS Streaming..."
kubectl apply -f "$BASE_DIR/infrastucture/nats-streaming.yaml"

print_status "  4.3: Deploying Redis..."
kubectl apply -f "$BASE_DIR/infrastucture/redis.yaml"

print_status "  4.4: Deploying Jaeger..."
kubectl apply -f "$BASE_DIR/infrastucture/jaeger.yaml"

print_status "Step 5: Deploying MySQL Databases..."
kubectl apply -f "$BASE_DIR/infrastucture/auth-mysql.yaml"
kubectl apply -f "$BASE_DIR/infrastucture/bid-mysql.yaml"
kubectl apply -f "$BASE_DIR/infrastucture/listings-mysql.yaml"
kubectl apply -f "$BASE_DIR/infrastucture/payments-mysql.yaml"
kubectl apply -f "$BASE_DIR/infrastucture/profile-mysql.yaml"

print_status "Step 6: Waiting for databases to be ready..."
print_warning "Waiting 60 seconds for MySQL instances to initialize..."
sleep 60

# Check MySQL readiness
print_status "  6.1: Checking MySQL readiness..."
kubectl wait --for=condition=ready pod -l app=auth-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=bid-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=listings-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=payments-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=profile-mysql -n auction-infrastructure --timeout=300s

print_status "Step 7: Deploying Application Services..."

# Deploy core services first
print_status "  7.1: Deploying Auth Service..."
kubectl apply -f "$BASE_DIR/deployments/auth.yaml"

print_status "  7.2: Deploying other core services..."
kubectl apply -f "$BASE_DIR/deployments/bid.yaml"
kubectl apply -f "$BASE_DIR/deployments/listings.yaml"
kubectl apply -f "$BASE_DIR/deployments/payments.yaml"
kubectl apply -f "$BASE_DIR/deployments/profile.yaml"

print_status "  7.3: Deploying support services..."
kubectl apply -f "$BASE_DIR/deployments/email.yaml"
kubectl apply -f "$BASE_DIR/deployments/expiration.yaml"
kubectl apply -f "$BASE_DIR/deployments/saga-orchestrator.yaml"

print_status "Step 8: Deploying Services (ClusterIP, LoadBalancer)..."
kubectl apply -f "$BASE_DIR/services/"

print_status "Step 9: Waiting for services to be ready..."
sleep 30

print_status "Step 10: Deploying API Gateway..."
kubectl apply -f "$BASE_DIR/deployments/api-gateway.yaml"

print_status "Step 11: Deploying Frontend..."
kubectl apply -f "$BASE_DIR/deployments/frontend.yaml"

print_status "Step 12: Applying Ingress..."
if [ -d "$BASE_DIR/ingress" ] && [ "$(ls -A $BASE_DIR/ingress)" ]; then
    kubectl apply -f "$BASE_DIR/ingress/"
else
    print_warning "No ingress configurations found, skipping..."
fi

print_status "Step 13: Deployment Summary..."
echo ""
echo "📊 Deployment Status:"
echo "===================="

# Check namespace status
echo ""
echo "Namespaces:"
kubectl get namespaces | grep auction

echo ""
echo "Infrastructure Pods:"
kubectl get pods -n auction-infrastructure

echo ""
echo "Application Pods:"
kubectl get pods -n auction-system

echo ""
echo "Services:"
kubectl get services -n auction-system
kubectl get services -n auction-infrastructure

echo ""
echo "LoadBalancer Services (External IPs):"
kubectl get services -n auction-system --field-selector spec.type=LoadBalancer

print_status "✅ Deployment completed successfully!"
echo ""
echo "🔍 To monitor the deployment:"
echo "  kubectl get pods -n auction-system -w"
echo "  kubectl get pods -n auction-infrastructure -w"
echo ""
echo "🌐 To get external IPs:"
echo "  kubectl get services -n auction-system --field-selector spec.type=LoadBalancer"
echo ""
echo "📋 To check logs:"
echo "  kubectl logs -f deployment/api-gateway -n auction-system"
echo "  kubectl logs -f deployment/frontend -n auction-system"
