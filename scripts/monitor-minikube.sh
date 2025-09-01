#!/bin/bash

# Minikube Status and Monitoring Script for Auction Website
# This script provides status information and monitoring for the deployed services

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
MINIKUBE_PROFILE="auction-cluster"

# Function to print headers
print_header() {
    echo -e "${BLUE}=============================================="
    echo -e "$1"
    echo -e "==============================================${NC}"
}

print_subheader() {
    echo -e "${CYAN}📍 $1${NC}"
}

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
    print_error "Minikube profile '$MINIKUBE_PROFILE' is not running"
    print_warning "Run './scripts/deploy-minikube.sh' to start the deployment"
    exit 1
fi

# Set kubectl context
kubectl config use-context $MINIKUBE_PROFILE

print_header "🔍 Auction Website - Minikube Status"

# Get Minikube IP
MINIKUBE_IP=$(minikube ip -p $MINIKUBE_PROFILE)
echo -e "${BLUE}🌐 Minikube IP: ${YELLOW}$MINIKUBE_IP${NC}"
echo ""

# Check cluster status
print_subheader "Cluster Information"
echo "Kubernetes version: $(kubectl version --short --client 2>/dev/null | head -1)"
echo "Minikube profile: $MINIKUBE_PROFILE"
echo "Cluster IP: $MINIKUBE_IP"
echo ""

# Check namespaces
print_subheader "Namespaces"
kubectl get namespaces | grep -E "(auction-|NAME)" || echo "No auction namespaces found"
echo ""

# Check infrastructure services
print_subheader "Infrastructure Services Status"
echo "Namespace: $NAMESPACE_INFRA"
kubectl get pods -n $NAMESPACE_INFRA -o wide 2>/dev/null || echo "No infrastructure pods found"
echo ""

# Check application services
print_subheader "Application Services Status"
echo "Namespace: $NAMESPACE_APP"
kubectl get pods -n $NAMESPACE_APP -o wide 2>/dev/null || echo "No application pods found"
echo ""

# Check services
print_subheader "Services"
echo "Infrastructure Services:"
kubectl get svc -n $NAMESPACE_INFRA 2>/dev/null || echo "No infrastructure services found"
echo ""
echo "Application Services:"
kubectl get svc -n $NAMESPACE_APP 2>/dev/null || echo "No application services found"
echo ""

# Check ingress
print_subheader "Ingress Status"
kubectl get ingress -n $NAMESPACE_APP 2>/dev/null || echo "No ingress found"
echo ""

# Check persistent volumes
print_subheader "Storage"
echo "Persistent Volume Claims:"
kubectl get pvc -n $NAMESPACE_INFRA 2>/dev/null || echo "No PVCs found"
echo ""
echo "Storage Classes:"
kubectl get storageclass | grep -E "(auction|NAME)" || echo "No auction storage classes found"
echo ""

# Check configmaps and secrets
print_subheader "Configuration"
echo "ConfigMaps:"
kubectl get configmap -n $NAMESPACE_APP 2>/dev/null || echo "No configmaps found"
echo ""
echo "Secrets:"
kubectl get secrets -n $NAMESPACE_APP 2>/dev/null || echo "No secrets found"
echo ""

# Display access URLs
print_subheader "Access URLs"
if kubectl get ingress auction-ingress -n $NAMESPACE_APP >/dev/null 2>&1; then
    echo -e "${GREEN}Frontend URL: http://auction.local${NC}"
    echo -e "${GREEN}API Gateway URL: http://api.auction.local${NC}"
    echo ""
    echo -e "${YELLOW}Note: Make sure these entries are in your /etc/hosts file:${NC}"
    echo "$MINIKUBE_IP auction.local"
    echo "$MINIKUBE_IP api.auction.local"
else
    print_warning "Ingress not found. Services may not be accessible externally."
fi
echo ""

# Check resource usage
print_subheader "Resource Usage"
echo "Node resource usage:"
kubectl top nodes 2>/dev/null || echo "Metrics server not available"
echo ""
echo "Pod resource usage (Infrastructure):"
kubectl top pods -n $NAMESPACE_INFRA 2>/dev/null || echo "Metrics not available"
echo ""
echo "Pod resource usage (Application):"
kubectl top pods -n $NAMESPACE_APP 2>/dev/null || echo "Metrics not available"
echo ""

# Quick health check
print_subheader "Quick Health Check"
echo "Checking if key services are running..."

# Check infrastructure
REDIS_STATUS=$(kubectl get pods -n $NAMESPACE_INFRA -l app=redis -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")
NATS_STATUS=$(kubectl get pods -n $NAMESPACE_INFRA -l app=nats-streaming -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")
MYSQL_COUNT=$(kubectl get pods -n $NAMESPACE_INFRA -l app=mysql -o jsonpath='{.items[*].status.phase}' 2>/dev/null | wc -w || echo "0")

# Check application
FRONTEND_STATUS=$(kubectl get pods -n $NAMESPACE_APP -l app=frontend -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")
API_GATEWAY_STATUS=$(kubectl get pods -n $NAMESPACE_APP -l app=api-gateway -o jsonpath='{.items[0].status.phase}' 2>/dev/null || echo "NotFound")

echo "Redis: $REDIS_STATUS"
echo "NATS Streaming: $NATS_STATUS"
echo "MySQL Databases: $MYSQL_COUNT running"
echo "Frontend: $FRONTEND_STATUS"
echo "API Gateway: $API_GATEWAY_STATUS"
echo ""

# Useful commands
print_subheader "Useful Commands"
echo "View all pods: kubectl get pods -A"
echo "View logs (example): kubectl logs -f deployment/frontend -n $NAMESPACE_APP"
echo "Access Minikube dashboard: minikube dashboard -p $MINIKUBE_PROFILE"
echo "Port forward service: kubectl port-forward svc/[service-name] [local-port]:[service-port] -n [namespace]"
echo "Restart deployment: kubectl rollout restart deployment/[service-name] -n [namespace]"
echo "Check ingress details: kubectl describe ingress auction-ingress -n $NAMESPACE_APP"
echo ""

print_status "Status check completed!"

# Option to watch pods
read -p "Do you want to watch pod status in real-time? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Watching pods... Press Ctrl+C to exit${NC}"
    kubectl get pods -A -w
fi
