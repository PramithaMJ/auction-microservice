#!/bin/bash

# Complete Kubernetes Cleanup Script for Auction Website
# This script removes all auction website components from Kubernetes

set -e

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
INFRASTRUCTURE_NS="auction-infrastructure"
SYSTEM_NS="auction-system"
FORCE=false
KEEP_STORAGE=false

# Functions
log_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC} ${CYAN}$1${NC} ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${CYAN}🔹 $1${NC}"
}

# Show help
show_help() {
    cat << EOF
Auction Website Kubernetes Cleanup Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    -f, --force         Skip confirmation prompts
    -s, --keep-storage  Keep storage class and PVCs (preserve data)
    
EXAMPLES:
    # Interactive cleanup
    $0
    
    # Force cleanup without prompts
    $0 --force
    
    # Keep storage and data
    $0 --keep-storage
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -s|--keep-storage)
                KEEP_STORAGE=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

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

# Show current deployment status
show_current_status() {
    log_header "Current Deployment Status"
    
    echo ""
    echo -e "${CYAN}📊 Namespaces:${NC}"
    kubectl get namespaces | grep -E "(auction-|NAME)" 2>/dev/null || echo "No auction namespaces found"
    
    echo ""
    echo -e "${CYAN}📊 Infrastructure Pods:${NC}"
    kubectl get pods -n $INFRASTRUCTURE_NS 2>/dev/null || echo "No infrastructure pods found"
    
    echo ""
    echo -e "${CYAN}📊 Application Pods:${NC}"
    kubectl get pods -n $SYSTEM_NS 2>/dev/null || echo "No application pods found"
    
    echo ""
    echo -e "${CYAN}💾 Storage:${NC}"
    kubectl get pvc -n $INFRASTRUCTURE_NS 2>/dev/null || echo "No PVCs found"
    kubectl get storageclass | grep auction 2>/dev/null || echo "No auction storage classes found"
    
    echo ""
}

# Remove application components
cleanup_application() {
    log_step "Removing application components..."
    
    # Remove ingress first
    kubectl delete ingress --all -n $SYSTEM_NS --ignore-not-found=true
    log_info "Ingress removed"
    
    # Remove services
    kubectl delete services --all -n $SYSTEM_NS --ignore-not-found=true
    log_info "Services removed"
    
    # Remove deployments
    kubectl delete deployments --all -n $SYSTEM_NS --ignore-not-found=true
    log_info "Deployments removed"
    
    # Remove configmaps and secrets
    kubectl delete configmaps --all -n $SYSTEM_NS --ignore-not-found=true
    kubectl delete secrets --all -n $SYSTEM_NS --ignore-not-found=true
    log_info "ConfigMaps and Secrets removed"
    
    # Wait for pods to terminate
    log_step "Waiting for application pods to terminate..."
    local timeout=60
    local count=0
    while kubectl get pods -n $SYSTEM_NS &>/dev/null && [[ $count -lt $timeout ]]; do
        sleep 2
        ((count += 2))
        if [[ $((count % 10)) -eq 0 ]]; then
            log_info "Still waiting for pods to terminate... (${count}s)"
        fi
    done
    
    # Remove namespace
    kubectl delete namespace $SYSTEM_NS --ignore-not-found=true
    log_success "Application namespace removed"
}

# Remove infrastructure components
cleanup_infrastructure() {
    log_step "Removing infrastructure components..."
    
    # Remove deployments and services
    kubectl delete deployments --all -n $INFRASTRUCTURE_NS --ignore-not-found=true
    kubectl delete services --all -n $INFRASTRUCTURE_NS --ignore-not-found=true
    log_info "Infrastructure deployments and services removed"
    
    # Remove configmaps and secrets
    kubectl delete configmaps --all -n $INFRASTRUCTURE_NS --ignore-not-found=true
    kubectl delete secrets --all -n $INFRASTRUCTURE_NS --ignore-not-found=true
    log_info "Infrastructure configuration removed"
    
    # Wait for infrastructure pods to terminate
    log_step "Waiting for infrastructure pods to terminate..."
    local timeout=60
    local count=0
    while kubectl get pods -n $INFRASTRUCTURE_NS &>/dev/null && [[ $count -lt $timeout ]]; do
        sleep 2
        ((count += 2))
        if [[ $((count % 10)) -eq 0 ]]; then
            log_info "Still waiting for infrastructure pods to terminate... (${count}s)"
        fi
    done
    
    log_success "Infrastructure components removed"
}

