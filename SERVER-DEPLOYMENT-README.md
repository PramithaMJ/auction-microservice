# Server Deployment Guide - Auction Website

This guide provides step-by-step instructions to deploy the Auction Website to your AWS EC2 Minikube instance and expose it to external traffic.

## Server Information
- **Instance ID:** i-0e201ef45ad9c5255
- **Public IPv4:** 100.29.35.176
- **Private IPv4:** 172.31.37.89

## Prerequisites

### On Your Local Machine
1. AWS CLI configured with appropriate permissions
2. kubectl installed and configured
3. Access to the EC2 instance via SSH

### On The Server (EC2 Instance)
1. Minikube installed and running
2. Docker installed
3. kubectl installed

## Deployment Steps

### Step 1: Connect to Your Server

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@100.29.35.176
```

### Step 2: Prepare the Server Environment

```bash
# Start minikube if not already running
minikube start --driver=docker --memory=8192 --cpus=4

# Verify minikube is running
minikube status

# Enable required addons
minikube addons enable ingress
minikube addons enable dashboard
```

### Step 3: Deploy from Your Local Machine

```bash
# Navigate to the project directory
cd /Users/pramithajayasooriya/Desktop/Final-auction/auction-website

# Make scripts executable
chmod +x scripts/deploy-server.sh
chmod +x scripts/configure-external-access-server.sh

# Deploy the application
./scripts/deploy-server.sh

# Configure external access
./scripts/configure-external-access-server.sh
```

## Access URLs

After successful deployment, your application will be accessible at:

### 🌐 Frontend Application
- **URL:** http://100.29.35.176:30000
- **Description:** Main auction website interface

### 🔗 API Gateway
- **URL:** http://100.29.35.176:30001
- **Description:** REST API endpoints for all microservices

### 📊 Jaeger Tracing UI
- **URL:** http://100.29.35.176:30686
- **Description:** Distributed tracing and performance monitoring

## Port Configuration

The deployment uses NodePort services to expose the following ports:

| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| Frontend | 3000 | 30000 | React.js application |
| API Gateway | 3001 | 30001 | Express.js API gateway |
| Jaeger UI | 16686 | 30686 | Tracing interface |

## Security Group Configuration

The script automatically configures AWS Security Groups to allow external access. If manual configuration is needed:

1. Go to AWS Console → EC2 → Security Groups
2. Find the security group associated with instance `i-0e201ef45ad9c5255`
3. Add the following inbound rules:

| Type | Port Range | Source | Description |
|------|------------|--------|-------------|
| Custom TCP | 30000 | 0.0.0.0/0 | Frontend access |
| Custom TCP | 30001 | 0.0.0.0/0 | API Gateway access |
| Custom TCP | 30686 | 0.0.0.0/0 | Jaeger UI access |
| HTTP | 80 | 0.0.0.0/0 | Standard HTTP |
| HTTPS | 443 | 0.0.0.0/0 | Standard HTTPS |

## Monitoring and Management

### Check Deployment Status
```bash
# Check all pods
kubectl get pods -A

# Check services
kubectl get svc -A

# Check ingress
kubectl get ingress -A

# View logs for specific service
kubectl logs -n auction-system deployment/frontend
kubectl logs -n auction-system deployment/api-gateway
```

### Access Kubernetes Dashboard
```bash
# Start dashboard proxy (run on server)
minikube dashboard

# Or access via port forward
kubectl proxy --address='0.0.0.0' --disable-filter=true
```

### Health Checks
```bash
# Test API Gateway health
curl http://100.29.35.176:30001/health

# Test specific service endpoints
curl http://100.29.35.176:30001/api/auth/health
curl http://100.29.35.176:30001/api/listings/health
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Services Not Accessible Externally
- Verify security groups are configured correctly
- Check if minikube is using the correct driver
- Ensure NodePort services are created

#### 2. Pods in Pending State
```bash
# Check pod events
kubectl describe pod <pod-name> -n <namespace>

# Check node resources
kubectl top nodes
kubectl describe node
```

#### 3. Database Connection Issues
```bash
# Check MySQL pods
kubectl get pods -n auction-infrastructure | grep mysql

# Check MySQL logs
kubectl logs -n auction-infrastructure deployment/auth-mysql
```

#### 4. NATS/Redis Connection Issues
```bash
# Check infrastructure services
kubectl get pods -n auction-infrastructure

# Restart infrastructure services if needed
kubectl rollout restart deployment/nats-streaming -n auction-infrastructure
kubectl rollout restart deployment/redis -n auction-infrastructure
```

## Scaling and Performance

### Scale Services
```bash
# Scale frontend replicas
kubectl scale deployment frontend --replicas=3 -n auction-system

# Scale API gateway
kubectl scale deployment api-gateway --replicas=2 -n auction-system
```

### Monitor Resources
```bash
# Check resource usage
kubectl top pods -A
kubectl top nodes

# View detailed metrics in Jaeger
# Visit: http://100.29.35.176:30686
```

## Backup and Maintenance

### Backup Data
```bash
# Backup MySQL databases
kubectl exec -it deployment/auth-mysql -n auction-infrastructure -- mysqldump -u root -p auth > auth_backup.sql
```

### Update Deployment
```bash
# Update image tags in deployment files
# Then reapply
kubectl apply -f k8s/deployments/

# Rolling update
kubectl rollout restart deployment/frontend -n auction-system
```

## Environment Variables

Make sure the following environment variables are properly configured in your deployments:

### API Gateway
- `AUTH_SERVICE_URL=http://auth-service:3101`
- `CORS_ORIGIN=http://100.29.35.176:30000`

### Frontend
- `NEXT_PUBLIC_API_URL=http://100.29.35.176:30001`
- `NEXT_PUBLIC_SERVER_IP=100.29.35.176`

## Support and Logs

### Centralized Logging
```bash
# View all logs from auction-system namespace
kubectl logs -f -l app.kubernetes.io/name=auction-system -n auction-system

# Follow specific service logs
kubectl logs -f deployment/api-gateway -n auction-system
```

### Performance Monitoring
- **Jaeger UI:** http://100.29.35.176:30686
- **Kubernetes Dashboard:** Access via `minikube dashboard`

## Clean Up

### Remove Deployment
```bash
# Delete all resources
kubectl delete namespace auction-system
kubectl delete namespace auction-infrastructure

# Stop minikube
minikube stop
```

---

**Note:** Remember to keep your AWS credentials secure and regularly update your security groups based on your access requirements.
