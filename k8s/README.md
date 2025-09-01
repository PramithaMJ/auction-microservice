# Kubernetes Deployment Guide for Auction Website

This guide provides comprehensive instructions for deploying the Auction Website micr```bash
# Apply configuration
kubectl apply -f configmaps/auction-configmap.yaml
kubectl apply -f configmaps/mysql-init-scripts.yaml
```

#### 3.2 Secrets

```bash
# ⚠️ IMPORTANT: Update secrets before applying
# Edit secrets/auction-secrets.yaml with your actual values
kubectl apply -f secrets/auction-secrets.yamlchitecture on Kubernetes.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Configuration](#configuration)
- [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
- [Scaling](#scaling)
- [Cleanup](#cleanup)

## Prerequisites

### Required Tools

- **Kubernetes Cluster** (v1.20+)
  - Local: Minikube, Kind, or Docker Desktop
  - Cloud: EKS, GKE, AKS
- **kubectl** CLI tool
- **Docker** (for building images)
- **NGINX Ingress Controller**

### System Requirements

- **CPU**: 4+ cores
- **Memory**: 8GB+ RAM
- **Storage**: 20GB+ available space

### Verify Prerequisites

```bash
# Check kubectl
kubectl version --client

# Check cluster access
kubectl cluster-info

# Verify nodes
kubectl get nodes
```

## Architecture Overview

The auction website consists of:

### Microservices (auction-system namespace)

- **API Gateway** (Port 3001) - Entry point and routing
- **Auth Service** (Port 3101) - Authentication and authorization
- **Bid Service** (Port 3102) - Bid management
- **Listings Service** (Port 3103) - Auction listings
- **Payments Service** (Port 3104) - Payment processing
- **Profile Service** (Port 3105) - User profiles
- **Email Service** (Port 3106) - Email notifications
- **Expiration Service** (Port 3107) - Auction expiry handling
- **Saga Orchestrator** (Port 3108) - Distributed transactions
- **Frontend** (Port 3000) - Next.js web application

### Infrastructure (auction-infrastructure namespace)

- **MySQL Databases** (5 instances for different services)
- **NATS Streaming** - Message broker
- **Redis** - Caching and session storage

## Quick Start

### Option 1: One-Command Deployment

```bash
# From the project root directory
./k8s/deploy-all.sh
```

### Option 2: Manual Step-by-Step Deployment

Follow the [Detailed Deployment Steps](#detailed-deployment-steps) below.

## Detailed Deployment Steps

### Step 1: Create Namespaces

```bash
# Create namespaces
kubectl create namespace auction-infrastructure
kubectl create namespace auction-system
```

### Step 2: Deploy Infrastructure Components

#### 2.1 Storage Classes and Persistent Volumes

```bash
kubectl apply -f infrastucture/storageclass.yaml
kubectl apply -f infrastucture/mysql-pvcs.yaml
```

#### 2.2 MySQL Databases

```bash
# Deploy MySQL instances for each service
kubectl apply -f infrastucture/auth-mysql.yaml
kubectl apply -f infrastucture/bid-mysql.yaml
kubectl apply -f infrastucture/listings-mysql.yaml
kubectl apply -f infrastucture/payments-mysql.yaml
kubectl apply -f infrastucture/profile-mysql.yaml

