#  Auction Website - Minikube Ubuntu Server Deployment Guide

##  Complete Guide for External Access

This guide will help you deploy the auction website on Ubuntu server using Minikube with external access from anywhere.

## 🎯 What You'll Achieve

After following this guide:

-  Auction website running on Minikube in Ubuntu server
-  External access from any device/location
-  Real-time bidding and all features working
-  Production-ready setup with monitoring

##  Prerequisites

### Server Requirements

- **Ubuntu Server 20.04+ or 22.04+**
- **4GB+ RAM** (8GB recommended)
- **2+ CPU cores** (4 cores recommended)
- **20GB+ free disk space**
- **Stable internet connection**

### Network Requirements

- **Server IP address** (static preferred)
- **Ports to open**: 80, 443, 3000, 3001, 6443, 30000-32767
- **SSH access** to the server

##  Phase 1: Server Preparation

### Step 1: Connect to Your Ubuntu Server

```bash
# Connect via SSH
ssh username@YOUR_SERVER_IP

# Update system
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Required Software

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install Git (if not already installed)
sudo apt install git -y

# Logout and login again for Docker group changes
exit
```

### Step 3: Reconnect and Verify Installation

```bash
# Reconnect to server
ssh username@YOUR_SERVER_IP

# Verify installations
docker --version
kubectl version --client
minikube version
```

##  Phase 2: Project Setup

### Step 1: Clone the Repository

```bash
# Clone your repository
git clone https://github.com/pramithamj/auction-microservice.git
cd auction-website

# Or if you're uploading files, create directory
mkdir -p ~/auction-website
cd ~/auction-website
# Then upload your project files
```

### Step 2: Configure for External Access

```bash
# Make configuration script executable
chmod +x scripts/configure-external-access.sh

# Run the configuration script (creates optimized configs for external access)
./scripts/configure-external-access.sh
```

##  Phase 3: Minikube Setup for External Access

### Step 1: Start Minikube with External Configuration

```bash
# Start Minikube with specific configuration for external access
minikube start \
  --driver=docker \
  --memory=6144 \
  --cpus=4 \
  --disk-size=30g \
  --kubernetes-version=v1.28.0 \
  --extra-config=apiserver.service-node-port-range=30000-32767

# Enable required addons
minikube addons enable ingress
minikube addons enable ingress-dns
minikube addons enable metrics-server

# Verify Minikube is running
minikube status
```

### Step 2: Configure External Access

```bash
# Get Minikube IP
MINIKUBE_IP=$(minikube ip)
echo "Minikube IP: $MINIKUBE_IP"

# Configure port forwarding (run in background)
nohup kubectl port-forward --address 0.0.0.0 -n auction-system svc/frontend-service 3000:3000 &
nohup kubectl port-forward --address 0.0.0.0 -n auction-system svc/api-gateway-service 3001:3001 &
```

##  Phase 4: Application Deployment

### Step 1: Update Configuration for Your Server

```bash
# Set your server IP
export SERVER_IP="YOUR_ACTUAL_SERVER_IP"

# Update configuration files
./scripts/update-server-ip.sh $SERVER_IP
```

### Step 2: Deploy Infrastructure

```bash
# Navigate to kubernetes directory
cd k8s

# Create namespaces
kubectl apply -f namespaces.yaml

# Deploy infrastructure (databases, NATS, Redis)
kubectl apply -f infrastucture/

# Wait for infrastructure to be ready
kubectl wait --for=condition=ready pod -l app=nats-streaming -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n auction-infrastructure --timeout=300s
```

### Step 3: Deploy Application Services

```bash
# Deploy secrets and configmaps
kubectl apply -f secrets/
kubectl apply -f configmaps/

# Deploy microservices
kubectl apply -f deployments/

# Deploy services
kubectl apply -f services/

# Deploy ingress
kubectl apply -f ingress/
```

### Step 4: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n auction-system
kubectl get pods -n auction-infrastructure

# Check services
kubectl get svc -n auction-system

