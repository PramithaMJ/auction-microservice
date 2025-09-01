#  Auction Website Kubernetes Deployment - Complete Guide

##  Summary of Issues Found and Fixed

### Issues Identified:
1.  **Missing Namespace Definitions**: Created `namespaces.yaml`
2.  **Inconsistent Server IPs**: Multiple hardcoded IPs in configs
3.  **Missing Environment Variables**: Frontend config incomplete
4.  **Hardcoded Credentials**: Need server-specific configuration
5.  **Missing Setup Scripts**: No automated configuration

### Fixes Applied:
1.  **Created namespace definitions**: `k8s/namespaces.yaml`
2.  **Added configuration script**: `k8s/configure-deployment.sh`
3.  **Fixed deployment script**: Updated `k8s/deploy-all.sh`
4.  **Created setup script**: `setup-server.sh`
5.  **Updated configs**: Placeholder system for server IPs
6.  **Created comprehensive guide**: `k8s/DEPLOYMENT-GUIDE.md`

## 🛠️ Complete Deployment Process

### Phase 1: Server Preparation
```bash
# 1. Clone repository (if not already done)
git clone <your-repo>
cd auction-website

# 2. Run server setup
./setup-server.sh
```

### Phase 2: Configuration
```bash
# 3. Navigate to k8s directory
cd k8s

# 4. Configure for your server
./configure-deployment.sh
```

### Phase 3: Deployment
```bash
# 5. Deploy everything
./deploy-all.sh
```

### Phase 4: Verification
```bash
# 6. Check deployment status
kubectl get pods --all-namespaces | grep auction
kubectl get svc -n auction-system
kubectl get ingress -n auction-system
```

## 🎯 Access Your Application

After successful deployment:

1. **Get your access URLs**:
   ```bash
   kubectl get svc -n auction-system frontend-service
   kubectl get ingress -n auction-system auction-ingress
   ```

2. **Access points**:
   - **Main Application**: `http://YOUR_SERVER_IP`
   - **Frontend Direct**: `http://YOUR_SERVER_IP:3000`
   - **API Gateway**: `http://YOUR_SERVER_IP:3001`
   - **API Documentation**: `http://YOUR_SERVER_IP:3001/api-docs`

## 🏗️ Architecture Deployed

```
┌─────────────────────────────────────────────────────────────────┐
│                        INGRESS CONTROLLER                       │
│                     (YOUR_SERVER_IP:80)                        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │   /api/*      │   /*
              │               │
    ┌─────────▼─────────┐   ┌─▼─────────┐
    │   API Gateway     │   │ Frontend  │
    │    Port: 3001     │   │Port: 3000 │
    └─────────┬─────────┘   └───────────┘
              │
    ┌─────────▼─────────┐
    │   Microservices   │
    │                   │
    │ • Auth (3101)     │
    │ • Bid (3102)      │
    │ • Listings (3103) │
    │ • Payments (3104) │
    │ • Profile (3105)  │
    │ • Email (3106)    │
    │ • Expiration      │
    │ • Saga Orchestr.  │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │  Infrastructure   │
    │                   │
    │ • MySQL DBs (5x)  │
    │ • NATS Streaming  │
    │ • Redis Cache     │
    └───────────────────┘
```

##  Troubleshooting Quick Reference

### Common Issues & Solutions:

1. **Pods not starting**:
   ```bash
   kubectl describe pod <pod-name> -n <namespace>
   kubectl logs <pod-name> -n <namespace>
   ```

2. **Database connection errors**:
   ```bash
   kubectl get pods -n auction-infrastructure | grep mysql
   kubectl logs -n auction-infrastructure <mysql-pod>
   ```

3. **Ingress not working**:
   ```bash
   kubectl get ingress -n auction-system
   kubectl describe ingress auction-ingress -n auction-system
   ```

4. **Service connectivity**:
   ```bash
   kubectl get svc -n auction-system
   kubectl get endpoints -n auction-system
   ```

## ⚙️ Environment-Specific Commands

### For AWS EKS:
```bash
# Configure kubectl for EKS
aws eks update-kubeconfig --name <cluster-name> --region <region>

# Install AWS Load Balancer Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/aws/deploy.yaml
```

### For Google GKE:
```bash
# Configure kubectl for GKE
gcloud container clusters get-credentials <cluster-name> --zone <zone>

# Install ingress
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/gce/deploy.yaml
```

### For Local Development (Minikube):
```bash
# Start minikube
minikube start --memory=8192 --cpus=4

# Enable ingress
minikube addons enable ingress

# Get minikube IP
minikube ip
```

##  Monitoring Commands

```bash
# Check resource usage
kubectl top pods -n auction-system
kubectl top nodes

# Check events
kubectl get events -n auction-system --sort-by='.lastTimestamp'

# Check all resources
kubectl get all -n auction-system
kubectl get all -n auction-infrastructure
```

##  Production Checklist

Before going to production:

- [ ] Update all default passwords in `secrets/auction-secrets.yaml`
- [ ] Configure proper TLS certificates
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation
- [ ] Set up backups for persistent volumes
- [ ] Use managed databases (RDS, Cloud SQL, etc.)
- [ ] Configure network policies for security
- [ ] Set up CI/CD pipelines
- [ ] Configure resource limits and requests
- [ ] Set up health checks and liveness probes

## 📱 Quick Commands Reference

```bash
# Deploy
cd k8s && ./deploy-all.sh

# Check status
kubectl get pods --all-namespaces | grep auction

# Scale services
kubectl scale deployment frontend -n auction-system --replicas=3

# Update image
kubectl set image deployment/frontend -n auction-system frontend=new-image:tag

# Port forward (for testing)
kubectl port-forward -n auction-system svc/frontend-service 3000:3000

# Cleanup
./cleanup-all.sh
```

##  Success Indicators

Your deployment is successful when:

1.  All pods show `Running` status
2.  Services have endpoints assigned
3.  Ingress shows an IP address
4.  Frontend loads at `http://YOUR_SERVER_IP`
5.  API Gateway responds at `http://YOUR_SERVER_IP:3001/health`
6.  You can register/login users
7.  You can create auction listings
8.  Real-time bidding works

##  Need Help?

1. Check the detailed `DEPLOYMENT-GUIDE.md`
2. Review logs: `kubectl logs <pod-name> -n <namespace>`
3. Check events: `kubectl get events -n <namespace>`
4. Verify configuration files match your environment
5. Ensure all prerequisites are installed

---

** Ready to deploy? Start with: `./setup-server.sh`**