# Remove storage components
cleanup_storage() {
    if [[ "$KEEP_STORAGE" == "true" ]]; then
        log_warning "Keeping storage components (PVCs and StorageClass preserved)"
        return 0
    fi
    
    log_step "Removing storage components..."
    
    # Remove PVCs
    kubectl delete pvc --all -n $INFRASTRUCTURE_NS --ignore-not-found=true
    log_info "Persistent Volume Claims removed"
    
    # Wait for PVCs to be deleted
    log_step "Waiting for PVCs to be deleted..."
    local timeout=30
    local count=0
    while kubectl get pvc -n $INFRASTRUCTURE_NS &>/dev/null && [[ $count -lt $timeout ]]; do
        sleep 2
        ((count += 2))
    done
    
    # Remove custom storage class
    kubectl delete storageclass auction-fast-ssd --ignore-not-found=true
    log_info "Storage class removed"
    
    log_success "Storage components removed"
}

# Remove namespaces
cleanup_namespaces() {
    log_step "Removing namespaces..."
    
    # Remove infrastructure namespace (only if not keeping storage)
    if [[ "$KEEP_STORAGE" != "true" ]]; then
        kubectl delete namespace $INFRASTRUCTURE_NS --ignore-not-found=true
        log_info "Infrastructure namespace removed"
    else
        log_warning "Keeping infrastructure namespace (contains preserved storage)"
    fi
    
    log_success "Namespace cleanup completed"
}

# Wait for complete cleanup
wait_for_cleanup() {
    log_step "Waiting for complete cleanup..."
    
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        local remaining_resources=0
        
        # Check for remaining pods
        if kubectl get pods -n $SYSTEM_NS &>/dev/null; then
            remaining_resources=$((remaining_resources + $(kubectl get pods -n $SYSTEM_NS --no-headers 2>/dev/null | wc -l)))
        fi
        
        if [[ "$KEEP_STORAGE" != "true" ]]; then
            if kubectl get pods -n $INFRASTRUCTURE_NS &>/dev/null; then
                remaining_resources=$((remaining_resources + $(kubectl get pods -n $INFRASTRUCTURE_NS --no-headers 2>/dev/null | wc -l)))
            fi
        fi
        
        if [[ $remaining_resources -eq 0 ]]; then
            log_success "All resources cleaned up"
            break
        fi
        
        log_info "Waiting for $remaining_resources resources to be removed... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_warning "Timeout waiting for complete cleanup - some resources may still be terminating"
    fi
}

# Show final status
show_final_status() {
    log_header "Cleanup Summary"
    
    echo ""
    echo -e "${CYAN}📊 Remaining Namespaces:${NC}"
    kubectl get namespaces | grep -E "(auction-|NAME)" 2>/dev/null || echo "No auction namespaces remaining"
    
    echo ""
    echo -e "${CYAN}📊 Remaining Pods:${NC}"
    kubectl get pods -A | grep auction 2>/dev/null || echo "No auction pods remaining"
    
    if [[ "$KEEP_STORAGE" == "true" ]]; then
        echo ""
        echo -e "${CYAN}💾 Preserved Storage:${NC}"
        kubectl get pvc -n $INFRASTRUCTURE_NS 2>/dev/null || echo "No PVCs found"
        kubectl get storageclass auction-fast-ssd 2>/dev/null || echo "Storage class not found"
    fi
    
    echo ""
    echo -e "${CYAN}🔍 Verification Commands:${NC}"
    echo "  kubectl get pods -A | grep auction"
    echo "  kubectl get namespaces | grep auction"
    if [[ "$KEEP_STORAGE" != "true" ]]; then
        echo "  kubectl get storageclass | grep auction"
    fi
}

# Main cleanup function
main() {
    # Parse arguments
    parse_args "$@"
    
    # Banner
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║              🧹 AUCTION WEBSITE CLEANUP 🧹                  ║"
    echo "║                                                              ║"
    echo "║            Complete Kubernetes Cleanup Script               ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    local start_time=$(date +%s)
    
    # Show current status
    show_current_status
    
    # Confirmation
    local warning_msg="⚠️  This will remove all auction website components from Kubernetes"
    if [[ "$KEEP_STORAGE" != "true" ]]; then
        warning_msg="$warning_msg including all data (PVCs will be deleted)"
    else
        warning_msg="$warning_msg (storage and data will be preserved)"
    fi
    
    confirm_action "$warning_msg"
    
    # Cleanup steps
    cleanup_application
    cleanup_infrastructure
    cleanup_storage
    cleanup_namespaces
    wait_for_cleanup
    
    # Show results
    show_final_status
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    log_header "Cleanup Complete!"
    echo ""
    log_success "🧹 Auction Website cleanup completed successfully!"
    log_info "⏱️  Total cleanup time: ${duration} seconds"
    
    if [[ "$KEEP_STORAGE" == "true" ]]; then
        echo ""
        log_info "💾 Storage preserved - you can redeploy without losing data:"
        echo "  ./deploy-all.sh"
    else
        echo ""
        log_info "🚀 To redeploy from scratch:"
        echo "  ./deploy-all.sh"
    fi
    
    echo ""
}

# Script entry point
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
