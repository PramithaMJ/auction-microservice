#!/bin/bash

# Kubernetes Cleanup Script for Auction Microservices
# This script removes all auction microservices resources from Kubernetes

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

print_warning "This will delete ALL auction microservices resources from Kubernetes!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleanup cancelled."
    exit 1
fi

print_status "Starting cleanup of Auction Microservices from Kubernetes..."

# Navigate to k8s-new directory
cd "$(dirname "$0")"

# Delete in reverse order
print_status "1. Deleting ingress..."
kubectl delete -f 08-ingress.yaml --ignore-not-found=true

print_status "2. Deleting services..."
kubectl delete -f 07-services.yaml --ignore-not-found=true

print_status "3. Deleting application deployments..."
kubectl delete -f 06-app-deployments.yaml --ignore-not-found=true

print_status "4. Deleting infrastructure deployments..."
kubectl delete -f 05-infrastructure-deployments.yaml --ignore-not-found=true

print_status "5. Deleting MySQL deployments..."
kubectl delete -f 04-mysql-deployments.yaml --ignore-not-found=true

print_status "6. Deleting persistent volume claims..."
kubectl delete -f 03-persistent-volumes.yaml --ignore-not-found=true

print_status "7. Deleting secrets..."
kubectl delete -f 02-secrets.yaml --ignore-not-found=true

print_status "8. Deleting configmaps..."
kubectl delete -f 01-configmap.yaml --ignore-not-found=true

print_status "9. Deleting namespace (this may take a while)..."
kubectl delete -f 00-namespace.yaml --ignore-not-found=true

print_status "Waiting for namespace to be fully deleted..."
kubectl wait --for=delete namespace/auction --timeout=300s || true

print_success "Cleanup completed successfully!"

print_status "Verifying cleanup..."
if kubectl get namespace auction &> /dev/null; then
    print_warning "Namespace 'auction' still exists. It may take some time to fully delete."
else
    print_success "Namespace 'auction' has been deleted."
fi
