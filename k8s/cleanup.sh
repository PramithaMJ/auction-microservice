#!/bin/bash

# Auction Website Kubernetes Cleanup Script
# This script removes all auction website components from Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
KEEP_INFRASTRUCTURE=${KEEP_INFRASTRUCTURE:-false}
KEEP_PVCS=${KEEP_PVCS:-false}
FORCE=${FORCE:-false}

# Functions
log_info() {
    echo -e "${BLUE}  $1${NC}"
}

log_success() {
    echo -e "${GREEN} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}  $1${NC}"
}

log_error() {
    echo -e "${RED} $1${NC}"
}

# Help function
show_help() {
    cat << EOF
Auction Website Kubernetes Cleanup Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -i, --keep-infra        Keep infrastructure components (MySQL, NATS, Redis)
    -p, --keep-pvcs         Keep persistent volume claims (preserve data)
    -f, --force            Skip confirmation prompts
    
EXAMPLES:
    # Complete cleanup with confirmation
    $0
    
    # Keep infrastructure and data
    $0 --keep-infra --keep-pvcs
    
    # Force cleanup without prompts
    $0 --force

ENVIRONMENT VARIABLES:
    KEEP_INFRASTRUCTURE     Set to true to keep infrastructure
    KEEP_PVCS              Set to true to keep persistent volume claims
    FORCE                  Set to true to skip confirmations
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -i|--keep-infra)
            KEEP_INFRASTRUCTURE=true
            shift
            ;;
        -p|--keep-pvcs)
            KEEP_PVCS=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Confirmation prompt
confirm_action() {
    local message="$1"
    
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    echo -e "${YELLOW}$message${NC}"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled"
        exit 0
    fi
}

# Check if kubectl is available
check_prerequisites() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
}

# Show current deployment status
show_current_status() {
    log_info "Current deployment status:"
    
    echo ""
    echo "=== Namespaces ==="
    kubectl get namespaces | grep -E "(auction-|NAME)" || echo "No auction namespaces found"
    
    echo ""
    echo "=== Infrastructure Pods ==="
    kubectl get pods -n auction-infrastructure 2>/dev/null || echo "No infrastructure pods found"
    
    echo ""
    echo "=== Application Pods ==="
    kubectl get pods -n auction-system 2>/dev/null || echo "No application pods found"
    
    echo ""
    echo "=== Persistent Volume Claims ==="
    kubectl get pvc -n auction-infrastructure 2>/dev/null || echo "No PVCs found"
    
    echo ""
}

# Remove application components
cleanup_application() {
    log_info "Cleaning up application components..."
    
    # Remove ingress
    kubectl delete ingress --all -n auction-system 2>/dev/null || true
    log_success "Ingress removed"
    
    # Remove services
    kubectl delete services --all -n auction-system 2>/dev/null || true
    log_success "Services removed"
    
    # Remove deployments
    kubectl delete deployments --all -n auction-system 2>/dev/null || true
    log_success "Deployments removed"
    
    # Remove configmaps and secrets
    kubectl delete configmaps --all -n auction-system 2>/dev/null || true
    kubectl delete secrets --all -n auction-system 2>/dev/null || true
    log_success "ConfigMaps and Secrets removed"
    
    # Remove namespace
    kubectl delete namespace auction-system 2>/dev/null || true
    log_success "Application namespace removed"
}

# Remove infrastructure components
cleanup_infrastructure() {
    if [[ "$KEEP_INFRASTRUCTURE" == "true" ]]; then
        log_warning "Keeping infrastructure components"
        return 0
    fi
    
    log_info "Cleaning up infrastructure components..."
    
    # Remove deployments and services
    kubectl delete deployments --all -n auction-infrastructure 2>/dev/null || true
    kubectl delete services --all -n auction-infrastructure 2>/dev/null || true
    kubectl delete configmaps --all -n auction-infrastructure 2>/dev/null || true
    kubectl delete secrets --all -n auction-infrastructure 2>/dev/null || true
    log_success "Infrastructure deployments and services removed"
    
    # Remove PVCs if not keeping them
    if [[ "$KEEP_PVCS" != "true" ]]; then
        kubectl delete pvc --all -n auction-infrastructure 2>/dev/null || true
        log_success "Persistent Volume Claims removed"
    else
        log_warning "Keeping Persistent Volume Claims (data preserved)"
    fi
    
    # Remove namespace if not keeping PVCs
    if [[ "$KEEP_PVCS" != "true" ]]; then
        kubectl delete namespace auction-infrastructure 2>/dev/null || true
        log_success "Infrastructure namespace removed"
    else
        log_warning "Keeping infrastructure namespace (contains PVCs)"
    fi
}

