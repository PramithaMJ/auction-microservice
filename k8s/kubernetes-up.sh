#!/bin/bash

# Exit on error
set -e

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig.${NC}"
        exit 1
    fi
}

wait_for_pods() {
    namespace=$1
    echo -e "${YELLOW}⏳ Waiting for pods in namespace ${namespace} to be ready...${NC}"
    kubectl wait --for=condition=ready pod --all -n $namespace --timeout=300s
}

create_namespace() {
    if ! kubectl get namespace auction-system-system &> /dev/null; then
        echo -e "${YELLOW}📦 Creating auction-system namespace...${NC}"
        kubectl create namespace auction-system
    else
        echo -e "${GREEN}✓ Auction namespace already exists${NC}"
    fi
}

# Check prerequisites
echo -e "${GREEN}🚀 Starting Kubernetes deployment...${NC}"
echo -e "${YELLOW}Checking prerequisites...${NC}"
check_command kubectl
check_cluster

# 1. Create Namespace
create_namespace

# 2. Secrets
echo -e "${YELLOW}🔑 Applying secrets...${NC}"
kubectl apply -f secrets/ -n auction-system

# 3. ConfigMaps
echo -e "${YELLOW}⚙️  Applying configmaps...${NC}"
kubectl apply -f configmaps/ -n auction-system

# 4. Infrastructure (databases, redis, nats)
echo -e "${YELLOW}🗄️  Applying infrastructure...${NC}"
kubectl apply -f infrastucture/ -n auction-system
echo -e "${YELLOW}⏳ Waiting for infrastructure to be ready...${NC}"
sleep 10  # Give time for resources to be created
kubectl wait --for=condition=ready pod -l tier=infrastructure -n auction-system --timeout=300s || true

# 5. Deployments (microservices)
echo -e "${YELLOW}🛠️  Applying deployments...${NC}"
kubectl apply -f deployments/ -n auction-system

# 6. Ingress
echo -e "${YELLOW}🌐 Applying ingress...${NC}"
kubectl apply -f ingress/ -n auction-system

# Apply opensearch for logs
echo -e "${YELLOW}📊 Applying opensearch...${NC}"
kubectl apply -f opensearch/ -n auction-system

# 7. Overlays (choose one: development/staging/production)
OVERLAY=${1:-development}
if [ -d "overlays/$OVERLAY" ]; then
    echo -e "${YELLOW}📂 Applying overlay: $OVERLAY${NC}"
    kubectl apply -k overlays/$OVERLAY
else
    echo -e "${YELLOW}⚠️  No overlay found for $OVERLAY, skipping...${NC}"
fi

# Wait for all pods to be ready
echo -e "${YELLOW}⏳ Waiting for all pods to be ready...${NC}"
kubectl wait --for=condition=ready pod --all -n auction-system --timeout=300s || true

# Final status check
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${YELLOW}🔍 Current pod status:${NC}"
kubectl get pods -n auction-system -o wide

echo -e "${GREEN}✨ Kubernetes cluster is ready!${NC}"
