#!/bin/bash

# Kubernetes Cleanup Script using Kustomize
# This script safely removes auction website resources from Kubernetes

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
FORCE_DELETE=false
DELETE_PVCS=false

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
    echo "  -f, --force             Force delete resources (skip confirmation)"
    echo "  -p, --delete-pvcs       Also delete PersistentVolumeClaims (data will be lost!)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Clean development environment"
    echo "  $0 -e production -f     # Force clean production"
    echo "  $0 -e staging -p        # Clean staging and delete data volumes"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_DELETE=true
            shift
            ;;
        -p|--delete-pvcs)
            DELETE_PVCS=true
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

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_header "Auction Website Kubernetes Cleanup"
print_status "Environment: $ENVIRONMENT"
print_status "Force Delete: $FORCE_DELETE"
print_status "Delete PVCs: $DELETE_PVCS"

# Set the overlay path based on environment
OVERLAY_PATH="overlays/$ENVIRONMENT"

# Check if overlay exists
if [[ ! -d "$OVERLAY_PATH" ]]; then
    print_error "Environment overlay not found: $OVERLAY_PATH"
    exit 1
fi

# Confirmation prompt
if [[ "$FORCE_DELETE" != true ]]; then
    print_warning "This will delete all auction website resources in the $ENVIRONMENT environment."
    if [[ "$DELETE_PVCS" == true ]]; then
        print_warning "WARNING: This will also delete all data (PVCs)! This action cannot be undone!"
    fi
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        print_status "Cleanup cancelled."
        exit 0
    fi
fi

print_header "Starting Cleanup Process"

# Build and delete the configuration
print_status "Building kustomization from $OVERLAY_PATH..."
if ! kubectl kustomize $OVERLAY_PATH > /tmp/auction-k8s-cleanup.yaml; then
    print_error "Failed to build kustomization"
    exit 1
fi

print_status "Deleting resources..."
if kubectl delete -f /tmp/auction-k8s-cleanup.yaml --timeout=300s; then
    print_status "✓ Resources deleted successfully"
else
    print_warning "Some resources may not have been deleted"
fi

# Delete PVCs if requested
if [[ "$DELETE_PVCS" == true ]]; then
    print_header "Deleting Persistent Volume Claims"
    
    print_status "Deleting PVCs in auction-infrastructure namespace..."
    kubectl delete pvc --all -n auction-infrastructure --timeout=300s || print_warning "Some PVCs could not be deleted"
    
    print_status "Deleting PVCs in auction-system namespace..."
    kubectl delete pvc --all -n auction-system --timeout=300s || print_warning "Some PVCs could not be deleted"
fi

# Check remaining resources
print_header "Checking Remaining Resources"

print_status "Pods in auction-system:"
kubectl get pods -n auction-system || print_status "No pods found"

print_status "Pods in auction-infrastructure:"
kubectl get pods -n auction-infrastructure || print_status "No pods found"

print_status "Services in auction-system:"
kubectl get services -n auction-system || print_status "No services found"

if [[ "$DELETE_PVCS" == true ]]; then
    print_status "PVCs in auction-infrastructure:"
    kubectl get pvc -n auction-infrastructure || print_status "No PVCs found"
fi

print_header "Cleanup Completed"
print_status "Environment: $ENVIRONMENT"

# Clean up temporary file
rm -f /tmp/auction-k8s-cleanup.yaml

print_status "Cleanup process finished!"
