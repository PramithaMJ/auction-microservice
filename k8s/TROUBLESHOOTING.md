# Kubernetes Troubleshooting Guide - Auction Website

This guide helps you diagnose and fix common issues when deploying the Auction Website on Kubernetes.

## 🚨 Quick Diagnostics

### Check Overall System Health
```bash
# Check all auction-related pods
kubectl get pods -A | grep auction

# Check events for errors
kubectl get events --sort-by='.lastTimestamp' -A | grep -i error

# Check node resources
kubectl top nodes

# Check overall cluster status
kubectl cluster-info
```

## 📋 Common Issues and Solutions

### 1. Deploy Script Errors

#### Issue: "Path does not exist" errors
```
error: the path "k8s/infrastucture/storageclass.yaml" does not exist
```

**Solution:**
```bash
# Ensure you're running the script from the k8s directory
cd k8s
./deploy-all.sh

# Or use the correct path from project root
./k8s/deploy-all.sh
```

#### Issue: Permission denied
```
bash: ./deploy-all.sh: Permission denied
```

**Solution:**
```bash
chmod +x k8s/deploy-all.sh
chmod +x k8s/cleanup.sh
```

### 2. Pod Issues

#### Issue: ImagePullBackOff
```bash
# Check the exact error
kubectl describe pod <pod-name> -n <namespace>

# Common causes and solutions:
```

**Solutions:**

1. **Image doesn't exist:**
```bash
# Verify image exists
docker pull pramithamj/auction-website-ms-auth:latest

# If it doesn't exist, build and push it
cd services/auth
docker build -t pramithamj/auction-website-ms-auth:latest .
docker push pramithamj/auction-website-ms-auth:latest
```

2. **Wrong image tag:**
```bash
# Update deployment with correct tag
kubectl set image deployment/auth auth=pramithamj/auction-website-ms-auth:v1.0.0 -n auction-system
```

3. **Registry authentication issues:**
```bash
# Create image pull secret if using private registry
kubectl create secret docker-registry regcred \
  --docker-server=<your-registry-server> \
  --docker-username=<your-name> \
  --docker-password=<your-password> \
  --docker-email=<your-email>
```

#### Issue: CrashLoopBackOff
```bash
# Check pod logs
kubectl logs -f <pod-name> -n <namespace>

# Check previous container logs
kubectl logs <pod-name> -n <namespace> --previous

# Common causes:
```

**Solutions:**

1. **Database connection issues:**
```bash
# Check if MySQL is running
kubectl get pods -n auction-infrastructure | grep mysql

# Test database connectivity
kubectl exec -it deployment/auth -n auction-system -- nc -zv auth-mysql.auction-infrastructure.svc.cluster.local 3306

# Check database logs
kubectl logs deployment/auth-mysql -n auction-infrastructure
```

2. **Environment variable issues:**
```bash
# Check environment variables
kubectl exec deployment/auth -n auction-system -- env | grep -E "(MYSQL|JWT|NATS)"

# Update configmap if needed
kubectl patch configmap auction-config -n auction-system --patch '{"data":{"MYSQL_HOST":"correct-host"}}'
```

3. **Port conflicts:**
```bash
# Check if port is already in use
kubectl get svc -A | grep 3101
```

#### Issue: Pending Pods
```bash
# Check why pod is pending
kubectl describe pod <pod-name> -n <namespace>

# Common reasons and solutions:
```

**Solutions:**

1. **Insufficient resources:**
```bash
# Check node resources
kubectl top nodes

# Check resource requests/limits
kubectl describe deployment <deployment-name> -n <namespace>

# Scale down other deployments if needed
kubectl scale deployment frontend --replicas=1 -n auction-system
```

2. **PVC issues:**
```bash
# Check PVC status
kubectl get pvc -n auction-infrastructure

# Check storage class
kubectl get storageclass

# If using minikube, enable storage addon
minikube addons enable default-storageclass
minikube addons enable storage-provisioner
```

### 3. Database Issues

#### Issue: MySQL Connection Refused
```bash
# Check MySQL pod status
kubectl get pods -n auction-infrastructure | grep mysql

# Check MySQL logs
kubectl logs deployment/auth-mysql -n auction-infrastructure

# Test connection
kubectl exec -it deployment/auth-mysql -n auction-infrastructure -- mysql -u root -p
```

