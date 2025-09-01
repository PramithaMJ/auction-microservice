#!/bin/bash

# Configuration Script for External Access
# This script optimizes the Kubernetes configuration for external access via Minikube

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC} ${BLUE}Configuring Auction Website for External Access${NC} ${CYAN}║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"

# Function to get server IP
get_server_ip() {
    # Try to get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
    
    # Try to get local IP
    LOCAL_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "")
    
    echo -e "${YELLOW}Detected IP addresses:${NC}"
    if [[ -n "$PUBLIC_IP" ]]; then
        echo -e "Public IP: ${GREEN}$PUBLIC_IP${NC}"
    fi
    if [[ -n "$LOCAL_IP" ]]; then
        echo -e "Local IP: ${GREEN}$LOCAL_IP${NC}"
    fi
    
    echo -e "${CYAN}Which IP should be used for external access?${NC}"
    echo "1. Public IP: $PUBLIC_IP (recommended for internet access)"
    echo "2. Local IP: $LOCAL_IP (for local network access)"
    echo "3. Enter custom IP"
    
    read -p "Choice (1-3): " IP_CHOICE
    
    case $IP_CHOICE in
        1)
            if [[ -n "$PUBLIC_IP" ]]; then
                SERVER_IP="$PUBLIC_IP"
            else
                echo -e "${RED}Public IP not detected. Please enter manually.${NC}"
                read -p "Enter server IP: " SERVER_IP
            fi
            ;;
        2)
            if [[ -n "$LOCAL_IP" ]]; then
                SERVER_IP="$LOCAL_IP"
            else
                echo -e "${RED}Local IP not detected. Please enter manually.${NC}"
                read -p "Enter server IP: " SERVER_IP
            fi
            ;;
        3)
            read -p "Enter custom IP: " SERVER_IP
            ;;
        *)
            echo -e "${RED}Invalid choice. Using local IP.${NC}"
            SERVER_IP="$LOCAL_IP"
            ;;
    esac
    
    echo -e "${GREEN}Using server IP: $SERVER_IP${NC}"
}

# Function to create optimized ConfigMap for external access
create_external_configmap() {
    echo -e "${CYAN}Creating optimized ConfigMap for external access...${NC}"
    
    cat > k8s/configmaps/auction-configmap-external.yaml << EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: auction-config
  namespace: auction-system
data:
  # Environment
  NODE_ENV: "production"
  
  # NATS Configuration
  NATS_URL: "nats://nats-streaming.auction-infrastructure.svc.cluster.local:4222"
  NATS_CLUSTER_ID: "auction"
  
  # Redis Configuration
  REDIS_HOST: "redis.auction-infrastructure.svc.cluster.local"
  REDIS_PORT: "6379"
  REDIS_URL: "redis://redis.auction-infrastructure.svc.cluster.local:6379"
  
  # Database Host Configuration
  AUTH_MYSQL_HOST: "auth-mysql.auction-infrastructure.svc.cluster.local"
  BID_MYSQL_HOST: "bid-mysql.auction-infrastructure.svc.cluster.local"
  LISTINGS_MYSQL_HOST: "listings-mysql.auction-infrastructure.svc.cluster.local"
  PAYMENTS_MYSQL_HOST: "payments-mysql.auction-infrastructure.svc.cluster.local"
  PROFILE_MYSQL_HOST: "profile-mysql.auction-infrastructure.svc.cluster.local"
  MYSQL_PORT: "3306"
  
  # Service URLs (Internal cluster communication)
  AUTH_SERVICE_URL: "http://auth-service.auction-system.svc.cluster.local:3101"
  BID_SERVICE_URL: "http://bid-service.auction-system.svc.cluster.local:3102"
  LISTINGS_SERVICE_URL: "http://listings-service.auction-system.svc.cluster.local:3103"
  PAYMENTS_SERVICE_URL: "http://payments-service.auction-system.svc.cluster.local:3104"
  PROFILE_SERVICE_URL: "http://profile-service.auction-system.svc.cluster.local:3105"
  EMAIL_SERVICE_URL: "http://email-service.auction-system.svc.cluster.local:3106"
  SAGA_ORCHESTRATOR_URL: "http://saga-orchestrator-service.auction-system.svc.cluster.local:3108"
  
  # AWS Configuration
  AWS_REGION: "us-east-1"
  
  # CORS Configuration (Updated for external access)
  CORS_ORIGIN: "http://localhost:3000,http://localhost:3001,http://${SERVER_IP}:3000,http://${SERVER_IP}:3001,http://${SERVER_IP},https://${SERVER_IP}:3000,https://${SERVER_IP}:3001,https://${SERVER_IP}"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: auction-system
data:
  # External access configuration
  NEXT_PUBLIC_API_URL: "http://${SERVER_IP}:3001"
  NEXT_PUBLIC_API_GATEWAY_PORT: "3001"
  SERVER_API_URL: "http://api-gateway-service.auction-system.svc.cluster.local:3001"
  NEXT_PUBLIC_SERVER_IP: "${SERVER_IP}"
  NEXT_PUBLIC_LISTINGS_SOCKET_URL: "ws://${SERVER_IP}:3001"
  WATCHPACK_POLLING: "true"
EOF

    echo -e "${GREEN}✓ External access ConfigMap created${NC}"
}

