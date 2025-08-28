# Auction Website Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the auction website microservices using **Kustomize** for better organization and environment-specific configurations.

## 📁 Directory Structure

```
k8s/
├── 00-namespace.yaml                 # Namespace definitions
├── kustomization.yaml               # Base kustomization
├── deploy-kustomize.sh              # Enhanced deployment script
├── cleanup-kustomize.sh             # Cleanup script
├── status-enhanced.sh               # Status monitoring script
├── configmaps/                      # Configuration maps
│   ├── auction-configmap.yaml
│   └── mysql-init-scripts.yaml
├── secrets/                         # Secret configurations
│   ├── auction-secrets.yaml
│   └── dev-secrets.yaml
├── deployments/                     # Application deployments
│   ├── api-gateway.yaml
│   ├── auth.yaml
│   ├── bid.yaml
│   ├── email.yaml
│   ├── expiration.yaml
│   ├── frontend.yaml
│   ├── listings.yaml
│   ├── payments.yaml
│   ├── profile.yaml
│   └── saga-orchestrator.yaml
├── infrastucture/                   # Infrastructure services
│   ├── nats-streaming.yaml
│   ├── redis.yaml
│   ├── auth-mysql.yaml
│   ├── bid-mysql.yaml
│   ├── listings-mysql.yaml
│   ├── payments-mysql.yaml
│   └── profile-mysql.yaml
├── ingress/                         # Ingress configurations
│   └── auction-ingress.yaml
├── services/                        # Service definitions
├── overlays/                        # Environment-specific overlays
│   ├── development/
│   │   ├── kustomization.yaml
│   │   └── dev-resources.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── staging-resources.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── prod-resources.yaml
│       └── prod-hpa.yaml
└── patches/                         # Common patches
    └── replica-patches.yaml
```

## 🚀 Quick Start

### Prerequisites

