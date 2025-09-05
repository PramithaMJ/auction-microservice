#!/bin/bash

# Server Deployment Script for Auction Website on Minikube
# This script deploys the auction website to a remote minikube instance
# and configures external access

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server Configuration
SERVER_IP="100.29.35.176"
PRIVATE_IP="172.31.37.89"
INSTANCE_ID="i-0e201ef45ad9c5255"

# Kubernetes Configuration
NAMESPACE_INFRA="auction-infrastructure"
NAMESPACE_APP="auction-system"

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}    Auction Website Server Deployment     ${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""
print_info "Server IP: $SERVER_IP"
print_info "Private IP: $PRIVATE_IP"
print_info "Instance ID: $INSTANCE_ID"
echo ""

# Step 1: Create namespaces
print_info "Step 1: Creating namespaces..."
kubectl apply -f ../k8s/namespaces.yaml
print_status "Namespaces created"

# Step 2: Create ConfigMaps
print_info "Step 2: Creating ConfigMaps..."
kubectl apply -f ../k8s/configmaps/ -R
print_status "ConfigMaps created"

# Step 3: Create Secrets (you need to create these manually or through CI/CD)
print_info "Step 3: Applying Secrets..."
if [ -d "../k8s/secrets" ]; then
    kubectl apply -f ../k8s/secrets/ -R
    print_status "Secrets applied"
else
    print_warning "Secrets directory not found. Please create secrets manually."
fi

# Step 4: Deploy Infrastructure Services
print_info "Step 4: Deploying infrastructure services..."
kubectl apply -f ../k8s/infrastucture/ -R
print_status "Infrastructure services deployed"

# Step 5: Wait for infrastructure to be ready
print_info "Step 5: Waiting for infrastructure services to be ready..."
kubectl wait --for=condition=ready pod -l app=nats-streaming -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=auth-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=bid-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=listings-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=payments-mysql -n $NAMESPACE_INFRA --timeout=300s
kubectl wait --for=condition=ready pod -l app=profile-mysql -n $NAMESPACE_INFRA --timeout=300s
print_status "Infrastructure services are ready"

# Step 6: Deploy Application Services
print_info "Step 6: Deploying application services..."
kubectl apply -f ../k8s/deployments/ -R
print_status "Application services deployed"

# Step 7: Create Services
print_info "Step 7: Creating services..."
kubectl apply -f ../k8s/services/ -R
print_status "Services created"

# Step 8: Wait for application services to be ready
print_info "Step 8: Waiting for application services to be ready..."
kubectl wait --for=condition=available deployment -n $NAMESPACE_APP --all --timeout=600s
print_status "Application services are ready"

# Step 9: Enable NGINX Ingress Controller
print_info "Step 9: Enabling NGINX Ingress Controller..."
minikube addons enable ingress
sleep 30
print_status "NGINX Ingress Controller enabled"

# Step 10: Apply Ingress Configuration
print_info "Step 10: Applying ingress configuration..."
kubectl apply -f ../k8s/ingress/
print_status "Ingress configuration applied"

# Step 11: Configure External Access
print_info "Step 11: Configuring external access..."

# Create NodePort services for external access
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: frontend-nodeport
  namespace: $NAMESPACE_APP
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
    - port: 3000
      targetPort: 3000
      nodePort: 30000
      protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-nodeport
  namespace: $NAMESPACE_APP
spec:
  type: NodePort
  selector:
    app: api-gateway
  ports:
    - port: 3001
      targetPort: 3001
      nodePort: 30001
      protocol: TCP
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-ui-nodeport
  namespace: $NAMESPACE_INFRA
spec:
  type: NodePort
  selector:
    app: jaeger
  ports:
    - port: 16686
      targetPort: 16686
      nodePort: 30686
      protocol: TCP
EOF

print_status "NodePort services created"

# Step 12: Get service URLs
print_info "Step 12: Getting service URLs..."
MINIKUBE_IP=$(minikube ip)

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}         Deployment Complete!             ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${BLUE}Access URLs:${NC}"
echo -e "${YELLOW}Frontend (Internal):${NC} http://$MINIKUBE_IP:30000"
echo -e "${YELLOW}API Gateway (Internal):${NC} http://$MINIKUBE_IP:30001"
echo -e "${YELLOW}Jaeger UI (Internal):${NC} http://$MINIKUBE_IP:30686"
echo ""
echo -e "${YELLOW}External Access:${NC}"
echo -e "${YELLOW}Frontend:${NC} http://$SERVER_IP:30000"
echo -e "${YELLOW}API Gateway:${NC} http://$SERVER_IP:30001"
echo -e "${YELLOW}Jaeger UI:${NC} http://$SERVER_IP:30686"
echo ""
echo -e "${BLUE}Additional Commands:${NC}"
echo -e "kubectl get pods -A                    # Check all pods"
echo -e "kubectl get svc -A                     # Check all services"
echo -e "kubectl get ingress -A                 # Check ingress"
echo -e "minikube dashboard                     # Open Kubernetes dashboard"
echo -e "minikube tunnel                        # Enable LoadBalancer services"
echo ""

# Step 13: Display pod status
print_info "Current pod status:"
kubectl get pods -n $NAMESPACE_APP
kubectl get pods -n $NAMESPACE_INFRA
