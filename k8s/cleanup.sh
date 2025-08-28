#!/bin/bash

# Auction Website Kubernetes Cleanup Script
# This script removes all auction website resources from Kubernetes

set -e

echo "🧹 Starting Auction Website Kubernetes Cleanup..."

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

# Confirm deletion
read -p "Are you sure you want to delete all auction website resources? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleanup cancelled."
    exit 0
fi

print_warning "Starting cleanup in 5 seconds... Press Ctrl+C to cancel"
sleep 5

# Delete ingress first
print_status "Removing ingress..."
kubectl delete -f ingress/ --ignore-not-found=true

# Delete application services
print_status "Removing application services..."
kubectl delete -f deployments/ --ignore-not-found=true

# Delete infrastructure services
print_status "Removing infrastructure services..."
kubectl delete -f infrastucture/ --ignore-not-found=true

# Delete configmaps and secrets
print_status "Removing configmaps and secrets..."
kubectl delete -f configmaps/ --ignore-not-found=true
kubectl delete -f secrets/ --ignore-not-found=true

# Delete persistent volume claims
print_status "Removing persistent volume claims..."
kubectl delete pvc --all -n auction-infrastructure --ignore-not-found=true
kubectl delete pvc --all -n auction-system --ignore-not-found=true

# Delete namespaces (this will delete everything in them)
print_status "Removing namespaces..."
kubectl delete namespace auction-system --ignore-not-found=true
kubectl delete namespace auction-infrastructure --ignore-not-found=true

print_success "🎉 Cleanup completed successfully!"
print_status "All auction website resources have been removed from the cluster."