**Solutions:**

1. **MySQL not ready:**
```bash
# Wait for MySQL to be ready
kubectl wait --for=condition=ready pod -l app=auth-mysql -n auction-infrastructure --timeout=300s

# Check MySQL initialization
kubectl logs deployment/auth-mysql -n auction-infrastructure | grep -i "ready for connections"
```

2. **Wrong credentials:**
```bash
# Check secrets
kubectl get secret auction-secrets -n auction-system -o yaml

# Update secrets with correct credentials
kubectl patch secret auction-secrets -n auction-system --patch '{"stringData":{"MYSQL_PASSWORD":"new_password"}}'

# Restart dependent pods
kubectl rollout restart deployment/auth -n auction-system
```

3. **Database not initialized:**
```bash
# Check if database exists
kubectl exec -it deployment/auth-mysql -n auction-infrastructure -- mysql -u root -p -e "SHOW DATABASES;"

# Manually create database if needed
kubectl exec -it deployment/auth-mysql -n auction-infrastructure -- mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auth;"
```

#### Issue: Database Schema Issues
```bash
# Check if tables exist
kubectl exec -it deployment/auth-mysql -n auction-infrastructure -- mysql -u root -p auth -e "SHOW TABLES;"

# Run schema migrations manually if needed
kubectl exec -it deployment/auth -n auction-system -- npm run db:migrate
```

### 4. Network and Service Issues

#### Issue: Service Not Found
```bash
# Check if service exists
kubectl get svc -n auction-system

# Check service endpoints
kubectl get endpoints -n auction-system

# Check service labels and selectors
kubectl describe svc <service-name> -n auction-system
```

**Solutions:**

1. **Service not created:**
```bash
# Apply service definitions
kubectl apply -f services/
```

2. **Wrong selector labels:**
```bash
# Check pod labels
kubectl get pods -n auction-system --show-labels

# Update service selector if needed
kubectl patch svc auth-service -n auction-system --patch '{"spec":{"selector":{"app":"auth"}}}'
```

#### Issue: Ingress Not Working
```bash
# Check ingress status
kubectl get ingress -n auction-system

# Check ingress controller
kubectl get pods -n ingress-nginx
```

**Solutions:**

1. **Ingress controller not installed:**
```bash
# For Minikube
minikube addons enable ingress

# For cloud clusters
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

2. **Get ingress IP:**
```bash
# For Minikube
minikube ip

# For cloud clusters
kubectl get ingress -n auction-system
```

### 5. NATS and Redis Issues

#### Issue: NATS Connection Failed
```bash
# Check NATS pod
kubectl get pods -n auction-infrastructure | grep nats

# Check NATS logs
kubectl logs deployment/nats-streaming -n auction-infrastructure

# Test NATS connectivity
kubectl exec -it deployment/auth -n auction-system -- nc -zv nats-streaming.auction-infrastructure.svc.cluster.local 4222
```

**Solutions:**
```bash
# Restart NATS if needed
kubectl rollout restart deployment/nats-streaming -n auction-infrastructure

# Check NATS service
kubectl get svc -n auction-infrastructure | grep nats
```

#### Issue: Redis Connection Failed
```bash
# Check Redis pod
kubectl get pods -n auction-infrastructure | grep redis

# Test Redis connectivity
kubectl exec -it deployment/auth -n auction-system -- nc -zv redis.auction-infrastructure.svc.cluster.local 6379

# Connect to Redis
kubectl exec -it deployment/redis -n auction-infrastructure -- redis-cli ping
```

### 6. Configuration Issues

#### Issue: Wrong Environment Variables
```bash
# Check current configuration
kubectl get configmap auction-config -n auction-system -o yaml

# Check secrets
kubectl get secret auction-secrets -n auction-system -o yaml | base64 -d
```

**Solutions:**
```bash
# Update configuration
kubectl patch configmap auction-config -n auction-system --patch '{"data":{"NODE_ENV":"production"}}'

# Restart deployments to pick up changes
kubectl rollout restart deployment/auth -n auction-system
kubectl rollout restart deployment/api-gateway -n auction-system
```

## 🔧 Advanced Troubleshooting

### Debug Pod Issues
```bash
# Start a debug container
kubectl run debug --image=busybox --rm -it --restart=Never -- /bin/sh