# Wait for MySQL pods to be ready
kubectl wait --for=condition=ready pod -l app=auth-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=bid-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=listings-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=payments-mysql -n auction-infrastructure --timeout=300s
kubectl wait --for=condition=ready pod -l app=profile-mysql -n auction-infrastructure --timeout=300s
```

#### 2.3 NATS Streaming Server

```bash
kubectl apply -f infrastucture/nats-streaming.yaml
kubectl wait --for=condition=ready pod -l app=nats-streaming -n auction-infrastructure --timeout=300s
```

#### 2.4 Redis

```bash
kubectl apply -f infrastucture/redis.yaml
kubectl wait --for=condition=ready pod -l app=redis -n auction-infrastructure --timeout=300s
```

### Step 3: Configure Application

#### 3.1 ConfigMaps

```bash
# Apply configuration
kubectl apply -f k8s/configmaps/auction-configmap.yaml
kubectl apply -f k8s/configmaps/mysql-init-scripts.yaml
```

#### 3.2 Secrets

```bash
# IMPORTANT: Update secrets before applying
# Edit k8s/secrets/auction-secrets.yaml with your actual values
kubectl apply -f k8s/secrets/auction-secrets.yaml
```

### Step 4: Deploy Microservices

#### 4.1 Core Services

```bash
# Deploy all microservices
kubectl apply -f deployments/auth.yaml
kubectl apply -f deployments/bid.yaml
kubectl apply -f deployments/listings.yaml
kubectl apply -f deployments/payments.yaml
kubectl apply -f deployments/profile.yaml
kubectl apply -f deployments/email.yaml
kubectl apply -f deployments/expiration.yaml
kubectl apply -f deployments/saga-orchestrator.yaml

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l app=auth -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=bid -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=listings -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=payments -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=profile -n auction-system --timeout=300s
```

#### 4.2 API Gateway

```bash
kubectl apply -f deployments/api-gateway.yaml
kubectl wait --for=condition=ready pod -l app=api-gateway -n auction-system --timeout=300s
```

#### 4.3 Frontend

```bash
kubectl apply -f deployments/frontend.yaml
kubectl wait --for=condition=ready pod -l app=frontend -n auction-system --timeout=300s
```

### Step 5: Create Services

```bash
# Create all services
kubectl apply -f services/api-gateway-service.yaml
kubectl apply -f services/frontend-service.yaml
kubectl apply -f services/microservices-services.yaml
```

### Step 6: Setup Ingress

#### 6.1 Install NGINX Ingress Controller (if not installed)

```bash
# For Minikube
minikube addons enable ingress

# For other clusters
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

#### 6.2 Apply Ingress Rules

```bash
kubectl apply -f ingress/auction-ingress.yaml
```

### Step 7: Verify Deployment

```bash
# Check all pods
kubectl get pods -n auction-infrastructure
kubectl get pods -n auction-system

# Check services
kubectl get svc -n auction-infrastructure
kubectl get svc -n auction-system

# Check ingress
kubectl get ingress -n auction-system
```

## Configuration

### Environment-Specific Configurations

#### Development

```bash
# Update configmap for development
kubectl patch configmap auction-config -n auction-system --patch '{"data":{"NODE_ENV":"development"}}'
```

#### Production

```bash
# Update configmap for production
kubectl patch configmap auction-config -n auction-system --patch '{"data":{"NODE_ENV":"production"}}'
```

### External Access Configuration

#### 1. Update External IP/Domain

Edit `configmaps/auction-configmap.yaml`:

```yaml
# Replace with your actual domain or IP
NEXT_PUBLIC_SERVER_IP: "your-domain.com"
NEXT_PUBLIC_API_URL: "http://your-domain.com:3001"
```

#### 2. Update CORS Settings

Edit `configmaps/auction-configmap.yaml`:

```yaml
CORS_ORIGIN: "http://your-domain.com:3000,http://your-domain.com:3001"
```

#### 3. Update Ingress

Edit `ingress/auction-ingress.yaml`:

```yaml
metadata:
  annotations:
    nginx.ingress.kubernetes.io/cors-allow-origin: "http://your-domain.com:3000"
```

### Secret Management

#### Update Database Credentials

```bash
# Create new secret with your credentials
kubectl create secret generic auction-secrets \
  --from-literal=MYSQL_ROOT_PASSWORD=your_root_password \
  --from-literal=MYSQL_PASSWORD=your_user_password \
  --from-literal=JWT_KEY=your_jwt_secret \
  -n auction-system --dry-run=client -o yaml | kubectl apply -f -
```

