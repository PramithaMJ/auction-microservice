#  Minikube Deployment Summary

## Quick Start Guide

This guide helps you deploy the Auction Website on Minikube with external access from Ubuntu server.

##  Prerequisites Checklist

- [ ] Ubuntu Server 20.04+ with 8GB RAM, 4 CPUs
- [ ] Docker installed and user added to docker group
- [ ] kubectl installed
- [ ] Minikube installed
- [ ] Ports 3000, 3001, 30000-32767 open in firewall

##  Deployment Steps

### 1. Quick Deployment (Automated)

```bash
# Clone repository
git clone <your-repo>
cd auction-website

# Deploy everything with one command
./scripts/deploy-minikube.sh
```

### 2. Configure External Access

```bash
# Configure for external access
./scripts/configure-external-access.sh

# Monitor deployment
./scripts/monitor-minikube.sh
```

### 3. Access Your Application

**Primary URLs (NodePort):**
- Frontend: `http://YOUR_SERVER_IP:30000`
- API Gateway: `http://YOUR_SERVER_IP:30001`

**Alternative URLs (Port Forwarding):**
- Frontend: `http://YOUR_SERVER_IP:3000`
- API Gateway: `http://YOUR_SERVER_IP:3001`

##  Key Scripts

| Script | Purpose |
|--------|---------|
| `deploy-minikube.sh` | Full deployment automation |
| `configure-external-access.sh` | Setup external access |
| `monitor-minikube.sh` | Monitor cluster status |
| `cleanup-minikube.sh` | Clean up deployment |

## 🏗️ Architecture Overview

```
External Traffic
       ↓
   NodePort Services (30000, 30001)
       ↓
   Internal Services (3000, 3001)
       ↓
   Application Pods
       ↓
   Infrastructure (MySQL, Redis, NATS)
```

##  Key Components

### Infrastructure Services
- **MySQL Databases**: 5 instances (auth, bid, listings, payments, profile)
- **Redis**: Session storage and caching
- **NATS Streaming**: Event messaging
- **Storage**: Minikube hostpath provisioner

### Application Services
- **Frontend**: Next.js React application
- **API Gateway**: Route aggregation and CORS
- **Auth Service**: User authentication
- **Bid Service**: Auction bidding logic
- **Listings Service**: Auction item management
- **Payments Service**: Payment processing
- **Profile Service**: User profile management
- **Email Service**: Notification system
- **Saga Orchestrator**: Transaction coordination
- **Expiration Service**: Auction timer management

##  External Access Methods

### Method 1: NodePort (Recommended)
- Direct access via `SERVER_IP:30000/30001`
- No additional configuration needed
- Works through firewalls

### Method 2: Port Forwarding
- Access via `SERVER_IP:3000/3001`
- Requires running port forwarding script
- More flexible for development

### Method 3: Ingress + Domain
- Custom domain setup
- Requires DNS configuration
- Professional appearance

## 📱 Testing Your Deployment

### 1. Basic Connectivity
```bash
# Test frontend
curl http://YOUR_SERVER_IP:30000

# Test API Gateway
curl http://YOUR_SERVER_IP:30001/health
```

### 2. Application Features
1. **User Registration**: Create new account
2. **User Login**: Authenticate user
3. **Create Listing**: Add auction item
4. **Place Bid**: Test bidding system
5. **Real-time Updates**: Multiple browser windows

### 3. Monitoring Commands
```bash
# Check all pods
kubectl get pods -A

# Check services
kubectl get svc -A

# View logs
kubectl logs -f deployment/frontend -n auction-system

# Monitor resources
kubectl top pods -A
```

##  Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Pods not starting | Check resources: `kubectl describe pod <pod-name>` |
| External access fails | Verify firewall: `sudo ufw status` |
| Database connections fail | Check MySQL logs: `kubectl logs -n auction-infrastructure deployment/auth-mysql` |
| Out of memory | Increase Minikube resources or reduce replicas |

### Quick Fixes

```bash
# Restart deployment
kubectl rollout restart deployment/frontend -n auction-system

# Check pod events
kubectl get events -n auction-system --sort-by='.lastTimestamp'

# Scale down if resources are tight
kubectl scale deployment frontend --replicas=1 -n auction-system

# Check Minikube status
minikube status -p auction-cluster
```

##  Management Commands

### Start/Stop
```bash
# Start Minikube
minikube start -p auction-cluster

# Stop Minikube
minikube stop -p auction-cluster

# Delete cluster
minikube delete -p auction-cluster
```

### Scaling
```bash
# Scale frontend
kubectl scale deployment frontend --replicas=3 -n auction-system

# Scale API gateway
kubectl scale deployment api-gateway --replicas=2 -n auction-system
```

### Updates
```bash
# Update image
kubectl set image deployment/frontend frontend=new-image:tag -n auction-system

# Rollback
kubectl rollout undo deployment/frontend -n auction-system
```

##  Security Notes

- Change default passwords in `k8s/secrets/auction-secrets.yaml`
- Configure proper firewall rules
- Use HTTPS for production
- Regular security updates
- Monitor resource usage

## 📚 Additional Resources

- **Full Guide**: `MINIKUBE-UBUNTU-DEPLOYMENT-GUIDE.md`
- **Docker Compose Reference**: `docker-compose.yml`
- **Kubernetes Configs**: `k8s/` directory
- **Monitoring**: Use `./scripts/monitor-minikube.sh`

##  Success Indicators

 All pods show `Running` status  
 Frontend accessible at `http://SERVER_IP:30000`  
 API Gateway responds at `http://SERVER_IP:30001`  
 User registration works  
 Auction creation works  
 Real-time bidding works  

##  Getting Help

1. Check deployment status: `./scripts/monitor-minikube.sh`
2. View pod logs: `kubectl logs <pod-name> -n <namespace>`
3. Check events: `kubectl get events -A`
4. Test connectivity: `curl http://SERVER_IP:30000`

---

** Ready to go live?** Your auction website is now running on Minikube with external access!
