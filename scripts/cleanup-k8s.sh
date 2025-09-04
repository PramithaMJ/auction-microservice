#!/bin/bash

# Kubernetes Cleanup Script for Auction Website
# This script safely removes all auction-related resources

set -e

echo "🧹 Starting Kubernetes cleanup for Auction Website..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Ask for confirmation
echo "⚠️  This will delete ALL auction website resources from Kubernetes!"
echo "This includes:"
echo "  - All deployments and pods"
echo "  - All services"
echo "  - All persistent volumes and data"
echo "  - All configmaps and secrets"
echo "  - Both namespaces (auction-system and auction-infrastructure)"
echo ""
read -p "Are you sure you want to proceed? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    print_warning "Cleanup cancelled."
    exit 0
fi

print_status "Step 1: Deleting application deployments..."
kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/deployments/ --ignore-not-found=true

print_status "Step 2: Deleting services..."
kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/services/ --ignore-not-found=true

print_status "Step 3: Deleting ingress..."
if [ -d "/Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/ingress" ]; then
    kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/ingress/ --ignore-not-found=true
fi

print_status "Step 4: Deleting infrastructure..."
kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/infrastucture/ --ignore-not-found=true

print_status "Step 5: Deleting secrets..."
kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/secrets/ --ignore-not-found=true

print_status "Step 6: Deleting configmaps..."
kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/configmaps/ --ignore-not-found=true

print_status "Step 7: Deleting namespaces..."
kubectl delete -f /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s/namespaces.yaml --ignore-not-found=true

print_status "Step 8: Waiting for cleanup to complete..."
sleep 10

# Check if any resources remain
print_status "Step 9: Checking for remaining resources..."
echo ""
echo "Remaining auction namespaces:"
kubectl get namespaces | grep auction || echo "✅ No auction namespaces found"

echo ""
echo "Remaining persistent volumes:"
kubectl get pv | grep auction || echo "✅ No auction persistent volumes found"

print_status "✅ Cleanup completed!"
echo ""
echo "All auction website resources have been removed from Kubernetes."
echo "You can now run the deploy script to start fresh."