#### AWS Configuration

```bash
# Update AWS credentials in secrets
kubectl patch secret auction-secrets -n auction-system --patch '{"stringData":{"AWS_ACCESS_KEY_ID":"your_access_key","AWS_SECRET_ACCESS_KEY":"your_secret_key"}}'
```

## Monitoring and Troubleshooting

### Check Pod Status

```bash
# View all pods
kubectl get pods -A

# Check pod logs
kubectl logs -f deployment/api-gateway -n auction-system
kubectl logs -f deployment/auth -n auction-system

# Describe problematic pods
kubectl describe pod <pod-name> -n <namespace>
```

### Database Connectivity

```bash
# Test MySQL connection
kubectl exec -it deployment/auth-mysql -n auction-infrastructure -- mysql -u root -p

# Check database initialization
kubectl logs deployment/auth-mysql -n auction-infrastructure
```

### Service Connectivity

```bash
# Test service connectivity
kubectl exec -it deployment/api-gateway -n auction-system -- curl http://auth-service:3101/health

# Port forward for debugging
kubectl port-forward svc/api-gateway-service 3001:3001 -n auction-system
```

### Common Issues and Solutions

#### 1. ImagePullBackOff

```bash
# Check if images exist
docker pull pramithamj/auction-website-ms-auth:latest

# Update image policy
kubectl patch deployment auth -n auction-system --patch '{"spec":{"template":{"spec":{"containers":[{"name":"auth","imagePullPolicy":"Always"}]}}}}'
```

#### 2. Database Connection Issues

```bash
# Check MySQL service
kubectl get svc -n auction-infrastructure | grep mysql

# Verify environment variables
kubectl exec deployment/auth -n auction-system -- env | grep MYSQL
```

#### 3. NATS Connection Issues

```bash
# Check NATS logs
kubectl logs deployment/nats-streaming -n auction-infrastructure

# Test NATS connectivity
kubectl exec -it deployment/auth -n auction-system -- nc -zv nats-streaming.auction-infrastructure.svc.cluster.local 4222
```

## Scaling

### Horizontal Pod Autoscaling

```bash
# Enable HPA for API Gateway
kubectl autoscale deployment api-gateway --cpu-percent=70 --min=2 --max=10 -n auction-system

# Enable HPA for other services
kubectl autoscale deployment auth --cpu-percent=70 --min=1 --max=5 -n auction-system
kubectl autoscale deployment bid --cpu-percent=70 --min=1 --max=5 -n auction-system
kubectl autoscale deployment listings --cpu-percent=70 --min=1 --max=5 -n auction-system
```

### Manual Scaling

```bash
# Scale specific services
kubectl scale deployment api-gateway --replicas=3 -n auction-system
kubectl scale deployment frontend --replicas=2 -n auction-system
```

### Resource Monitoring

```bash
# Check resource usage
kubectl top pods -n auction-system
kubectl top pods -n auction-infrastructure

# Monitor HPA status
kubectl get hpa -n auction-system
```

## Cleanup

### Remove Everything

```bash
# Delete application
kubectl delete namespace auction-system

# Delete infrastructure
kubectl delete namespace auction-infrastructure

# Delete persistent volumes (optional)
kubectl delete pv --all
```

### Partial Cleanup

```bash
# Remove only deployments
kubectl delete deployments --all -n auction-system

# Remove only services
kubectl delete services --all -n auction-system
```

## Advanced Configuration

### Custom Domain Setup

1. Update DNS records to point to your cluster's ingress IP
2. Update configmaps with your domain
3. Consider SSL/TLS certificates for HTTPS

### Production Hardening

1. Use secrets management (e.g., HashiCorp Vault)
2. Enable pod security policies
3. Configure network policies
4. Set up monitoring (Prometheus + Grafana)
5. Configure log aggregation (ELK stack)

### Backup Strategy

1. Database backups using MySQL operators
2. Persistent volume snapshots
3. Configuration backups
