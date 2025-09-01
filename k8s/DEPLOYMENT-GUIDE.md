# Complete Kubernetes Deployment Guide for Auction Website

## 🚀 Complete Deployment Guide

This guide provides step-by-step instructions to deploy the auction website microservices on Kubernetes.

## 📋 Prerequisites

### Required Software
- **Kubernetes Cluster** (v1.20+)
  - Cloud: AWS EKS, Google GKE, Azure AKS
  - Local: Minikube, Kind, Docker Desktop
- **kubectl** CLI tool
- **NGINX Ingress Controller**
- **Docker** (for building custom images)

### System Requirements
- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 20GB+ available space

### Verify Prerequisites

```bash
# Check kubectl installation
kubectl version --client

# Check cluster connectivity
kubectl cluster-info

# Check if you have admin permissions
kubectl auth can-i '*' '*'
```

## 🔧 Configuration Before Deployment

### Step 1: Clone and Navigate
```bash
cd /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/k8s
```

### Step 2: Configure Your Deployment
```bash
# Run the configuration script
./configure-deployment.sh
```

This script will prompt you for:
- **Server IP Address**: Your server's public IP
- **AWS Credentials** (optional): For S3 file uploads
- **Stripe API Key** (optional): For payment processing

### Step 3: Manual Configuration (Alternative)

If you prefer manual configuration, update these files:

#### Update Server IP in ConfigMaps:
```bash
# Edit configmaps/auction-configmap.yaml
# Replace YOUR_SERVER_IP with your actual server IP
```

#### Update Secrets:
```bash
# Edit secrets/auction-secrets.yaml
# Update AWS credentials, Stripe key, and other sensitive data
```

## 🚀 Deployment Steps

### Step 1: Install NGINX Ingress Controller

For cloud providers:
```bash
# For AWS EKS
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml

# For Google GKE
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/gce/deploy.yaml

# For Azure AKS
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aks/deploy.yaml
```

For local development:
```bash
# For Minikube
minikube addons enable ingress

# For Kind
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/kind/deploy.yaml
```

### Step 2: Deploy the Application

```bash
# Make deployment script executable
chmod +x deploy-all.sh

# Run the complete deployment
./deploy-all.sh
```

### Step 3: Monitor Deployment Progress

```bash
# Check deployment status
kubectl get pods -n auction-system
kubectl get pods -n auction-infrastructure

# Check services
kubectl get svc -n auction-system
kubectl get svc -n auction-infrastructure

# Check ingress
kubectl get ingress -n auction-system
```

## 🔍 Verification and Access

### Check Application Status

```bash
# Check all pods are running
kubectl get pods --all-namespaces | grep auction

# Check services
kubectl get svc -n auction-system -o wide

# Check ingress controller
kubectl get pods -n ingress-nginx
```

### Access Your Application

1. **Get your LoadBalancer IP** (for cloud deployments):
```bash
kubectl get svc -n auction-system frontend-service
kubectl get ingress -n auction-system auction-ingress
```

2. **Access URLs**:
   - **Frontend**: `http://YOUR_SERVER_IP:3000` or `http://YOUR_SERVER_IP`
   - **API Gateway**: `http://YOUR_SERVER_IP:3001`
   - **API Documentation**: `http://YOUR_SERVER_IP:3001/api-docs`

### For Local Development (Port Forwarding)

If you're testing locally or don't have a LoadBalancer:

```bash
# Forward frontend
kubectl port-forward -n auction-system svc/frontend-service 3000:3000

# Forward API gateway
kubectl port-forward -n auction-system svc/api-gateway-service 3001:3001
```

Then access:
- Frontend: `http://localhost:3000`
- API Gateway: `http://localhost:3001`

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Pods Not Starting
```bash
# Check pod logs
kubectl logs -n auction-system <pod-name>

# Check pod describe for events
kubectl describe pod -n auction-system <pod-name>
```

#### 2. Database Connection Issues
```bash
# Check MySQL pods
kubectl get pods -n auction-infrastructure | grep mysql

# Check MySQL logs
kubectl logs -n auction-infrastructure <mysql-pod-name>

# Test database connectivity
kubectl exec -it -n auction-infrastructure <mysql-pod> -- mysql -u root -p
```

#### 3. NATS Connection Issues
```bash
# Check NATS pod
kubectl get pods -n auction-infrastructure | grep nats

# Check NATS logs
kubectl logs -n auction-infrastructure <nats-pod-name>
```

#### 4. Ingress Not Working
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress configuration
kubectl describe ingress -n auction-system auction-ingress

# Check ingress controller logs
kubectl logs -n ingress-nginx <ingress-controller-pod>
```

### Debugging Commands

```bash
# Get all resources
kubectl get all -n auction-system
kubectl get all -n auction-infrastructure

# Check events
kubectl get events -n auction-system --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n auction-system
kubectl top nodes
```

## 📈 Scaling and Performance

### Scale Services
```bash
# Scale frontend
kubectl scale deployment frontend -n auction-system --replicas=3

# Scale API gateway
kubectl scale deployment api-gateway -n auction-system --replicas=3

# Scale microservices
kubectl scale deployment auth -n auction-system --replicas=2
kubectl scale deployment bid -n auction-system --replicas=2
kubectl scale deployment listings -n auction-system --replicas=2
```

### Monitor Performance
```bash
# Install metrics server (if not installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check resource usage
kubectl top pods -n auction-system
kubectl top nodes
```

## 🔐 Security Considerations

### Update Default Passwords
1. Change MySQL root password in `secrets/auction-secrets.yaml`
2. Update JWT secret key
3. Use proper TLS certificates for production

### Network Policies (Optional)
```bash
# Apply network policies for better security
kubectl apply -f network-policies/ # (if you create them)
```

## 🧹 Cleanup

### Remove Everything
```bash
# Use the cleanup script
./cleanup-all.sh

# Or manually delete
kubectl delete namespace auction-system
kubectl delete namespace auction-infrastructure
```

### Remove Ingress Controller
```bash
kubectl delete -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml
```

## 📝 Environment-Specific Notes

### AWS EKS
- Ensure your EKS cluster has the AWS Load Balancer Controller installed
- Configure proper IAM roles for service accounts
- Use AWS RDS instead of MySQL pods for production

### Google GKE
- Enable the HTTP(S) Load Balancing add-on
- Use Google Cloud SQL for production databases

### Azure AKS
- Ensure Application Gateway Ingress Controller is configured
- Use Azure Database for MySQL for production

## 🚨 Production Considerations

1. **Use managed databases** instead of MySQL pods
2. **Implement proper TLS/SSL certificates**
3. **Set up monitoring** (Prometheus, Grafana)
4. **Configure backups** for persistent data
5. **Use Helm charts** for easier management
6. **Implement CI/CD pipelines**
7. **Set up log aggregation** (ELK stack)

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Kubernetes cluster logs
3. Ensure all prerequisites are met
4. Verify network connectivity and DNS resolution

## 🔄 Updates and Maintenance

### Updating Images
```bash
# Update image tags in deployment files
# Then apply changes
kubectl apply -f deployments/

# Or use rolling updates
kubectl set image deployment/frontend -n auction-system frontend=pramithamj/auction-website-ms-frontend:new-tag
```

### Backup and Restore
```bash
# Backup persistent volumes
# This depends on your storage class and provider

# Backup configurations
kubectl get all -n auction-system -o yaml > backup-auction-system.yaml
kubectl get all -n auction-infrastructure -o yaml > backup-infrastructure.yaml
```
