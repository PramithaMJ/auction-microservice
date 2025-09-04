# Kubernetes Deployment Fix Guide for Auction Website

This guide provides step-by-step instructions to fix your Kubernetes deployment issues and enable external access.

## 🚨 Current Issues Identified

Based on your deployment output, here are the main issues:

1. **Auth service crashing** with SIGKILL (memory issues)
2. **Bid and Payments services completing** instead of running
3. **LoadBalancer services pending** (no external load balancer)
4. **ContainerCreating issues** for some pods
5. **External access not configured** properly

## 🔧 Quick Fix (Recommended)

### Step 1: Run the Quick Fix Script

```bash
cd /Users/pramithajayasooriya/Desktop/Final-auction/auction-website
./scripts/quick-fix.sh
```

This script will:
- ✅ Fix memory allocation issues
- ✅ Convert LoadBalancer to NodePort services
- ✅ Restart problematic deployments
- ✅ Show access URLs

### Step 2: Configure External Access

```bash
./scripts/setup-external-access.sh
```

This script will:
- ✅ Detect your server IP automatically
- ✅ Update configurations for external access
- ✅ Restart services with new settings

### Step 3: Verify and Troubleshoot

```bash
./scripts/troubleshoot.sh
```

## 🌐 Manual Steps for External Access

### For AWS EC2 Ubuntu Server

1. **Open Security Group Ports**:
   ```bash
   # Replace sg-xxxxxxxxx with your actual security group ID
   aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 30000 --cidr 0.0.0.0/0
   aws ec2 authorize-security-group-ingress --group-id sg-xxxxxxxxx --protocol tcp --port 30001 --cidr 0.0.0.0/0
   ```

2. **Access Your Application**:
   - Frontend: `http://YOUR_EC2_PUBLIC_IP:30000`
   - API Gateway: `http://YOUR_EC2_PUBLIC_IP:30001`

### For Local/Other Servers

1. **Open Firewall Ports** (if using UFW):
   ```bash
   sudo ufw allow 30000
   sudo ufw allow 30001
   ```

2. **Access Your Application**:
   - Frontend: `http://YOUR_SERVER_IP:30000`
   - API Gateway: `http://YOUR_SERVER_IP:30001`

## 📋 Manual Troubleshooting Commands

### Check Pod Status
```bash
kubectl get pods -n auction-system
kubectl get pods -n auction-infrastructure
```

### Check Service Status
```bash
kubectl get svc -n auction-system
kubectl get svc -n auction-infrastructure
```

### View Pod Logs
```bash
# Check specific service logs
kubectl logs -f deployment/auth -n auction-system
kubectl logs -f deployment/bid -n auction-system
kubectl logs -f deployment/payments -n auction-system
kubectl logs -f deployment/frontend -n auction-system
```

### Describe Problematic Pods
```bash
kubectl describe pod <pod-name> -n auction-system
```

### Restart Deployments
```bash
kubectl rollout restart deployment/auth -n auction-system
kubectl rollout restart deployment/bid -n auction-system
kubectl rollout restart deployment/payments -n auction-system
```

### Scale Deployments
```bash
# Scale down
kubectl scale deployment auth --replicas=0 -n auction-system

# Scale up
kubectl scale deployment auth --replicas=1 -n auction-system
```

## 🔍 Advanced Troubleshooting

### Memory Issues
If pods are getting killed due to memory issues:

```bash
# Increase memory limits
kubectl patch deployment auth -n auction-system -p='{"spec":{"template":{"spec":{"containers":[{"name":"auth","resources":{"limits":{"memory":"512Mi","cpu":"500m"},"requests":{"memory":"256Mi","cpu":"100m"}}}]}}}}'
```

### Database Connection Issues
Check if databases are ready:

```bash
kubectl get pods -n auction-infrastructure
kubectl logs -f <mysql-pod-name> -n auction-infrastructure
```

### Network Issues
Test internal connectivity:

```bash
# Get into a pod shell
kubectl exec -it <pod-name> -n auction-system -- /bin/sh

# Test DNS resolution
nslookup auth-mysql.auction-infrastructure.svc.cluster.local
```

## 📊 Expected Results

After running the fix scripts, you should see:

### Healthy Pods
```
NAME                                 READY   STATUS    RESTARTS   AGE
api-gateway-xxxxx-xxxxx             1/1     Running   0          5m
auth-xxxxx-xxxxx                    1/1     Running   0          5m  
bid-xxxxx-xxxxx                     1/1     Running   0          5m
frontend-xxxxx-xxxxx                1/1     Running   0          5m
listings-xxxxx-xxxxx                1/1     Running   0          5m
payments-xxxxx-xxxxx                1/1     Running   0          5m
profile-xxxxx-xxxxx                 1/1     Running   0          5m
```

### Working Services
```
NAME                        TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)
api-gateway-service         NodePort    10.xx.xx.xx      <none>        3001:30001/TCP
frontend-service            NodePort    10.xx.xx.xx      <none>        3000:30000/TCP
```

## 🆘 If Issues Persist

1. **Run the troubleshooting script**:
   ```bash
   ./scripts/troubleshoot.sh
   ```

2. **Check cluster resources**:
   ```bash
   kubectl top nodes
   kubectl describe nodes
   ```

3. **Restart the entire deployment**:
   ```bash
   kubectl delete -f k8s/deployments/
   kubectl apply -f k8s/deployments/
   ```

4. **Check logs systematically**:
   ```bash
   # Check all pod logs
   for pod in $(kubectl get pods -n auction-system -o name); do
     echo "=== $pod ==="
     kubectl logs $pod -n auction-system --tail=10
   done
   ```

## 📞 Success Verification

Your deployment is successful when:

- ✅ All pods show `Running` status
- ✅ Services have `NodePort` type with assigned ports
- ✅ You can access the frontend at `http://YOUR_IP:30000`
- ✅ You can access the API Gateway at `http://YOUR_IP:30001`
- ✅ No pods are in `Error`, `CrashLoopBackOff`, or `Pending` states

## 🔗 Useful Commands Reference

```bash
# Quick status check
kubectl get all -n auction-system

# Watch pod status in real-time
kubectl get pods -n auction-system -w

# Get cluster info
kubectl cluster-info

# Check node resources
kubectl describe nodes

# Get events (shows recent cluster events)
kubectl get events --sort-by=.metadata.creationTimestamp

# Port forward for direct access (alternative to NodePort)
kubectl port-forward svc/frontend-service 3000:3000 -n auction-system
kubectl port-forward svc/api-gateway-service 3001:3001 -n auction-system
```

Follow these steps in order, and your auction website should be accessible externally! 🚀