# Check ingress
kubectl get ingress -n auction-system
```

##  Phase 5: External Access Configuration

### Step 1: NodePort Services for External Access

```bash
# Expose frontend via NodePort
kubectl patch svc frontend-service -n auction-system -p '{"spec":{"type":"NodePort","ports":[{"port":3000,"targetPort":3000,"nodePort":30000}]}}'

# Expose API Gateway via NodePort
kubectl patch svc api-gateway-service -n auction-system -p '{"spec":{"type":"NodePort","ports":[{"port":3001,"targetPort":3001,"nodePort":30001}]}}'

# Get the NodePort details
kubectl get svc -n auction-system | grep NodePort
```

### Step 2: Setup Port Forwarding for External Access

```bash
# Create a permanent port forwarding script
cat > ~/start-port-forwarding.sh << 'EOF'
#!/bin/bash

# Kill existing port forwards
pkill -f "kubectl port-forward"

# Start new port forwards
nohup kubectl port-forward --address 0.0.0.0 -n auction-system svc/frontend-service 3000:3000 > /dev/null 2>&1 &
nohup kubectl port-forward --address 0.0.0.0 -n auction-system svc/api-gateway-service 3001:3001 > /dev/null 2>&1 &

echo "Port forwarding started:"
echo "Frontend: http://YOUR_SERVER_IP:3000"
echo "API Gateway: http://YOUR_SERVER_IP:3001"
EOF

chmod +x ~/start-port-forwarding.sh
```

### Step 3: Configure Firewall (if enabled)

```bash
# Check if UFW is active
sudo ufw status

# If UFW is active, open required ports
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 30000:32767/tcp
sudo ufw reload
```

##  Phase 6: Access and Testing

### Step 1: Start Port Forwarding

```bash
# Start the port forwarding
~/start-port-forwarding.sh
```

### Step 2: Access Your Application

Open your web browser and navigate to:

- **Main Application**: `http://YOUR_SERVER_IP:3000`
- **API Gateway**: `http://YOUR_SERVER_IP:3001`
- **API Documentation**: `http://YOUR_SERVER_IP:3001/api-docs`

### Step 3: Test All Features

1. **User Registration**: Create a new account
2. **User Login**: Login with your credentials
3. **Create Listing**: Add a new auction item
4. **Place Bids**: Test the bidding functionality
5. **Real-time Updates**: Open multiple browser tabs to test real-time bidding

##  Management Commands

### Monitoring and Maintenance

```bash
# Check pod status
kubectl get pods --all-namespaces

# Check resource usage
kubectl top pods -n auction-system
kubectl top nodes

# View logs for debugging
kubectl logs -f deployment/frontend -n auction-system
kubectl logs -f deployment/api-gateway -n auction-system

# Restart a service
kubectl rollout restart deployment/frontend -n auction-system

# Scale a service
kubectl scale deployment frontend -n auction-system --replicas=3
```

### Backup and Updates

```bash
# Backup your data
kubectl exec -n auction-infrastructure deployment/auth-mysql -- mysqldump -u root -ppassword auth > backup-auth.sql

# Update to latest images
kubectl set image deployment/frontend frontend=pramithamj/auction-website-ms-frontend:latest -n auction-system
kubectl set image deployment/api-gateway api-gateway=pramithamj/auction-website-ms-api-gateway:latest -n auction-system
```

##  Troubleshooting

### Common Issues and Solutions

#### 1. Pods Not Starting

```bash
# Check pod status and events
kubectl describe pod <pod-name> -n <namespace>
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
```

#### 2. External Access Not Working

```bash
# Check port forwarding is running
ps aux | grep "kubectl port-forward"

# Restart port forwarding
pkill -f "kubectl port-forward"
~/start-port-forwarding.sh

# Check firewall
sudo ufw status
```

#### 3. Database Connection Issues

