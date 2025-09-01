# Quick Start Guide - Kubernetes Deployment

This is a quick reference for deploying the Auction Website on Kubernetes.

## 🚀 Quick Commands

### Pre-deployment Check
```bash
# Check if all files exist before deployment
cd k8s
./pre-check.sh
```

### Full Deployment (One Command)
```bash
# From the k8s directory
cd k8s
./deploy-all.sh

# Or from project root
./k8s/deploy-all.sh
```

### Development Setup
```bash
# 1. Run pre-check
cd k8s
./pre-check.sh

# 2. Deploy everything
./deploy-all.sh

# 3. Port forward for local access
kubectl port-forward svc/frontend-service 3000:3000 -n auction-system &
kubectl port-forward svc/api-gateway-service 3001:3001 -n auction-system &
```

### Production Setup
```bash
# 1. Update configuration with your domain/IP
# Edit configmaps/auction-configmap.yaml
# Update NEXT_PUBLIC_SERVER_IP and CORS_ORIGIN

# 2. Update secrets with production values
# Edit secrets/auction-secrets.yaml

# 3. Run pre-check
./pre-check.sh

# 4. Deploy
./deploy-all.sh

# 5. Configure ingress with your domain
# Edit ingress/auction-ingress.yaml
```

## Status Check Commands

```bash
# Check all pods
kubectl get pods -A | grep auction

# Check services
kubectl get svc -n auction-system

# Check ingress
kubectl get ingress -n auction-system

# Check logs
kubectl logs -f deployment/api-gateway -n auction-system
```

## Common Operations

### Scale Services

```bash
kubectl scale deployment api-gateway --replicas=3 -n auction-system
kubectl scale deployment frontend --replicas=2 -n auction-system
```

### Update Configuration

```bash
# Update configmap
kubectl patch configmap auction-config -n auction-system --patch '{"data":{"NODE_ENV":"production"}}'

# Restart deployments to pick up changes
kubectl rollout restart deployment/api-gateway -n auction-system
```

### View Logs

```bash
# API Gateway logs
kubectl logs -f deployment/api-gateway -n auction-system

# Auth service logs
kubectl logs -f deployment/auth -n auction-system

# All pods logs
kubectl logs -f -l app=api-gateway -n auction-system
```

## 🧹 Cleanup Commands

### Full Cleanup
```bash
cd k8s
./cleanup.sh
```

### Keep Infrastructure
```bash
./cleanup.sh --keep-infra --keep-pvcs
```

### Force Cleanup (No Prompts)
```bash
./cleanup.sh --force
```

## 🐛 Troubleshooting Quick Fixes

### Check Everything is OK
```bash
# Run comprehensive health check
cd k8s
./pre-check.sh

# Check deployment status
kubectl get pods -A | grep auction
```

### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n auction-system

# Check events
kubectl get events -n auction-system --sort-by='.lastTimestamp'

# Check troubleshooting guide
cat k8s/TROUBLESHOOTING.md
```

### Database Connection Issues

```bash
# Test MySQL connectivity
kubectl exec -it deployment/auth -n auction-system -- nc -zv auth-mysql.auction-infrastructure.svc.cluster.local 3306

# Check MySQL logs
kubectl logs deployment/auth-mysql -n auction-infrastructure
```

### Image Pull Issues

```bash
# Check if images exist
docker pull pramithamj/auction-website-ms-auth:latest

# Update deployment to always pull
kubectl patch deployment auth -n auction-system --patch '{"spec":{"template":{"spec":{"containers":[{"name":"auth","imagePullPolicy":"Always"}]}}}}'
```

## Access Points

### Local Development

- Frontend: http://localhost:3000 (with port-forward)
- API Gateway: http://localhost:3001 (with port-forward)

### With Ingress

- Frontend: http://your-domain.com/
- API: http://your-domain.com/api

### Direct Service Access

```bash
# Frontend
kubectl port-forward svc/frontend-service 3000:3000 -n auction-system

# API Gateway
kubectl port-forward svc/api-gateway-service 3001:3001 -n auction-system
```

## Environment Variables

### Key Environment Variables to Update

**ConfigMap (k8s/configmaps/auction-configmap.yaml):**

- `NEXT_PUBLIC_SERVER_IP`: Your server IP/domain
- `CORS_ORIGIN`: Allowed origins for CORS
- `NODE_ENV`: development/production

**Secrets (k8s/secrets/auction-secrets.yaml):**

- `JWT_KEY`: Your JWT secret
- `MYSQL_ROOT_PASSWORD`: MySQL root password
- `MYSQL_PASSWORD`: Application user password
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

## Update Deployment

### Rolling Update

```bash
# Update image tag
kubectl set image deployment/api-gateway api-gateway=pramithamj/auction-website-ms-api-gateway:v2.0.0 -n auction-system

# Check rollout status
kubectl rollout status deployment/api-gateway -n auction-system
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n auction-system

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n auction-system
```

## Security Notes

1. **Change default passwords** in secrets before production deployment
2. **Use proper RBAC** for production clusters
3. **Enable network policies** for pod-to-pod communication
4. **Configure SSL/TLS** for ingress in production
5. **Use external secret management** (e.g., AWS Secrets Manager, HashiCorp Vault)

## Monitoring

### Resource Usage

```bash
# Pod resource usage
kubectl top pods -n auction-system

# Node resource usage
kubectl top nodes
```

### Auto-scaling

```bash
# Enable HPA
kubectl autoscale deployment api-gateway --cpu-percent=70 --min=2 --max=10 -n auction-system

# Check HPA status
kubectl get hpa -n auction-system
```