# Function to create external access services
create_external_services() {
    echo -e "${CYAN}Creating external access service configurations...${NC}"
    
    # Create NodePort service for frontend
    cat > k8s/services/frontend-external-service.yaml << EOF
apiVersion: v1
kind: Service
metadata:
  name: frontend-external-service
  namespace: auction-system
  labels:
    app: frontend
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
  - port: 3000
    targetPort: 3000
    nodePort: 30000
    name: http
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-external-service
  namespace: auction-system
  labels:
    app: api-gateway
spec:
  type: NodePort
  selector:
    app: api-gateway
  ports:
  - port: 3001
    targetPort: 3001
    nodePort: 30001
    name: http
EOF

    echo -e "${GREEN}✓ External access services created${NC}"
}

# Function to create ingress for external access
create_external_ingress() {
    echo -e "${CYAN}Creating external access ingress configuration...${NC}"
    
    cat > k8s/ingress/auction-external-ingress.yaml << EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: auction-external-ingress
  namespace: auction-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/cors-allow-origin: "http://${SERVER_IP}:3000,http://${SERVER_IP}:3001,http://${SERVER_IP}"
    nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
    nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
    nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization"
spec:
  ingressClassName: nginx
  rules:
  - host: ${SERVER_IP}
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
  # Additional rule for IP access without host
  - http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 3001
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 3000
EOF

    echo -e "${GREEN}✓ External access ingress created${NC}"
}

