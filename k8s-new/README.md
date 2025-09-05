# Kubernetes Deployment for Auction Microservices

This directory contains Kubernetes manifests to deploy the complete auction microservices application that matches your working Docker Compose configuration.

## 📁 File Structure

```
k8s-new/
├── 00-namespace.yaml              # Namespace definition
├── 01-configmap.yaml             # Non-sensitive configuration
├── 02-secrets.yaml               # Sensitive data (passwords, keys)
├── 03-persistent-volumes.yaml    # Storage for MySQL databases
├── 04-mysql-deployments.yaml     # MySQL database deployments
├── 05-infrastructure-deployments.yaml # NATS, Redis, Jaeger
├── 06-app-deployments.yaml       # Application service deployments
├── 07-services.yaml              # Service definitions
├── 08-ingress.yaml               # Ingress configuration
├── deploy.sh                     # Automated deployment script
├── cleanup.sh                    # Cleanup script
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes cluster** running (minikube, Docker Desktop, GKE, EKS, etc.)
2. **kubectl** installed and configured
3. **NGINX Ingress Controller** (optional, for ingress access)

### 1. Update Configuration

Before deploying, update the following files with your environment-specific values:

#### `02-secrets.yaml`
```yaml
# Update these values:
MYSQL_ROOT_PASSWORD: "your_secure_mysql_password_here"
JWT_KEY: "your_super_secure_jwt_key_here_minimum_32_characters"
AWS_ACCESS_KEY_ID: "your_aws_access_key_here"
AWS_SECRET_ACCESS_KEY: "your_aws_secret_key_here"
AWS_S3_BUCKET_NAME: "your_bucket_name_here"
STRIPE_SECRET_KEY: "your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY: "your_stripe_publishable_key_here"
EMAIL: "your_email@gmail.com"
EMAIL_PASSWORD: "your_app_specific_password_here"
```

#### `01-configmap.yaml`
```yaml
# Update these values for your external access:
SERVER_IP: "your.server.ip.here"
FRONTEND_URL: "http://your.server.ip.here:3000"
NEXT_PUBLIC_API_URL: "http://your.server.ip.here:3001"
```

#### `08-ingress.yaml`
```yaml
# Update hostnames to your domain:
- host: auction.local  # Change to your domain
- host: api.auction.local  # Change to your API domain
- host: jaeger.auction.local  # Change to your Jaeger domain
```

### 2. Deploy Using Script

```bash
# Make script executable (if not already)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

### 3. Manual Deployment (Alternative)

```bash
# Deploy in order
kubectl apply -f 00-namespace.yaml
kubectl apply -f 01-configmap.yaml
kubectl apply -f 02-secrets.yaml
kubectl apply -f 03-persistent-volumes.yaml
kubectl apply -f 04-mysql-deployments.yaml
kubectl apply -f 05-infrastructure-deployments.yaml

# Wait for infrastructure to be ready
kubectl wait --for=condition=available --timeout=300s deployment/nats-streaming -n auction
kubectl wait --for=condition=available --timeout=300s deployment/redis -n auction

# Deploy applications
kubectl apply -f 06-app-deployments.yaml
kubectl apply -f 07-services.yaml
kubectl apply -f 08-ingress.yaml
```

## 🔧 Configuration Details

### Services Included

**Application Services:**
- **api-gateway** (Port 3001) - API Gateway
- **auth** (Port 3101) - Authentication service
- **bid** (Port 3102) - Bidding service
- **listings** (Port 3103) - Listings service
- **payments** (Port 3104) - Payment processing
- **profile** (Port 3105) - User profiles
- **email** (Port 3106) - Email notifications
- **saga-orchestrator** (Port 3108) - Saga pattern orchestration
- **expiration** (Port 3107) - Auction expiration handling
- **frontend** (Port 3000) - Next.js frontend

**Infrastructure Services:**
- **MySQL databases** (5 instances for different services)
- **NATS Streaming** - Message broker
- **Redis** - Caching and session storage
- **Jaeger** - Distributed tracing

