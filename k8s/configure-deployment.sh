#!/bin/bash

# Configuration script for Kubernetes deployment
# This script helps configure the deployment for your specific server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║${NC} ${CYAN}Auction Website Kubernetes Configuration${NC} ${PURPLE}║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"

# Get server IP
echo -e "${BLUE}Please enter your server's public IP address:${NC}"
read -p "Server IP: " SERVER_IP

if [[ -z "$SERVER_IP" ]]; then
    echo -e "${RED}Error: Server IP cannot be empty${NC}"
    exit 1
fi

echo -e "${YELLOW}Configuring deployment for server IP: $SERVER_IP${NC}"

# Update ConfigMap
echo -e "${CYAN}Updating ConfigMap...${NC}"
sed -i '' "s/YOUR_SERVER_IP/$SERVER_IP/g" configmaps/auction-configmap.yaml

# Update Ingress
echo -e "${CYAN}Updating Ingress configuration...${NC}"
sed -i '' "s/YOUR_SERVER_IP/$SERVER_IP/g" ingress/auction-ingress.yaml

# Update any other files that might have placeholders
echo -e "${CYAN}Checking for other configuration files...${NC}"

# Prompt for AWS credentials update
echo -e "${YELLOW}Do you want to update AWS credentials? (y/n)${NC}"
read -p "Update AWS: " UPDATE_AWS

if [[ "$UPDATE_AWS" == "y" || "$UPDATE_AWS" == "Y" ]]; then
    echo -e "${BLUE}Please enter your AWS credentials:${NC}"
    read -p "AWS Access Key ID: " AWS_ACCESS_KEY
    read -s -p "AWS Secret Access Key: " AWS_SECRET_KEY
    echo
    read -p "AWS S3 Bucket Name: " S3_BUCKET
    read -p "AWS Region (default: us-east-1): " AWS_REGION
    
    AWS_REGION=${AWS_REGION:-us-east-1}
    
    # Update secrets (base64 encode)
    AWS_ACCESS_KEY_B64=$(echo -n "$AWS_ACCESS_KEY" | base64)
    AWS_SECRET_KEY_B64=$(echo -n "$AWS_SECRET_KEY" | base64)
    S3_BUCKET_B64=$(echo -n "$S3_BUCKET" | base64)
    
    sed -i '' "s/AWS_ACCESS_KEY_ID: .*/AWS_ACCESS_KEY_ID: \"$AWS_ACCESS_KEY\"/" secrets/auction-secrets.yaml
    sed -i '' "s/AWS_SECRET_ACCESS_KEY: .*/AWS_SECRET_ACCESS_KEY: \"$AWS_SECRET_KEY\"/" secrets/auction-secrets.yaml
    sed -i '' "s/AWS_S3_BUCKET_NAME: .*/AWS_S3_BUCKET_NAME: \"$S3_BUCKET\"/" secrets/auction-secrets.yaml
fi

# Prompt for Stripe key update
echo -e "${YELLOW}Do you want to update Stripe key? (y/n)${NC}"
read -p "Update Stripe: " UPDATE_STRIPE

if [[ "$UPDATE_STRIPE" == "y" || "$UPDATE_STRIPE" == "Y" ]]; then
    read -s -p "Enter Stripe Secret Key: " STRIPE_KEY
    echo
    sed -i '' "s/STRIPE_KEY: .*/STRIPE_KEY: \"$STRIPE_KEY\"/" secrets/auction-secrets.yaml
fi

# Create deployment summary
echo -e "${GREEN}Configuration completed!${NC}"
echo -e "${CYAN}Summary:${NC}"
echo -e "  Server IP: $SERVER_IP"
echo -e "  Frontend URL: http://$SERVER_IP:3000"
echo -e "  API Gateway URL: http://$SERVER_IP:3001"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Review the updated configuration files"
echo -e "  2. Run: ${CYAN}./deploy-all.sh${NC}"
echo -e "  3. Access your application at: ${CYAN}http://$SERVER_IP${NC}"
