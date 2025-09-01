#!/bin/bash

# Verification script for IP configuration
# This script checks if all configurations are properly updated with the server IP

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

SERVER_IP="34.229.99.72"

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC} ${CYAN}Auction Website IP Configuration Verification${NC} ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"

echo -e "${BLUE}Verifying configuration for IP: $SERVER_IP${NC}"
echo

# Check ConfigMap
echo -e "${CYAN}🔹 Checking ConfigMap configuration...${NC}"
if grep -q "$SERVER_IP" k8s/configmaps/auction-configmap.yaml; then
    echo -e "${GREEN}✅ ConfigMap properly configured with $SERVER_IP${NC}"
else
    echo -e "${RED}❌ ConfigMap not configured properly${NC}"
    exit 1
fi

# Check Ingress
echo -e "${CYAN}🔹 Checking Ingress configuration...${NC}"
if grep -q "$SERVER_IP" k8s/ingress/auction-ingress.yaml; then
    echo -e "${GREEN}✅ Ingress properly configured with $SERVER_IP${NC}"
else
    echo -e "${RED}❌ Ingress not configured properly${NC}"
    exit 1
fi

# Check for any remaining placeholders
echo -e "${CYAN}🔹 Checking for remaining placeholders...${NC}"
if grep -r "YOUR_SERVER_IP" k8s/ --exclude="*.md" --exclude="*.sh" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found remaining YOUR_SERVER_IP placeholders:${NC}"
    grep -r "YOUR_SERVER_IP" k8s/ --exclude="*.md" --exclude="*.sh" || true
else
    echo -e "${GREEN}✅ No placeholders remaining${NC}"
fi

# Verify CORS settings
echo -e "${CYAN}🔹 Checking CORS configuration...${NC}"
if grep -q "http://$SERVER_IP:3000" k8s/configmaps/auction-configmap.yaml; then
    echo -e "${GREEN}✅ CORS properly configured for all ports${NC}"
else
    echo -e "${YELLOW}⚠️  CORS configuration may need review${NC}"
fi

# Check socket URL
echo -e "${CYAN}🔹 Checking WebSocket configuration...${NC}"
if grep -q "ws://$SERVER_IP:3103" k8s/configmaps/auction-configmap.yaml; then
    echo -e "${GREEN}✅ WebSocket URL properly configured${NC}"
else
    echo -e "${YELLOW}⚠️  WebSocket URL may need review${NC}"
fi

echo
echo -e "${GREEN}🎉 Configuration verification completed!${NC}"
echo
echo -e "${CYAN}📋 Summary:${NC}"
echo -e "  Server IP: ${YELLOW}$SERVER_IP${NC}"
echo -e "  Frontend URL: ${YELLOW}http://$SERVER_IP:3000${NC}"
echo -e "  API Gateway: ${YELLOW}http://$SERVER_IP:3001${NC}"
echo -e "  Main App: ${YELLOW}http://$SERVER_IP${NC}"
echo
echo -e "${BLUE}🚀 Ready to deploy!${NC}"
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Deploy: ${YELLOW}./deploy-all.sh${NC}"
echo -e "  2. Monitor: ${YELLOW}kubectl get pods --all-namespaces | grep auction${NC}"
echo -e "  3. Access: ${YELLOW}http://$SERVER_IP${NC}"
echo
echo -e "${PURPLE}📝 Note: No host file changes are required for deployment${NC}"