### Storage

- **Persistent Volume Claims** for MySQL databases (5GB each)
- **Redis persistence** for caching data
- **Storage class**: `standard` (update based on your cluster)

### Networking

**Internal Services:**
- All services communicate via Kubernetes DNS
- Services are exposed only within the cluster by default

**External Access Options:**

1. **NodePort Services** (ports 30000-30686):
   - Frontend: `http://NODE_IP:30000`
   - API Gateway: `http://NODE_IP:30001`
   - Jaeger UI: `http://NODE_IP:30686`

2. **Ingress** (requires NGINX Ingress Controller):
   - Frontend: `http://auction.local`
   - API: `http://api.auction.local`
   - Jaeger: `http://jaeger.auction.local`

3. **Port Forwarding**:
   ```bash
   kubectl port-forward svc/frontend 3000:3000 -n auction
   kubectl port-forward svc/api-gateway 3001:3001 -n auction
   kubectl port-forward svc/jaeger 16686:16686 -n auction
   ```

## 🔍 Monitoring and Debugging

### Check Deployment Status
```bash
# View all pods
kubectl get pods -n auction

# View services
kubectl get svc -n auction

# View ingress
kubectl get ingress -n auction
```

### View Logs
```bash
# Application logs
kubectl logs -f deployment/api-gateway -n auction
kubectl logs -f deployment/auth -n auction
kubectl logs -f deployment/frontend -n auction

# Infrastructure logs
kubectl logs -f deployment/redis -n auction
kubectl logs -f deployment/nats-streaming -n auction
```

### Debug Pod Issues
```bash
# Describe pod for events
kubectl describe pod <pod-name> -n auction

# Get pod logs
kubectl logs <pod-name> -n auction

# Execute into pod
kubectl exec -it <pod-name> -n auction -- /bin/sh
```

## 🧹 Cleanup

### Using Script
```bash
./cleanup.sh
```

### Manual Cleanup
```bash
kubectl delete namespace auction
```

## 🔧 Customization

### Scaling Services
```bash
# Scale a deployment
kubectl scale deployment api-gateway --replicas=3 -n auction
```

### Update Image Tags
```bash
# Update image tag in deployment
kubectl set image deployment/api-gateway api-gateway=pramithamj/auction-website-ms-api-gateway:v2.0.0 -n auction
```

### Environment Variables
Update the ConfigMap or Secrets and restart deployments:
```bash
kubectl rollout restart deployment/api-gateway -n auction
```

## 🛠️ Production Considerations

1. **Security:**
   - Use proper secrets management (HashiCorp Vault, AWS Secrets Manager)
   - Enable RBAC
   - Use network policies

2. **High Availability:**
   - Use multiple replicas for critical services
   - Set up pod disruption budgets
   - Configure resource requests and limits

3. **Storage:**
   - Use appropriate storage classes for production
   - Configure backup strategies for databases
   - Consider using managed databases (RDS, Cloud SQL)

4. **Monitoring:**
   - Set up Prometheus and Grafana
   - Configure alerting
   - Use health checks and readiness probes

5. **Networking:**
   - Use proper ingress controllers
   - Configure SSL/TLS certificates
   - Set up proper DNS

## 📝 Notes

- This configuration matches your working Docker Compose setup exactly
- All environment variables from `.env.production.template` are included
- Health checks and resource limits are configured
- Services are designed to start in the correct dependency order
- Distributed tracing with Jaeger is fully configured

## 🐛 Troubleshooting

### Common Issues

1. **Pods stuck in Pending state:**
   - Check storage class availability
   - Verify node resources

2. **Services can't connect to databases:**
   - Check if MySQL pods are ready
   - Verify secret values

3. **Frontend can't reach API:**
   - Check service URLs in ConfigMap
   - Verify ingress configuration

4. **Image pull errors:**
   - Verify Docker Hub credentials
   - Check image tags

For more help, check the logs and pod descriptions as shown in the monitoring section above.