# Function to create startup scripts
create_startup_scripts() {
    echo -e "${CYAN}Creating startup and management scripts...${NC}"
    
    # Create port forwarding script
    cat > scripts/start-external-access.sh << 'EOF'
#!/bin/bash

# Kill existing port forwards
echo "Stopping existing port forwards..."
pkill -f "kubectl port-forward" 2>/dev/null || true

# Wait a moment for processes to stop
sleep 2

echo "Starting external access port forwarding..."

# Start port forwards for external access
nohup kubectl port-forward --address 0.0.0.0 -n auction-system svc/frontend-service 3000:3000 > /tmp/frontend-port-forward.log 2>&1 &
FRONTEND_PID=$!

nohup kubectl port-forward --address 0.0.0.0 -n auction-system svc/api-gateway-service 3001:3001 > /tmp/api-gateway-port-forward.log 2>&1 &
API_GATEWAY_PID=$!

# Save PIDs for later management
echo $FRONTEND_PID > /tmp/frontend-port-forward.pid
echo $API_GATEWAY_PID > /tmp/api-gateway-port-forward.pid

echo "Port forwarding started!"
echo "Frontend PID: $FRONTEND_PID"
echo "API Gateway PID: $API_GATEWAY_PID"
echo ""
echo "Access your application at:"
echo "Frontend: http://SERVER_IP_PLACEHOLDER:3000"
echo "API Gateway: http://SERVER_IP_PLACEHOLDER:3001"
echo ""
echo "To stop port forwarding, run: ./scripts/stop-external-access.sh"
EOF

    # Replace placeholder with actual server IP
    sed -i "s/SERVER_IP_PLACEHOLDER/${SERVER_IP}/g" scripts/start-external-access.sh
    
    # Create stop script
    cat > scripts/stop-external-access.sh << 'EOF'
#!/bin/bash

echo "Stopping external access port forwarding..."

# Kill port forward processes
pkill -f "kubectl port-forward" 2>/dev/null || true

# Remove PID files
rm -f /tmp/frontend-port-forward.pid
rm -f /tmp/api-gateway-port-forward.pid
rm -f /tmp/frontend-port-forward.log
rm -f /tmp/api-gateway-port-forward.log

echo "Port forwarding stopped."
EOF

    # Create status check script
    cat > scripts/check-external-access.sh << 'EOF'
#!/bin/bash

echo "=== External Access Status Check ==="
echo ""

# Check if port forwards are running
if pgrep -f "kubectl port-forward" > /dev/null; then
    echo " Port forwarding is active"
    echo "Active port forwards:"
    ps aux | grep "kubectl port-forward" | grep -v grep
else
    echo " Port forwarding is not active"
    echo "Run ./scripts/start-external-access.sh to start"
fi

echo ""

# Check if services are accessible
echo " Testing external access..."
echo ""

SERVER_IP="SERVER_IP_PLACEHOLDER"

# Test frontend
if curl -s --max-time 5 "http://${SERVER_IP}:3000" > /dev/null; then
    echo " Frontend accessible at http://${SERVER_IP}:3000"
else
    echo " Frontend not accessible at http://${SERVER_IP}:3000"
fi

# Test API Gateway
if curl -s --max-time 5 "http://${SERVER_IP}:3001/health" > /dev/null; then
    echo " API Gateway accessible at http://${SERVER_IP}:3001"
else
    echo " API Gateway not accessible at http://${SERVER_IP}:3001"
fi

echo ""
echo "=== Pod Status ==="
kubectl get pods -n auction-system -o wide

echo ""
echo "=== Service Status ==="
kubectl get svc -n auction-system
EOF

    # Replace placeholder with actual server IP
    sed -i "s/SERVER_IP_PLACEHOLDER/${SERVER_IP}/g" scripts/check-external-access.sh

    # Make scripts executable
    chmod +x scripts/start-external-access.sh
    chmod +x scripts/stop-external-access.sh
    chmod +x scripts/check-external-access.sh
    
    echo -e "${GREEN}✓ Management scripts created${NC}"
}

# Function to create deployment script for external access
create_deployment_script() {
    echo -e "${CYAN}Creating external access deployment script...${NC}"
    
    cat > scripts/deploy-external-access.sh << EOF
#!/bin/bash

# Deploy Auction Website with External Access Configuration
set -e

echo " Deploying Auction Website with External Access..."
echo "Server IP: ${SERVER_IP}"
echo ""

# Navigate to k8s directory
cd k8s

# Create namespaces
echo " Creating namespaces..."
kubectl apply -f namespaces.yaml

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
kubectl apply -f infrastucture/

# Wait for infrastructure
echo " Waiting for infrastructure to be ready..."
kubectl wait --for=condition=ready pod -l app=nats-streaming -n auction-infrastructure --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=redis -n auction-infrastructure --timeout=300s || true

# Deploy secrets
echo " Deploying secrets..."
kubectl apply -f secrets/

# Deploy external access ConfigMaps
echo "⚙️ Deploying external access configuration..."
kubectl apply -f configmaps/auction-configmap-external.yaml

# Deploy services
echo " Deploying services..."
kubectl apply -f services/

# Deploy external access services
echo "🌍 Deploying external access services..."
kubectl apply -f services/frontend-external-service.yaml

# Deploy deployments
echo " Deploying applications..."
kubectl apply -f deployments/

# Deploy external access ingress
echo "🔗 Deploying external access ingress..."
kubectl apply -f ingress/auction-external-ingress.yaml

echo ""
echo " Deployment completed!"
echo ""
echo " Next steps:"
echo "1. Wait for all pods to be ready: kubectl get pods --all-namespaces"
echo "2. Start external access: ./scripts/start-external-access.sh"
echo "3. Check status: ./scripts/check-external-access.sh"
echo ""
echo " Your application will be accessible at:"
echo "Frontend: http://${SERVER_IP}:3000"
echo "API Gateway: http://${SERVER_IP}:3001"

cd ..
EOF

    chmod +x scripts/deploy-external-access.sh
    
    echo -e "${GREEN}✓ External access deployment script created${NC}"
}