```bash
# Check MySQL pods
kubectl get pods -n auction-infrastructure | grep mysql

# Check MySQL logs
kubectl logs -n auction-infrastructure deployment/auth-mysql

# Test database connection
kubectl exec -it -n auction-infrastructure deployment/auth-mysql -- mysql -u root -ppassword -e "SHOW DATABASES;"
```

#### 4. Memory or CPU Issues

```bash
# Check resource usage
kubectl top pods --all-namespaces
kubectl top nodes

# If resources are low, reduce replicas
kubectl scale deployment frontend -n auction-system --replicas=1
kubectl scale deployment api-gateway -n auction-system --replicas=1
```

##  Auto-Start Setup

### Create Systemd Service for Auto-Start

```bash
# Create systemd service for Minikube
sudo tee /etc/systemd/system/minikube.service > /dev/null << EOF
[Unit]
Description=Minikube Kubernetes Cluster
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=true
ExecStart=/usr/local/bin/minikube start --driver=docker --memory=6144 --cpus=4
ExecStop=/usr/local/bin/minikube stop
User=$USER
Group=docker

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service for port forwarding
sudo tee /etc/systemd/system/auction-port-forward.service > /dev/null << EOF
[Unit]
Description=Auction Website Port Forwarding
After=minikube.service
Requires=minikube.service

[Service]
Type=simple
ExecStart=/home/$USER/start-port-forwarding.sh
Restart=always
RestartSec=10
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
sudo systemctl daemon-reload
sudo systemctl enable minikube.service
sudo systemctl enable auction-port-forward.service
```

##  Monitoring and Logs

### Setup Log Monitoring

```bash
# Create log monitoring script
cat > ~/monitor-logs.sh << 'EOF'
#!/bin/bash
echo "=== Auction Website Logs Monitor ==="
echo "Press Ctrl+C to stop"
echo "=================================="

# Function to show logs for all services
show_logs() {
    echo "--- Frontend Logs ---"
    kubectl logs --tail=5 -n auction-system deployment/frontend
    echo "--- API Gateway Logs ---"
    kubectl logs --tail=5 -n auction-system deployment/api-gateway
    echo "--- Auth Service Logs ---"
    kubectl logs --tail=5 -n auction-system deployment/auth
    echo "=================================="
}

# Monitor logs every 30 seconds
while true; do
    show_logs
    sleep 30
done
EOF

chmod +x ~/monitor-logs.sh
```

##  Success Indicators

Your deployment is successful when:

1.  All pods show `Running` status: `kubectl get pods --all-namespaces`
2.  Frontend accessible at: `http://YOUR_SERVER_IP:3000`
3.  API Gateway accessible at: `http://YOUR_SERVER_IP:3001`
4.  You can register new users
5.  You can create auction listings
6.  Real-time bidding works
7.  All microservices are communicating

##  Security Considerations

### Production Security Checklist

- [ ]  Change default passwords in `k8s/secrets/auction-secrets.yaml`
- [ ]  Use proper SSL certificates
- [ ]  Configure network policies
- [ ]  Set up proper backup strategy
- [ ]  Monitor resource usage
- [ ]  Regular security updates
- [ ]  Use secrets management
- [ ]  Enable audit logging

##  Get Help

If you encounter issues:

1. **Check the logs**: `kubectl logs <pod-name> -n <namespace>`
2. **Check pod status**: `kubectl describe pod <pod-name> -n <namespace>`
3. **Check events**: `kubectl get events -n <namespace> --sort-by='.lastTimestamp'`
4. **Check resources**: `kubectl top pods --all-namespaces`

##  Congratulations!

You now have a fully functional auction website running on Minikube with external access!

Your application URLs:

- **Main Application**: `http://YOUR_SERVER_IP:3000`
- **API Gateway**: `http://YOUR_SERVER_IP:3001`
- **API Documentation**: `http://YOUR_SERVER_IP:3001/api-docs`

---

**Ready to scale or need advanced features?** Check out the Kubernetes production deployment guide in `k8s/PRODUCTION-DEPLOYMENT.md`
