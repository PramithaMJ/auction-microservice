#!/bin/bash

# Enhanced Kubernetes Deployment Script using Kustomize
# This script deploys the auction website microservices to Kubernetes

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
NAMESPACE="auction-system"
FORCE_APPLY=false
DRY_RUN=false

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (development|staging|production) [default: development]"
    echo "  -n, --namespace NS       Set namespace [default: auction-system]"
    echo "  -f, --force             Force apply resources (recreate if exists)"
    echo "  -d, --dry-run           Show what would be applied without actually applying"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy to development"
    echo "  $0 -e production                     # Deploy to production"
    echo "  $0 -e staging -n auction-staging     # Deploy to staging with custom namespace"
    echo "  $0 -d                                # Dry run to see what would be applied"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_APPLY=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_error "Must be one of: development, staging, production"
    exit 1
fi

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if kustomize is available (kubectl has built-in kustomize)
if ! kubectl kustomize --help &> /dev/null; then
    print_error "kustomize is not available in kubectl"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    print_error "Please check your kubeconfig and cluster connectivity"
    exit 1
fi

print_header "Auction Website Kubernetes Deployment"
print_status "Environment: $ENVIRONMENT"
print_status "Namespace: $NAMESPACE"
print_status "Force Apply: $FORCE_APPLY"
print_status "Dry Run: $DRY_RUN"

# Set the overlay path based on environment
OVERLAY_PATH="overlays/$ENVIRONMENT"

# Check if overlay exists
if [[ ! -d "$OVERLAY_PATH" ]]; then
    print_error "Environment overlay not found: $OVERLAY_PATH"
    print_error "Available overlays:"
    ls -la overlays/ 2>/dev/null || echo "No overlays directory found"
    exit 1
fi

print_status "Using overlay: $OVERLAY_PATH"

# Function to wait for deployment
wait_for_deployment() {
    local deployment=$1
    local namespace=$2
    local timeout=${3:-300}
    
    print_status "Waiting for deployment $deployment to be ready..."
    
    if kubectl wait --for=condition=available --timeout=${timeout}s deployment/$deployment -n $namespace; then
        print_status "✓ Deployment $deployment is ready"
        return 0
    else
        print_error "✗ Deployment $deployment failed to become ready within ${timeout}s"
        return 1
    fi
}

# Function to check pod status
check_pod_status() {
    local namespace=$1
    print_status "Checking pod status in namespace: $namespace"
    kubectl get pods -n $namespace -o wide
}

# Apply the configuration
apply_kustomization() {
    local overlay_path=$1
    local namespace=$2
    local dry_run=$3
    local force=$4
    
    print_status "Building kustomization from $overlay_path..."
    
    # Build the configuration first to validate
    if ! kubectl kustomize $overlay_path > /tmp/auction-k8s-manifest.yaml; then
        print_error "Failed to build kustomization"
        exit 1
    fi
    
    print_status "✓ Kustomization built successfully"
    
    if [[ "$dry_run" == true ]]; then
        print_header "DRY RUN - Generated Manifest"
        cat /tmp/auction-k8s-manifest.yaml
        return 0
    fi
    
    # Apply the configuration
    print_status "Applying configuration to cluster..."
    
    local apply_cmd="kubectl apply"
    if [[ "$force" == true ]]; then
        apply_cmd="kubectl apply --force"
    fi
    
    if $apply_cmd -f /tmp/auction-k8s-manifest.yaml; then
        print_status "✓ Configuration applied successfully"
    else
        print_error "✗ Failed to apply configuration"
        exit 1
    fi
}

# Main deployment process
main() {
    print_header "Starting Deployment Process"
    
    # Apply the kustomization
    apply_kustomization "$OVERLAY_PATH" "$NAMESPACE" "$DRY_RUN" "$FORCE_APPLY"
    
    if [[ "$DRY_RUN" == true ]]; then
        print_header "Dry run completed"
        exit 0
    fi
    
    print_header "Waiting for Infrastructure Services"
    
    # Wait for infrastructure services first
    wait_for_deployment "nats-streaming" "auction-infrastructure" 180
    wait_for_deployment "redis" "auction-infrastructure" 180
    
    # Wait for databases
    print_status "Waiting for databases to be ready..."
    wait_for_deployment "auth-mysql" "auction-infrastructure" 300
    wait_for_deployment "bid-mysql" "auction-infrastructure" 300
    wait_for_deployment "listings-mysql" "auction-infrastructure" 300
    wait_for_deployment "payments-mysql" "auction-infrastructure" 300
    wait_for_deployment "profile-mysql" "auction-infrastructure" 300
    
    print_header "Waiting for Application Services"
    
    # Wait for core services
    wait_for_deployment "auth" "$NAMESPACE" 180
    wait_for_deployment "saga-orchestrator" "$NAMESPACE" 180
    
    # Wait for business services
    wait_for_deployment "bid" "$NAMESPACE" 180
    wait_for_deployment "listings" "$NAMESPACE" 180
    wait_for_deployment "payments" "$NAMESPACE" 180
    wait_for_deployment "profile" "$NAMESPACE" 180
    wait_for_deployment "email" "$NAMESPACE" 180
    wait_for_deployment "expiration" "$NAMESPACE" 180
    
    # Wait for gateway and frontend
    wait_for_deployment "api-gateway" "$NAMESPACE" 180
    wait_for_deployment "frontend" "$NAMESPACE" 180
    
    print_header "Deployment Status"
    check_pod_status "$NAMESPACE"
    check_pod_status "auction-infrastructure"
    
    print_header "Service URLs"
    print_status "Getting service information..."
    kubectl get services -n $NAMESPACE
    kubectl get services -n auction-infrastructure
    
    # Get ingress information if available
    print_status "Ingress information:"
    kubectl get ingress -n $NAMESPACE 2>/dev/null || print_warning "No ingress found"
    
    print_header "Deployment Completed Successfully!"
    print_status "Environment: $ENVIRONMENT"
    print_status "Namespace: $NAMESPACE"
    
    # Clean up temporary file
    rm -f /tmp/auction-k8s-manifest.yaml
}

# Run main function
main