# Or use a running pod for debugging
kubectl exec -it deployment/api-gateway -n auction-system -- /bin/sh

# Check DNS resolution
nslookup auth-service.auction-system.svc.cluster.local

# Check connectivity
nc -zv auth-service.auction-system.svc.cluster.local 3101
```

### Check Resource Usage
```bash
# Check pod resource usage
kubectl top pods -n auction-system
kubectl top pods -n auction-infrastructure

# Check resource limits
kubectl describe deployment auth -n auction-system | grep -A 5 -B 5 resources
```

### Log Analysis
```bash
# Follow logs from multiple pods
kubectl logs -f -l app=auth -n auction-system

# Get logs from all containers in a pod
kubectl logs <pod-name> -n <namespace> --all-containers=true

# Search for specific errors
kubectl logs deployment/auth -n auction-system | grep -i error
```

## 🚀 Performance Troubleshooting

### High CPU/Memory Usage
```bash
# Check resource consumption
kubectl top pods -n auction-system --sort-by=cpu
kubectl top pods -n auction-system --sort-by=memory

# Scale up if needed
kubectl scale deployment api-gateway --replicas=3 -n auction-system
```

### Slow Response Times
```bash
# Check pod readiness
kubectl get pods -n auction-system -o wide

# Test internal service connectivity
kubectl exec -it deployment/api-gateway -n auction-system -- curl -w "@curl-format.txt" http://auth-service:3101/health

# Check for resource constraints
kubectl describe nodes | grep -A 5 "Allocated resources"
```

## 📊 Monitoring and Alerts

### Set Up Basic Monitoring
```bash
# Enable metrics server (if not already enabled)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Check metrics server
kubectl get pods -n kube-system | grep metrics-server
```

### Health Checks
```bash
# Create a health check script
cat << 'EOF' > health-check.sh
#!/bin/bash
echo "=== Pod Status ==="
kubectl get pods -A | grep auction

echo "=== Service Status ==="
kubectl get svc -n auction-system

echo "=== Resource Usage ==="
kubectl top pods -n auction-system 2>/dev/null || echo "Metrics not available"

echo "=== Recent Events ==="
kubectl get events --sort-by='.lastTimestamp' -n auction-system | tail -10
EOF

chmod +x health-check.sh
./health-check.sh
```

## 🆘 Emergency Procedures

### Complete Reset
```bash
# Clean shutdown
./cleanup.sh --force

# Wait for cleanup
sleep 30

# Redeploy
./deploy-all.sh
```

### Rollback Deployment
```bash
# Check rollout history
kubectl rollout history deployment/auth -n auction-system

# Rollback to previous version
kubectl rollout undo deployment/auth -n auction-system

# Rollback to specific revision
kubectl rollout undo deployment/auth --to-revision=2 -n auction-system
```

### Scale Down for Maintenance
```bash
# Scale all deployments to 0
kubectl scale deployment --all --replicas=0 -n auction-system

# Scale back up
kubectl scale deployment --all --replicas=1 -n auction-system
kubectl scale deployment api-gateway --replicas=2 -n auction-system
```

## 📞 Getting Help

### Collect Debug Information
```bash
# Create debug information bundle
mkdir -p debug-info
kubectl get pods -A > debug-info/pods.txt
kubectl get svc -A > debug-info/services.txt
kubectl get events --sort-by='.lastTimestamp' -A > debug-info/events.txt
kubectl top nodes > debug-info/node-usage.txt 2>/dev/null || echo "Metrics not available" > debug-info/node-usage.txt

# Collect logs
kubectl logs deployment/api-gateway -n auction-system > debug-info/api-gateway.log
kubectl logs deployment/auth -n auction-system > debug-info/auth.log

echo "Debug information collected in debug-info/ directory"
```

### Common Support Commands
```bash
# Show cluster information
kubectl cluster-info dump > cluster-info.txt

# Show configuration
kubectl get configmaps -n auction-system -o yaml > configmaps.yaml
kubectl get secrets -n auction-system -o yaml > secrets.yaml

# Show deployment details
kubectl describe deployment api-gateway -n auction-system > api-gateway-deployment.txt
```

---

**Remember**: Always check the logs first, verify configurations second, and ensure all dependencies are running before proceeding with complex troubleshooting steps.
