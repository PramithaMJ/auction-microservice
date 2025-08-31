#!/bin/bash

# Auction Website Kubernetes Status and Monitoring Script
# This script shows the status of all auction website components

echo "📊 Auction Website Kubernetes Status Dashboard"
echo "=============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed"
    exit 1
fi

# Check cluster connectivity
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_success "Connected to Kubernetes cluster"

# Show namespaces
print_section "NAMESPACES"
kubectl get namespaces | grep -E "(auction|NAME)"

# Show infrastructure status
print_section "INFRASTRUCTURE SERVICES (auction-infrastructure)"
if kubectl get namespace auction-infrastructure &> /dev/null; then
    kubectl get pods -n auction-infrastructure -o wide
    echo ""
    kubectl get services -n auction-infrastructure
    echo ""
    kubectl get pvc -n auction-infrastructure
else
    print_warning "auction-infrastructure namespace not found"
fi

# Show application services status
print_section "APPLICATION SERVICES (auction-system)"
if kubectl get namespace auction-system &> /dev/null; then
    kubectl get pods -n auction-system -o wide
    echo ""
    kubectl get services -n auction-system
else
    print_warning "auction-system namespace not found"
fi

# Show ingress
print_section "INGRESS"
if kubectl get namespace auction-system &> /dev/null; then
    kubectl get ingress -n auction-system
else
    print_warning "auction-system namespace not found"
fi

# Show resource usage
print_section "RESOURCE USAGE"
echo "Node Resources:"
kubectl top nodes 2>/dev/null || echo "Metrics server not available"
echo ""

if kubectl get namespace auction-system &> /dev/null; then
    echo "Pod Resources (auction-system):"
    kubectl top pods -n auction-system 2>/dev/null || echo "Metrics server not available"
fi

if kubectl get namespace auction-infrastructure &> /dev/null; then
    echo "Pod Resources (auction-infrastructure):"
    kubectl top pods -n auction-infrastructure 2>/dev/null || echo "Metrics server not available"
fi

# Show events
print_section "RECENT EVENTS"
if kubectl get namespace auction-system &> /dev/null; then
    echo "Events in auction-system:"
    kubectl get events -n auction-system --sort-by='.lastTimestamp' | tail -10
fi

if kubectl get namespace auction-infrastructure &> /dev/null; then
    echo "Events in auction-infrastructure:"
    kubectl get events -n auction-infrastructure --sort-by='.lastTimestamp' | tail -10
fi

# Show endpoints for external access
print_section "EXTERNAL ACCESS"
echo "LoadBalancer Services:"
kubectl get services --all-namespaces --field-selector spec.type=LoadBalancer

echo ""
echo "NodePort Services:"
kubectl get services --all-namespaces --field-selector spec.type=NodePort

# Show storage
print_section "PERSISTENT STORAGE"
kubectl get pv
echo ""
kubectl get pvc --all-namespaces | grep auction

print_section "QUICK COMMANDS"
echo "View logs: kubectl logs -f deployment/<service-name> -n auction-system"
echo "Scale service: kubectl scale deployment <service-name> --replicas=<number> -n auction-system"
echo "Port forward: kubectl port-forward svc/<service-name> <local-port>:<service-port> -n auction-system"
echo "Exec into pod: kubectl exec -it deployment/<service-name> -n auction-system -- /bin/sh"
echo "Restart deployment: kubectl rollout restart deployment/<service-name> -n auction-system"

echo ""
print_success "Status check completed!"