- **Kubernetes cluster** (v1.20+)
- **kubectl** installed and configured
- **kustomize** (built into kubectl v1.14+)
- Sufficient cluster resources (see [Resource Requirements](#resource-requirements))

### 1. Deploy to Development

```bash
# Deploy with default settings (development environment)
./deploy-kustomize.sh

# Or with explicit environment
./deploy-kustomize.sh -e development
```

### 2. Deploy to Staging

```bash
./deploy-kustomize.sh -e staging
```

### 3. Deploy to Production

```bash
./deploy-kustomize.sh -e production
```

### 4. Check Status

```bash
# Basic status
./status-enhanced.sh

# Detailed status with resource usage
./status-enhanced.sh -d

# Watch mode (continuous updates)
./status-enhanced.sh -w

# Show logs for specific service
./status-enhanced.sh -l api-gateway
```

### 5. Cleanup

```bash
# Clean development environment
./cleanup-kustomize.sh

# Clean production (with confirmation)
./cleanup-kustomize.sh -e production

# Force clean without confirmation
./cleanup-kustomize.sh -e staging -f

# Clean and delete persistent data
./cleanup-kustomize.sh -e development -p
```

## 🛠️ Deployment Options

### Command Line Options

#### Deploy Script (`deploy-kustomize.sh`)

```bash
Options:
  -e, --environment ENV    Environment (development|staging|production) [default: development]
  -n, --namespace NS       Namespace [default: auction-system]
  -f, --force             Force apply resources (recreate if exists)
  -d, --dry-run           Show what would be applied without applying
  -h, --help              Show help message

Examples:
  ./deploy-kustomize.sh                                    # Deploy to development
  ./deploy-kustomize.sh -e production                     # Deploy to production
  ./deploy-kustomize.sh -e staging -n auction-staging     # Deploy to staging with custom namespace
  ./deploy-kustomize.sh -d                                # Dry run
```

#### Status Script (`status-enhanced.sh`)

```bash
Options:
  -e, --environment ENV    Environment [default: development]
  -d, --detailed          Show detailed information including resource usage
  -w, --watch             Watch mode - continuously update status
  -l, --logs SERVICE      Show logs for a specific service
  -h, --help              Show help message
```

#### Cleanup Script (`cleanup-kustomize.sh`)

```bash
Options:
  -e, --environment ENV    Environment [default: development]
  -f, --force             Force delete resources (skip confirmation)
  -p, --delete-pvcs       Also delete PersistentVolumeClaims (data will be lost!)
  -h, --help              Show help message
```

## 🌍 Environment Configurations

### Development
- **Namespace**: `auction-system`
- **Replicas**: 1 per service
- **Resources**: Low (128Mi/50m CPU)
- **Image Tag**: `dev`
- **Purpose**: Local development and testing

### Staging
- **Namespace**: `auction-system`
- **Replicas**: 1-2 per service
- **Resources**: Medium (256Mi/100m CPU)
- **Image Tag**: `staging`
- **Purpose**: Pre-production testing

### Production
- **Namespace**: `auction-system`
- **Replicas**: 2-3 per service
- **Resources**: High (512Mi/200m CPU)
- **Image Tag**: `latest`
- **HPA**: Enabled for auto-scaling
- **Purpose**: Production workloads

## 📊 Resource Requirements

### Minimum Cluster Requirements

| Environment | Nodes | CPU Cores | Memory | Storage |
|-------------|-------|-----------|---------|---------|
| Development | 1 | 4 cores | 8 GB | 50 GB |
| Staging | 2 | 8 cores | 16 GB | 100 GB |
| Production | 3+ | 16+ cores | 32+ GB | 200+ GB |

### Per-Service Resource Allocation

#### Development
```yaml
resources:
  requests:
    memory: "128Mi"
    cpu: "50m"
  limits:
    memory: "256Mi"
    cpu: "100m"
```

#### Production
```yaml
resources:
  requests:
    memory: "512Mi"
    cpu: "200m"
  limits:
    memory: "1Gi"
    cpu: "500m"
```

## 🔧 Customization

### Adding New Environments

1. Create overlay directory:
```bash
mkdir -p overlays/my-environment
```

2. Create `kustomization.yaml`:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../

commonLabels:
  environment: my-environment

# Add your customizations here
```

### Modifying Resources

1. **CPU/Memory**: Edit overlay-specific resource files
2. **Replicas**: Modify `replicas` section in `kustomization.yaml`
3. **Images**: Update `images` section for different tags
4. **Environment Variables**: Edit configmaps or secrets

### Custom Patches

Create patches in the `patches/` directory:

```yaml
# patches/custom-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        env:
        - name: CUSTOM_VAR
          value: "custom-value"
```

Add to kustomization:
```yaml
patchesStrategicMerge:
  - ../../patches/custom-patch.yaml
```

## 🔍 Monitoring and Troubleshooting

### Health Checks

All deployments include:
- **Liveness Probes**: Restart unhealthy containers
- **Readiness Probes**: Remove from service until ready
- **Resource Limits**: Prevent resource starvation

### Common Issues

#### 1. Pods Stuck in Pending
```bash
# Check resource availability
kubectl describe nodes
kubectl top nodes

# Check PVC status
kubectl get pvc -n auction-infrastructure
```

#### 2. Image Pull Errors
```bash
# Check image availability
docker pull pramithamj/auction-website-ms-auth:latest

# Check imagePullSecrets if using private registry
kubectl get secrets -n auction-system
```

#### 3. Database Connection Issues
```bash
# Check MySQL pods
kubectl get pods -n auction-infrastructure
kubectl logs deployment/auth-mysql -n auction-infrastructure

# Test connectivity
kubectl exec -it deployment/auth -n auction-system -- curl auth-mysql.auction-infrastructure.svc.cluster.local:3306
```

#### 4. Service Discovery Issues
```bash
# Check services and endpoints
kubectl get services -n auction-system
kubectl get endpoints -n auction-system

# Check DNS resolution
kubectl exec -it deployment/auth -n auction-system -- nslookup bid-service.auction-system.svc.cluster.local
```

### Debugging Commands

```bash
# Get pod logs
kubectl logs -f deployment/api-gateway -n auction-system

# Execute into container
kubectl exec -it deployment/auth -n auction-system -- /bin/bash

# Port forward for local access
kubectl port-forward service/api-gateway-service 3001:3001 -n auction-system

# Check resource usage
kubectl top pods -n auction-system
kubectl top nodes
```

## 🔒 Security Considerations

### Secrets Management
- All sensitive data is stored in Kubernetes secrets
- Secrets are base64 encoded (consider external secret management for production)
- Database passwords should be rotated regularly

### Network Policies
Consider implementing network policies to restrict pod-to-pod communication:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auction-network-policy
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: auction-system
```

### RBAC
The manifests assume cluster-admin privileges. For production, create specific service accounts with minimal required permissions.

## 🔄 CI/CD Integration

### GitOps Workflow
```bash
# Build and push images
docker build -t pramithamj/auction-website-ms-auth:v1.2.3 .
docker push pramithamj/auction-website-ms-auth:v1.2.3

# Update kustomization
cd overlays/production
kustomize edit set image pramithamj/auction-website-ms-auth:v1.2.3

# Deploy
kubectl apply -k overlays/production
```

### Automated Deployment
```yaml
# .github/workflows/deploy.yml
name: Deploy to Kubernetes
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Production
        run: |
          cd k8s
          ./deploy-kustomize.sh -e production
```

## 📈 Scaling

### Manual Scaling
```bash
# Scale specific deployment
kubectl scale deployment api-gateway --replicas=5 -n auction-system

# Scale multiple deployments
kubectl scale deployment api-gateway auth bid --replicas=3 -n auction-system
```

### Auto-scaling (Production)
Production environment includes HPA (Horizontal Pod Autoscaler):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 🆘 Support

### Getting Help
1. Check pod status: `./status-enhanced.sh -d`
2. View logs: `./status-enhanced.sh -l <service-name>`
3. Check events: `kubectl get events -n auction-system`
4. Describe resources: `kubectl describe deployment <name> -n auction-system`

### Common Commands Reference
```bash
# Quick status check
kubectl get all -n auction-system

# Restart deployment
kubectl rollout restart deployment/api-gateway -n auction-system

# Check rollout status
kubectl rollout status deployment/api-gateway -n auction-system

# View deployment history
kubectl rollout history deployment/api-gateway -n auction-system

# Rollback deployment
kubectl rollout undo deployment/api-gateway -n auction-system
```

---

**Happy Deploying! 🚀**

For more detailed information about the auction website architecture, see the main project documentation.
