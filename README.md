# AuctionHub Website - Microservice (Monorepo)

[![CI Pipeline](https://github.com/PramithaMJ/auction-microservice/actions/workflows/ci.yml/badge.svg)](https://github.com/PramithaMJ/auction-microservice/actions/workflows/ci.yml)

[![Production CI Pipeline](https://github.com/PramithaMJ/auction-microservice/actions/workflows/production-ci.yml/badge.svg)](https://github.com/PramithaMJ/auction-microservice/actions/workflows/production-ci.yml)

This repository contains a full-featured auction platform built with a microservices architecture. It leverages Docker for containerization and Kubernetes for orchestration, supporting local development and production deployments.

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

## Documentation

### Deployment Guides

- **[Kubernetes Deployment Guide](k8s/README.md)** - Complete K8s deployment instructions
- **[Quick Start Guide](k8s/QUICK-START.md)** - Fast deployment reference
- **[Complete Setup Guide](docs/COMPLETE-SETUP-GUIDE.md)** - Comprehensive setup instructions

### Technical Documentation

- **[Circuit Breaker Guide](docs/CIRCUIT-BREAKER-COMPLETE-GUIDE.md)** - Resilience patterns
- **[User Registration Saga](docs/USER-REGISTRATION-SAGA-GUIDE.md)** - Distributed transactions
- **[AWS Secrets Manager](aws-secrets-manager/README.md)** - Secret management
