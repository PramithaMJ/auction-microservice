# Auction Microservice EKS Deployment Guide

This guide provides step-by-step instructions to deploy the auction microservice application on Amazon EKS from scratch.

## Prerequisites

- AWS CLI v2.x installed and configured
- kubectl v1.28+
- Terraform v1.5+
- Docker Desktop
- Helm v3.x
- Git

## AWS Account Requirements

- Administrator access or permissions for:
  - EKS cluster creation
  - VPC and networking resources
  - IAM roles and policies
  - EC2 instances
  - Load balancers

## Architecture

The application consists of:

- 9 microservices (API Gateway, Auth, Bid, Listings, Payments, Profile, Email, Expiration, Saga Orchestrator)
- 5 MySQL database instances
- NATS Streaming for event communication
- Redis for caching
- React frontend
- NGINX Ingress Controller

## Step 1: Clone Repository

```bash
git clone https://github.com/PramithaMJ/auction-microservice.git
cd auction-microservice
```

## Step 2: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, region, and output format
```

Verify configuration:

```bash
aws sts get-caller-identity
```

## Step 3: Infrastructure Setup with Terraform

### 3.1 Navigate to Infrastructure Directory

```bash
cd infra
```

### 3.2 Initialize Terraform

```bash
terraform init
```

### 3.3 Review and Modify Variables (Optional)

```bash
# Edit variables.tf if needed
vim variables.tf
```

Default configuration:

- Region: us-east-2
- Cluster name: auction-site-cluster
- Kubernetes version: 1.33
- Instance type: t3.xlarge
- VPC CIDR: 10.0.0.0/16

### 3.4 Plan and Apply Infrastructure

```bash
terraform plan
terraform apply
```

This creates:

- VPC with public/private subnets
- EKS cluster
- Managed node group
- Security groups
- IAM roles and policies

### 3.5 Update kubeconfig

```bash
aws eks update-kubeconfig --region us-east-2 --name auction-site-cluster
```

Verify cluster access:

```bash
kubectl get nodes
```

## Step 4: Install Required Add-ons

### 4.1 Install NGINX Ingress Controller

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml
```

Wait for ingress controller to be ready:

```bash
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s
```

### 4.2 Install Metrics Server (for HPA/VPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### 4.3 Install Vertical Pod Autoscaler (Optional)

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler/
./hack/vpa-up.sh
cd ../../../
```

## Step 5: Application Deployment

### 5.1 Create Namespace

```bash
kubectl apply -f k8s/namespaces.yaml
```

### 5.2 Configure Application Secrets

```bash
# Copy example secrets file
cp k8s/secrets/auction-secrets.example.txt k8s/secrets/auction-secrets.txt

# Edit secrets with your values
vim k8s/secrets/auction-secrets.txt
```

Required secrets:

- Database passwords
- JWT secret
- Stripe API keys
- Email service credentials

Create secrets in cluster:

```bash
kubectl create secret generic auction-secrets \
  --from-env-file=k8s/secrets/auction-secrets.txt \
  -n auction-system
```

### 5.3 Deploy Infrastructure Components

```bash
# Storage classes and persistent volumes
kubectl apply -f k8s/infrastructure/storageclass.yaml
kubectl apply -f k8s/infrastructure/mysql-pvcs.yaml

# MySQL databases
kubectl apply -f k8s/infrastructure/auth-mysql.yaml
kubectl apply -f k8s/infrastructure/bid-mysql.yaml
kubectl apply -f k8s/infrastructure/listings-mysql.yaml
kubectl apply -f k8s/infrastructure/payments-mysql.yaml
kubectl apply -f k8s/infrastructure/profile-mysql.yaml

# Message broker and cache
kubectl apply -f k8s/infrastructure/nats-streaming.yaml
kubectl apply -f k8s/infrastructure/redis.yaml
```

Wait for databases to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=auth-mysql -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=bid-mysql -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=listings-mysql -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=payments-mysql -n auction-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=profile-mysql -n auction-system --timeout=300s
```

### 5.4 Initialize Database Schemas

```bash
kubectl apply -f k8s/configmaps/mysql-init-scripts.yaml
```

### 5.5 Deploy Application Services

```bash
# ConfigMaps
kubectl apply -f k8s/configmaps/auction-configmap.yaml
kubectl apply -f k8s/configmaps/frontend-configmap.yaml

# Microservices
kubectl apply -f k8s/deployments/auth.yaml
kubectl apply -f k8s/deployments/bid.yaml
kubectl apply -f k8s/deployments/listings.yaml
kubectl apply -f k8s/deployments/payments.yaml
kubectl apply -f k8s/deployments/profile.yaml
kubectl apply -f k8s/deployments/email.yaml
kubectl apply -f k8s/deployments/expiration.yaml
kubectl apply -f k8s/deployments/saga-orchestrator.yaml
kubectl apply -f k8s/deployments/api-gateway.yaml
kubectl apply -f k8s/deployments/frontend.yaml

# Services
kubectl apply -f k8s/services/microservices-services.yaml
kubectl apply -f k8s/services/api-gateway-service.yaml
kubectl apply -f k8s/services/frontend-service.yaml
```

### 5.6 Deploy Auto-scaling (Optional)

```bash
kubectl apply -f k8s/auto-scaling/hpa.yaml
kubectl apply -f k8s/auto-scaling/vpa.yaml
```

### 5.7 Get Load Balancer URL

```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Note the EXTERNAL-IP value. Update the ingress configuration:

```bash
# Edit ingress file with your load balancer URL
vim k8s/ingress/auction-ingress.yaml
```

Replace the host value with your load balancer URL.

### 5.8 Deploy Ingress

```bash
kubectl apply -f k8s/ingress/auction-ingress.yaml
```

## Step 6: Verification

### 6.1 Check Pod Status

```bash
kubectl get pods -n auction-system
```

All pods should be in Running status.

### 6.2 Check Services

```bash
kubectl get svc -n auction-system
```

### 6.3 Check Ingress

```bash
kubectl get ingress -n auction-system
```

### 6.4 Access Application

```bash
# Get the load balancer URL
kubectl get ingress auction-ingress -n auction-system
```

Access the application using the ADDRESS shown in the ingress output.

## Step 7: Monitoring and Logging (Optional)

### 7.1 Deploy Jaeger for Tracing

```bash
kubectl apply -f k8s/infrastructure/jaeger.yaml
```

### 7.2 Deploy DataDog Agent (if using DataDog)

```bash
kubectl apply -f k8s/monitoring/datadog-agent.yaml
```

## Troubleshooting

### Check Pod Logs

```bash
kubectl logs <pod-name> -n auction-system
```

### Check Events

```bash
kubectl get events -n auction-system --sort-by='.lastTimestamp'
```

### Debug Services

```bash
kubectl describe svc <service-name> -n auction-system
```

### Check Ingress Controller Logs

```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Cleanup

To destroy all resources:

```bash
# Delete Kubernetes resources
kubectl delete namespace auction-system

# Delete infrastructure
cd infra
terraform destroy
```
