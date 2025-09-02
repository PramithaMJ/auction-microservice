#!/bin/bash

# Optimized Minikube Restart Script for Intel Xeon Hardware
# This script restarts Minikube with optimized settings for your 8 vCPU Intel Xeon instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MINIKUBE_PROFILE="auction-cluster"

echo -e "${BLUE} Restarting Minikube with optimized settings for your hardware${NC}"
echo -e "${BLUE}💻 Detected: 8 vCPUs, Intel Xeon E5-2666 v3${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  $1${NC}"
}

print_error() {
    echo -e "${RED} $1${NC}"
}

# Stop existing cluster if running
echo -e "${BLUE} Stopping existing Minikube cluster...${NC}"
minikube stop -p $MINIKUBE_PROFILE 2>/dev/null || true
print_status "Cluster stopped"

# Clean up any problematic state
echo -e "${BLUE}🧹 Cleaning up cluster state...${NC}"
minikube delete -p $MINIKUBE_PROFILE 2>/dev/null || true
print_status "Cluster state cleaned"

# Get available memory (use 75% for better stability)
if command -v free >/dev/null 2>&1; then
    TOTAL_MEM=$(free -m | grep Mem | awk '{print $2}')
    AVAILABLE_MEM=$(echo "$TOTAL_MEM * 0.75" | bc | cut -d. -f1)
else
    # Fallback for systems without 'free' command
    AVAILABLE_MEM=6144
fi

echo -e "${BLUE} Total memory: ${TOTAL_MEM}MB, Using: ${AVAILABLE_MEM}MB${NC}"

# Start Minikube with optimized settings for your hardware
echo -e "${BLUE} Starting Minikube with optimized configuration...${NC}"
minikube start \
  --driver=docker \
  --cpus=6 \
  --memory="${AVAILABLE_MEM}mb" \
  --disk-size=30g \
  --kubernetes-version=v1.28.0 \
  --extra-config=apiserver.request-timeout=600s \
  --extra-config=controller-manager.node-monitor-grace-period=120s \
  --extra-config=controller-manager.node-monitor-period=30s \
  --extra-config=kubelet.housekeeping-interval=30s \
  --extra-config=kubelet.node-status-update-frequency=20s \
  --extra-config=apiserver.service-node-port-range=30000-32767 \
  --cache-images=true \
  -p $MINIKUBE_PROFILE

print_status "Minikube started successfully"

# Configure kubectl context
kubectl config use-context $MINIKUBE_PROFILE
print_status "kubectl context configured"

# Enable required addons
echo -e "${BLUE} Enabling Minikube addons...${NC}"
minikube addons enable ingress -p $MINIKUBE_PROFILE
minikube addons enable ingress-dns -p $MINIKUBE_PROFILE
minikube addons enable storage-provisioner -p $MINIKUBE_PROFILE
minikube addons enable default-storageclass -p $MINIKUBE_PROFILE
minikube addons enable metrics-server -p $MINIKUBE_PROFILE

print_status "All addons enabled"

# Wait for system to stabilize
echo -e "${BLUE}⏳ Waiting for cluster to stabilize...${NC}"
sleep 30

# Wait for ingress controller to be ready
echo -e "${BLUE}⏳ Waiting for ingress controller...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s || print_warning "Ingress controller took longer than expected"

# Verify cluster health
echo -e "${BLUE} Verifying cluster health...${NC}"
kubectl get nodes
kubectl get pods -n kube-system

# Get Minikube IP
MINIKUBE_IP=$(minikube ip -p $MINIKUBE_PROFILE)
echo -e "${GREEN} Minikube IP: $MINIKUBE_IP${NC}"

echo -e "${GREEN}"
echo "=============================================="
echo "🎉 Minikube cluster is ready for deployment!"
echo "=============================================="
echo -e "${NC}"

echo -e "${BLUE} Next Steps:${NC}"
echo "1. Deploy your application: ./scripts/deploy-minikube.sh"
echo "2. Monitor deployment: ./scripts/monitor-minikube.sh"
echo "3. Configure external access: ./scripts/configure-external-access.sh"
echo ""

echo -e "${BLUE} Useful Commands:${NC}"
echo "Dashboard: minikube dashboard -p $MINIKUBE_PROFILE"
echo "SSH to node: minikube ssh -p $MINIKUBE_PROFILE"
echo "Stop cluster: minikube stop -p $MINIKUBE_PROFILE"
echo ""

print_status "Optimized Minikube setup completed!"
