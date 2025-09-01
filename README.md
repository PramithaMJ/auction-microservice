# AuctionHub Website - Microservice (Monorepo)

[![CI Pipeline](https://github.com/PramithaMJ/auction-microservice/actions/workflows/ci.yml/badge.svg)](https://github.com/PramithaMJ/auction-microservice/actions/workflows/ci.yml)

[![Production CI Pipeline](https://github.com/PramithaMJ/auction-microservice/actions/workflows/production-ci.yml/badge.svg)](https://github.com/PramithaMJ/auction-microservice/actions/workflows/production-ci.yml)

This repository contains a full-featured auction platform built with a microservices architecture. It leverages Docker for containerization and Kubernetes for orchestration, supporting local development and production deployments.

##  Table of Contents

- [Architecture Overview](#architecture-overview)
- [Deployment Options](#deployment-options)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Support](#support)

## 🏗 Architecture Overview

The auction platform consists of 9 microservices and a React frontend:

### Core Services
- **API Gateway** - Entry point and request routing
- **Auth Service** - Authentication and authorization
- **Bid Service** - Bid management and real-time bidding
- **Listings Service** - Auction item management
- **Payments Service** - Payment processing with Stripe
- **Profile Service** - User profile management
- **Email Service** - Email notifications
- **Expiration Service** - Auction expiry handling
- **Saga Orchestrator** - Distributed transaction coordination

### Infrastructure Components
- **MySQL Databases** (5 instances for service isolation)
- **NATS Streaming** - Event-driven communication
- **Redis** - Caching and session storage
- **Frontend** - Next.js React application

##  Deployment Options

### Option 1: Kubernetes (Recommended for Production)
Deploy on any Kubernetes cluster with automated scripts and comprehensive monitoring.

```bash
# Quick deployment
./k8s/deploy-all.sh

# Access the application
kubectl port-forward svc/frontend-service 3000:3000 -n auction-system
```

📖 **[Complete Kubernetes Guide →](k8s/README.md)**  
 **[Quick Start Guide →](k8s/QUICK-START.md)**

### Option 2: Docker Compose (Local Development)
Perfect for local development and testing.

```bash
# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:3001
```

### Option 3: Hybrid Local Development
Run some services locally while using infrastructure containers.

```bash
# Start infrastructure only
./start-local-hybrid.sh

# Develop individual services locally
cd services/auth && npm run dev
```

## ⚡ Quick Start

### Kubernetes Deployment
```bash
# 1. Clone the repository
git clone <repository-url>
cd auction-website

# 2. Deploy to Kubernetes
./k8s/deploy-all.sh

# 3. Check deployment status
kubectl get pods -n auction-system

# 4. Access the application
kubectl port-forward svc/frontend-service 3000:3000 -n auction-system
```

### Docker Compose Deployment
```bash
# 1. Clone the repository
git clone <repository-url>
cd auction-website

# 2. Start all services
docker-compose up -d

# 3. Access the application
open http://localhost:3000
```

## ⚙️ Configuration

### Environment Variables
Key configuration files:
- **Kubernetes**: `k8s/configmaps/auction-configmap.yaml`
- **Docker Compose**: `.env` files in service directories
- **Secrets**: `k8s/secrets/auction-secrets.yaml`

### Required External Services
- **AWS S3** - File storage (optional, falls back to local storage)
- **Stripe** - Payment processing (test keys included)
- **Email Service** - SMTP configuration for notifications

## 📚 Documentation

### Deployment Guides
- **[Kubernetes Deployment Guide](k8s/README.md)** - Complete K8s deployment instructions
- **[Quick Start Guide](k8s/QUICK-START.md)** - Fast deployment reference
- **[Complete Setup Guide](docs/COMPLETE-SETUP-GUIDE.md)** - Comprehensive setup instructions

### Technical Documentation
- **[Circuit Breaker Guide](docs/CIRCUIT-BREAKER-COMPLETE-GUIDE.md)** - Resilience patterns
- **[User Registration Saga](docs/USER-REGISTRATION-SAGA-GUIDE.md)** - Distributed transactions
- **[AWS Secrets Manager](aws-secrets-manager/README.md)** - Secret management

### Service Documentation
Each service has its own README with specific configuration and API documentation:
- `services/auth/README.md`
- `services/api-gateway/README.md`
- `services/bid/README.md`
- And more...

## 🛠 Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- kubectl (for Kubernetes)
- Kubernetes cluster (Minikube, Docker Desktop, or cloud)

### Local Development Setup
```bash
# Install dependencies for all services
npm run install:all

# Start infrastructure
docker-compose -f docker-compose.infrastructure.yml up -d

# Start individual services
cd services/auth && npm run dev
cd services/api-gateway && npm run dev
# ... repeat for other services
```

### Building and Pushing Images
```bash
# Build all images
./scripts/build-all.sh

# Push to registry
./scripts/push-all.sh

# Pull and run latest images
./scripts/pull-and-run.sh
```

##  Monitoring

### Health Checks
```bash
# Kubernetes
kubectl get pods -A | grep auction

# Docker Compose
docker-compose ps
```

### Logs
```bash
# Kubernetes
kubectl logs -f deployment/api-gateway -n auction-system

# Docker Compose
docker-compose logs -f api-gateway
```

##  Cleanup

### Kubernetes
```bash
# Full cleanup
./k8s/cleanup.sh

# Keep infrastructure and data
./k8s/cleanup.sh --keep-infra --keep-pvcs
```

### Docker Compose
```bash
# Stop all services
docker-compose down

# Remove volumes (deletes data)
docker-compose down -v
```

## 🆘 Support

### Common Issues
1. **Pods not starting**: Check resource limits and image availability
2. **Database connections**: Verify service discovery and credentials
3. **Port conflicts**: Ensure ports 3000-3108 are available

### Getting Help
1. Check the [troubleshooting section](k8s/README.md#monitoring-and-troubleshooting) in the K8s guide
2. Review service logs for error messages
3. Verify configuration in configmaps and secrets

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both Docker Compose and Kubernetes
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
