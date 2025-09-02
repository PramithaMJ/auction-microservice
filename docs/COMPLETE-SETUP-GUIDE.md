#  Complete CI/CD Setup Guide

Your auction website now has a complete CI/CD pipeline! Here's everything you need to know:

## 📁 Files Created

### GitHub Actions Workflows
- `.github/workflows/ci.yml` - Basic CI pipeline
- `.github/workflows/production-ci.yml` - Production-ready CI with tests and security

### Helper Scripts
- `scripts/build-all.sh` - Build all images locally
- `scripts/push-all.sh` - Push all images to Docker Hub
- `scripts/deploy.sh` - Deploy specific version
- `scripts/stop.sh` - Stop all services

### Configuration
- `.env.example` - Environment variables template
- `docker-compose.yml` - Updated with versioned images
- `CI-CD-README.md` - Detailed documentation

##  Setup Steps

### 1. GitHub Secrets Setup
Go to your GitHub repository → Settings → Secrets and variables → Actions:

```
DOCKER_USERNAME = pramithamj
DOCKER_PASSWORD = your_docker_hub_access_token
```

**Important**: Use an access token, not your password!

### 2. Docker Hub Access Token
1. Go to Docker Hub → Account Settings → Security
2. Click "New Access Token"
3. Name: "GitHub Actions"
4. Copy the token → Use as `DOCKER_PASSWORD`

### 3. Initialize Your Repository
```bash
# Add all files to git
git add .

# Commit the CI/CD setup
git commit -m "feat: Add complete CI/CD pipeline with versioning"

# Push to trigger the pipeline
git push origin main
```

##  Usage

### Local Development
```bash
# Build all images locally
./scripts/build-all.sh

# Deploy latest version
./scripts/deploy.sh

# Deploy specific version
./scripts/deploy.sh v1.0.123

# Stop all services
./scripts/stop.sh
```

### Production Deployment
```bash
# Use specific version in production
export IMAGE_TAG=v1.0.100
docker-compose up -d

# Or use the deploy script
./scripts/deploy.sh v1.0.100
```

##  Image Versioning

Every commit to `main` creates these tags:
- `latest` - Always the newest
- `v1.0.{build_number}` - Incremental version
- `v1.0.{build_number}-{commit_sha}` - Full version

Example: `pramithamj/auction-website/auth:v1.0.123-abc1234`

##  Service URLs (After Deployment)

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Microservices**:
  - Auth: http://localhost:3101
  - Bid: http://localhost:3102
  - Listings: http://localhost:3103
  - Payments: http://localhost:3104
  - Profile: http://localhost:3105
  - Email: http://localhost:3106
  - Expiration: http://localhost:3107

## 🗃️ Database Access

- Auth MySQL: `localhost:3306`
- Bid MySQL: `localhost:3307`
- Listings MySQL: `localhost:3308`
- Payments MySQL: `localhost:3309`
- Profile MySQL: `localhost:3310`
- Redis: `localhost:6379`
- NATS: `localhost:4222`

##  Monitoring & Debugging

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f auth

# Last 100 lines
docker-compose logs --tail=100 api-gateway
```

### Check Service Status
```bash
# Container status
docker-compose ps

# Service health
docker-compose exec auth curl http://localhost:3101/health
```

### GitHub Actions
- Go to GitHub → Actions tab
- Monitor pipeline runs
- Download build artifacts
- Check for failures

## 🛡️ Security Features

The production pipeline includes:
- **Vulnerability scanning** with Trivy
- **Code security analysis**
- **Dependency scanning**
- **Multi-stage builds** for smaller images
- **Non-root containers** where possible

##  Troubleshooting

### Pipeline Failures
1. Check GitHub Actions logs
2. Verify Docker Hub credentials
3. Ensure all Dockerfiles exist
4. Check service dependencies

### Local Build Issues
```bash
# Clean Docker cache
docker system prune -a

# Rebuild from scratch
docker-compose build --no-cache

# Check for port conflicts
docker-compose down
lsof -i :3000-3110
```

### Image Pull Failures
```bash
# Login to Docker Hub
docker login

# Manual pull test
docker pull pramithamj/auction-website/auth:latest

# Check image exists on Docker Hub
open https://hub.docker.com/u/pramithamj
```

##  Scaling & Production

### Kubernetes Deployment
Your `k8s/` folder contains Kubernetes manifests:
```bash
# Deploy to Kubernetes
kubectl apply -f k8s/

# Update with specific version
kubectl set image deployment/auth auth=pramithamj/auction-website/auth:v1.0.123
```

### Environment-Specific Configs
```bash
# Development
export IMAGE_TAG=latest

# Staging
export IMAGE_TAG=v1.0.123

# Production
export IMAGE_TAG=v1.0.100
```

##  Next Steps

1. **Set up staging/production environments**
2. **Configure monitoring** (Prometheus, Grafana)
3. **Add integration tests**
4. **Set up database migrations**
5. **Configure load balancing**
6. **Add SSL certificates**
7. **Set up backup strategies**

##  Tips

- **Always test locally** before pushing
- **Use specific versions** in production
- **Monitor image sizes** and optimize Dockerfiles
- **Keep secrets secure** and rotate regularly
- **Document changes** in commit messages
- **Use feature branches** for development

---

 **Congratulations!** Your auction website now has enterprise-grade CI/CD pipeline with automatic Docker builds, versioning, and deployment capabilities!
