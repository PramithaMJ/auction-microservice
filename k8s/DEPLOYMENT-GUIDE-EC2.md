# Kubernetes Deployment Guide for EC2 (34.229.99.72)

## Fixed Issues Summary

### 🔒 Security Improvements
- ✅ Moved database credentials from ConfigMaps to Secrets
- ✅ Fixed MySQL health checks to use environment variables instead of hardcoded passwords
- ✅ Implemented principle of least privilege for database users
- ✅ Updated IP addresses to use your EC2 instance (34.229.99.72)

### 🔧 Configuration Improvements
- ✅ Removed duplicate PVC definitions
- ✅ Added proper StorageClass configuration for AWS EBS
- ✅ Removed duplicate service definitions
- ✅ Updated MySQL user permissions (limited to necessary privileges only)

## Prerequisites

1. **Kubernetes cluster running on EC2 instance 34.229.99.72**
2. **kubectl configured to connect to your cluster**
3. **AWS EBS CSI driver installed** (for persistent volumes)

## Deployment Steps

### 1. Install AWS EBS CSI Driver (if not installed)
```bash
kubectl apply -k "github.com/kubernetes-sigs/aws-ebs-csi-driver/deploy/kubernetes/overlays/stable/?ref=release-1.19"
```

### 2. Deploy in the correct order

```bash
# Navigate to k8s directory
cd k8s

# 1. Create namespaces
kubectl apply -f namespace.yaml

# 2. Create secrets (contains sensitive data)
kubectl apply -f secrets/auction-secrets.yaml

# 3. Create storage class and PVCs
kubectl apply -f infrastucture/storageclass.yaml
kubectl apply -f infrastucture/mysql-pvcs.yaml

# 4. Create ConfigMaps
kubectl apply -f configmaps/

# 5. Deploy infrastructure (databases, Redis, NATS)
kubectl apply -f infrastucture/

# 6. Deploy services definitions
kubectl apply -f services/

# 7. Deploy application services
kubectl apply -f deployments/

# 8. Deploy ingress (if using)
kubectl apply -f ingress/
```

### 3. Verify deployment

```bash
# Check all pods are running
kubectl get pods -n auction-system
kubectl get pods -n auction-infrastructure

# Check persistent volumes
kubectl get pv
kubectl get pvc -n auction-infrastructure

# Check services
kubectl get svc -n auction-system
kubectl get svc -n auction-infrastructure
```

### 4. Access your application

Your application will be accessible at:
- **Frontend**: http://34.229.99.72:3000
- **API Gateway**: http://34.229.99.72:3001

## Security Notes

### Database Credentials
The following secure credentials are now in use:
- **MySQL Root Password**: `password` (stored in secret)
- **Application User**: `auctionuser`
- **Application Password**: `auction_secure_pass_2024` (stored in secret)

### Database Permissions
Application users now have limited permissions:
- SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER
- No more superuser privileges (principle of least privilege)

## Troubleshooting

### If pods fail to start:
```bash
# Check pod logs
kubectl logs -n auction-system <pod-name>
kubectl logs -n auction-infrastructure <pod-name>

# Check events
kubectl get events -n auction-system --sort-by='.lastTimestamp'
```

### If persistent volumes fail:
```bash
# Check storage class
kubectl get storageclass

# Check if EBS CSI driver is running
kubectl get pods -n kube-system | grep ebs
```

### If services are not accessible:
```bash
# Check service endpoints
kubectl get endpoints -n auction-system

# Check if ports are open on EC2 security groups
# Ensure ports 3000, 3001, 3101-3108 are open
```

## Important Notes

1. **IP Address**: All configurations now use your EC2 IP (34.229.99.72)
2. **Storage**: Uses AWS EBS GP3 volumes with 10 IOPS per GB
3. **Security Groups**: Ensure your EC2 security groups allow traffic on required ports
4. **DNS**: Consider setting up proper DNS instead of using IP addresses for production

## Next Steps for Production

1. **Use proper DNS names** instead of IP addresses
2. **Set up TLS/SSL** certificates for HTTPS
3. **Implement proper backup** strategy for persistent volumes
4. **Set up monitoring** and logging
5. **Configure resource limits** and requests properly
6. **Implement network policies** for additional security