# Remove storage classes (optional)
cleanup_storage() {
    if [[ "$KEEP_PVCS" == "true" ]]; then
        log_warning "Keeping storage classes (PVCs preserved)"
        return 0
    fi
    
    log_info "Checking for custom storage classes..."
    
    # Only remove custom storage classes created by the project
    if kubectl get storageclass auction-storage 2>/dev/null; then
        confirm_action "Remove custom storage class 'auction-storage'?"
        kubectl delete storageclass auction-storage 2>/dev/null || true
        log_success "Custom storage class removed"
    fi
}

# Wait for cleanup completion
wait_for_cleanup() {
    log_info "Waiting for cleanup to complete..."
    
    # Wait for pods to terminate
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        local remaining_pods=0
        
        # Check application pods
        if kubectl get pods -n auction-system &>/dev/null; then
            remaining_pods=$((remaining_pods + $(kubectl get pods -n auction-system --no-headers 2>/dev/null | wc -l)))
        fi
        
        # Check infrastructure pods (if being removed)
        if [[ "$KEEP_INFRASTRUCTURE" != "true" ]] && kubectl get pods -n auction-infrastructure &>/dev/null; then
            remaining_pods=$((remaining_pods + $(kubectl get pods -n auction-infrastructure --no-headers 2>/dev/null | wc -l)))
        fi
        
        if [[ $remaining_pods -eq 0 ]]; then
            log_success "All pods terminated"
            break
        fi
        
        log_info "Waiting for $remaining_pods pods to terminate... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_warning "Timeout waiting for all pods to terminate"
    fi
}

# Final status check
show_final_status() {
    log_info "Final status after cleanup:"
    
    echo ""
    echo "=== Remaining Namespaces ==="
    kubectl get namespaces | grep -E "(auction-|NAME)" || echo "No auction namespaces remaining"
    
    echo ""
    echo "=== Remaining Pods ==="
    kubectl get pods -A | grep auction || echo "No auction pods remaining"
    
    if [[ "$KEEP_PVCS" == "true" ]]; then
        echo ""
        echo "=== Preserved PVCs ==="
        kubectl get pvc -n auction-infrastructure 2>/dev/null || echo "No PVCs found"
    fi
    
    echo ""
}

# Main cleanup function
main() {
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 Auction Website K8s Cleanup                 ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    show_current_status
    
    # Confirmation
    local warning_msg=" This will remove auction website components from Kubernetes"
    if [[ "$KEEP_INFRASTRUCTURE" != "true" ]]; then
        warning_msg="$warning_msg including infrastructure"
    fi
    if [[ "$KEEP_PVCS" != "true" ]]; then
        warning_msg="$warning_msg and all data (PVCs)"
    fi
    
    confirm_action "$warning_msg"
    
    cleanup_application
    cleanup_infrastructure
    cleanup_storage
    wait_for_cleanup
    
    echo ""
    log_success " Auction Website cleanup completed!"
    
    show_final_status
    
    if [[ "$KEEP_INFRASTRUCTURE" == "true" || "$KEEP_PVCS" == "true" ]]; then
        echo ""
        log_info "Some components were preserved as requested:"
        [[ "$KEEP_INFRASTRUCTURE" == "true" ]] && echo "  - Infrastructure components"
        [[ "$KEEP_PVCS" == "true" ]] && echo "  - Persistent Volume Claims (data)"
    fi
    
    echo ""
    log_info "To redeploy: ./k8s/deploy-all.sh"
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
