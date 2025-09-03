#!/bin/bash

echo " Deploying Auction System with Updated Stripe Configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN} $1 successful${NC}"
    else
        echo -e "${RED} $1 failed${NC}"
        exit 1
    fi
}

echo -e "${BLUE}📋 Step 1: Applying Namespaces...${NC}"
kubectl apply -f k8s/namespaces.yaml
check_status "Namespace creation"

echo -e "${BLUE} Step 2: Applying Updated Secrets with Stripe Keys...${NC}"
kubectl apply -f k8s/secrets/auction-secrets-updated.yaml
check_status "Secrets application"

echo -e "${BLUE}⚙️  Step 3: Applying Updated ConfigMaps with Frontend Stripe Config...${NC}"
kubectl apply -f k8s/configmaps/auction-configmap.yaml
check_status "ConfigMaps application"

echo -e "${BLUE}🗄️  Step 4: Deploying Infrastructure (MySQL, Redis, NATS)...${NC}"
kubectl apply -f k8s/infrastucture/
check_status "Infrastructure deployment"

echo -e "${BLUE}⏳ Waiting for infrastructure to be ready...${NC}"
sleep 10

echo -e "${BLUE} Step 5: Deploying Microservices...${NC}"
kubectl apply -f k8s/deployments/
check_status "Microservices deployment"

echo -e "${BLUE} Step 6: Applying Services...${NC}"
kubectl apply -f k8s/services/
check_status "Services application"

echo -e "${BLUE} Step 7: Applying Ingress...${NC}"
kubectl apply -f k8s/ingress/
check_status "Ingress application"

echo -e "${GREEN} Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW} Checking deployment status...${NC}"
echo ""

# Check pod status
echo -e "${BLUE}Pods in auction-system namespace:${NC}"
kubectl get pods -n auction-system

echo ""
echo -e "${BLUE}Services in auction-system namespace:${NC}"
kubectl get svc -n auction-system

echo ""
echo -e "${BLUE}ConfigMaps in auction-system namespace:${NC}"
kubectl get configmaps -n auction-system

echo ""
echo -e "${BLUE}Secrets in auction-system namespace:${NC}"
kubectl get secrets -n auction-system

echo ""
echo -e "${GREEN} To check specific pod logs, use:${NC}"
echo "kubectl logs -n auction-system <pod-name>"
echo ""
echo -e "${GREEN} To access the application:${NC}"
echo "kubectl get svc -n auction-system frontend-service"
echo ""
echo -e "${YELLOW}  Note: The Stripe configuration has been updated with your actual keys:${NC}"
echo "- Frontend uses: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "- Payments service uses: STRIPE_KEY"
echo ""
echo -e "${GREEN} Deployment script completed successfully!${NC}"