# Function to update server IP in existing files
update_server_ip() {
    echo -e "${CYAN}Updating server IP in configuration files...${NC}"
    
    # Create update script
    cat > scripts/update-server-ip.sh << 'EOF'
#!/bin/bash

if [ -z "$1" ]; then
    echo "Usage: $0 <SERVER_IP>"
    exit 1
fi

NEW_SERVER_IP="$1"
echo "Updating server IP to: $NEW_SERVER_IP"

# Update ConfigMap
if [ -f "k8s/configmaps/auction-configmap-external.yaml" ]; then
    sed -i "s/SERVER_IP_PLACEHOLDER/${NEW_SERVER_IP}/g" k8s/configmaps/auction-configmap-external.yaml
    sed -i "s/http:\/\/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}/http:\/\/${NEW_SERVER_IP}/g" k8s/configmaps/auction-configmap-external.yaml
fi

# Update ingress
if [ -f "k8s/ingress/auction-external-ingress.yaml" ]; then
    sed -i "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}/${NEW_SERVER_IP}/g" k8s/ingress/auction-external-ingress.yaml
fi

# Update scripts
for script in scripts/start-external-access.sh scripts/check-external-access.sh; do
    if [ -f "$script" ]; then
        sed -i "s/SERVER_IP_PLACEHOLDER/${NEW_SERVER_IP}/g" "$script"
        sed -i "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}/${NEW_SERVER_IP}/g" "$script"
    fi
done

echo " Server IP updated successfully!"
EOF

    chmod +x scripts/update-server-ip.sh
    
    echo -e "${GREEN}✓ IP update script created${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting configuration for external access...${NC}"
    
    # Create scripts directory if it doesn't exist
    mkdir -p scripts
    
    # Get server IP
    get_server_ip
    
    # Create configurations
    create_external_configmap
    create_external_services
    create_external_ingress
    create_startup_scripts
    create_deployment_script
    update_server_ip
    
    echo ""
    echo -e "${GREEN} Configuration completed successfully!${NC}"
    echo ""
    echo -e "${CYAN} Next steps:${NC}"
    echo -e "1. ${YELLOW}Deploy the application:${NC} ./scripts/deploy-external-access.sh"
    echo -e "2. ${YELLOW}Start external access:${NC} ./scripts/start-external-access.sh"
    echo -e "3. ${YELLOW}Check status:${NC} ./scripts/check-external-access.sh"
    echo ""
    echo -e "${CYAN} Your application will be accessible at:${NC}"
    echo -e "Frontend: ${GREEN}http://${SERVER_IP}:3000${NC}"
    echo -e "API Gateway: ${GREEN}http://${SERVER_IP}:3001${NC}"
    echo ""
    echo -e "${YELLOW}💡 Tips:${NC}"
    echo -e "- Make sure ports 3000 and 3001 are open in your firewall"
    echo -e "- Use './scripts/check-external-access.sh' to verify everything is working"
    echo -e "- Check logs with: kubectl logs -f deployment/frontend -n auction-system"
}

# Run main function
main
