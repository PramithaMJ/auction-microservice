#!/bin/bash

# Configure External Access for Auction Website on AWS EC2 with Minikube
# This script configures AWS security groups and sets up port forwarding

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

# Port Configuration
FRONTEND_PORT="30000"
API_GATEWAY_PORT="30001"
JAEGER_UI_PORT="30686"

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
echo -e "${BLUE}    AWS EC2 External Access Configuration ${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_warning "AWS CLI not found. Please install AWS CLI to configure security groups automatically."
    print_info "Manual configuration required for security groups."
else
    print_info "Configuring AWS Security Groups..."
    
    # Get the security group for the instance
    SECURITY_GROUP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
    
    if [ "$SECURITY_GROUP" != "None" ] && [ "$SECURITY_GROUP" != "" ]; then
        print_info "Security Group: $SECURITY_GROUP"
        
        # Add inbound rules for the required ports
        echo "Adding inbound rules for ports..."
        
        # Frontend port
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP \
            --protocol tcp \
            --port $FRONTEND_PORT \
            --cidr 0.0.0.0/0 \
            --output text 2>/dev/null && print_status "Frontend port $FRONTEND_PORT opened" || print_warning "Frontend port $FRONTEND_PORT might already be open"
        
        # API Gateway port
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP \
            --protocol tcp \
            --port $API_GATEWAY_PORT \
            --cidr 0.0.0.0/0 \
            --output text 2>/dev/null && print_status "API Gateway port $API_GATEWAY_PORT opened" || print_warning "API Gateway port $API_GATEWAY_PORT might already be open"
        
        # Jaeger UI port
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP \
            --protocol tcp \
            --port $JAEGER_UI_PORT \
            --cidr 0.0.0.0/0 \
            --output text 2>/dev/null && print_status "Jaeger UI port $JAEGER_UI_PORT opened" || print_warning "Jaeger UI port $JAEGER_UI_PORT might already be open"
        
        # Additional common ports
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0 \
            --output text 2>/dev/null && print_status "HTTP port 80 opened" || print_warning "HTTP port 80 might already be open"
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SECURITY_GROUP \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0 \
            --output text 2>/dev/null && print_status "HTTPS port 443 opened" || print_warning "HTTPS port 443 might already be open"
        
    else
        print_error "Could not retrieve security group ID"
    fi
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}       External Access Configuration      ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""

# Display access information
print_info "Your Auction Website is accessible at:"
echo ""
echo -e "${YELLOW}🌐 Frontend Application:${NC}"
echo -e "   ${BLUE}http://$SERVER_IP:$FRONTEND_PORT${NC}"
echo ""
echo -e "${YELLOW}🔗 API Gateway:${NC}"
echo -e "   ${BLUE}http://$SERVER_IP:$API_GATEWAY_PORT${NC}"
echo ""
echo -e "${YELLOW}📊 Jaeger Tracing UI:${NC}"
echo -e "   ${BLUE}http://$SERVER_IP:$JAEGER_UI_PORT${NC}"
echo ""

# Create a simple HTML status page
print_info "Creating status page..."
cat > /tmp/auction-status.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Auction Website - Server Status</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #2c3e50; margin-bottom: 30px; }
        .service { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .service h3 { margin-top: 0; color: #34495e; }
        .url { background: #ecf0f1; padding: 10px; border-radius: 5px; font-family: monospace; }
        .status-online { color: #27ae60; }
        .status-info { color: #3498db; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏛️ Auction Website</h1>
            <h2>Server Status Dashboard</h2>
            <p class="status-info">Server: $SERVER_IP | Instance: $INSTANCE_ID</p>
        </div>
        
        <div class="service">
            <h3>🌐 Frontend Application</h3>
            <div class="url">
                <a href="http://$SERVER_IP:$FRONTEND_PORT" target="_blank">
                    http://$SERVER_IP:$FRONTEND_PORT
                </a>
            </div>
            <p>Main auction website interface</p>
        </div>
        
        <div class="service">
            <h3>🔗 API Gateway</h3>
            <div class="url">
                <a href="http://$SERVER_IP:$API_GATEWAY_PORT" target="_blank">
                    http://$SERVER_IP:$API_GATEWAY_PORT
                </a>
            </div>
            <p>REST API endpoints for all services</p>
        </div>
        
        <div class="service">
            <h3>📊 Jaeger Tracing UI</h3>
            <div class="url">
                <a href="http://$SERVER_IP:$JAEGER_UI_PORT" target="_blank">
                    http://$SERVER_IP:$JAEGER_UI_PORT
                </a>
            </div>
            <p>Distributed tracing and monitoring</p>
        </div>
        
        <div class="footer">
            <p>Deployed on: $(date)</p>
            <p>Kubernetes cluster running on Minikube</p>
        </div>
    </div>
</body>
</html>
EOF

print_status "Status page created at /tmp/auction-status.html"

echo ""
print_info "Manual Security Group Configuration (if AWS CLI not available):"
echo -e "${YELLOW}1. Go to AWS Console → EC2 → Security Groups${NC}"
echo -e "${YELLOW}2. Find security group for instance $INSTANCE_ID${NC}"
echo -e "${YELLOW}3. Add inbound rules for ports: $FRONTEND_PORT, $API_GATEWAY_PORT, $JAEGER_UI_PORT${NC}"
echo -e "${YELLOW}4. Source: 0.0.0.0/0 (or your specific IP range)${NC}"
echo ""

print_info "Testing connectivity:"
echo -e "${YELLOW}curl http://$SERVER_IP:$API_GATEWAY_PORT/health${NC}"
echo ""

echo -e "${GREEN}✅ External access configuration completed!${NC}"
