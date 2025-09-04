# Production Deployment with Docker Hub

This directory contains production-ready Docker Compose configurations for pulling and running the Auction Website application from Docker Hub images built by GitHub Actions.

## Files Overview

- `docker-compose-production.yml` - **NEW** Production Docker Compose configuration (recommended)
- `.env.production.template` - **NEW** Environment template for production
- `run-production.sh` - **NEW** Automated deployment script
- `docker-compose-pull-v2.yml` - Legacy pull configuration (has missing features)
- `README.md` - This documentation

## Quick Start (Recommended)

### 1. Prepare Environment

Copy the environment template and customize it for your production server:

```bash
cp .env.production.template .env.production
```

Edit `.env.production` and update critical values like JWT_KEY, MYSQL_ROOT_PASSWORD, SERVER_IP, AWS credentials, etc.

### 2. Deploy Application

```bash
# Full deployment (pull images and start services)
./run-production.sh

# Pull images only
./run-production.sh --pull-only

# Start services without pulling 
./run-production.sh --skip-pull
```

### 3. Verify Deployment

Access your application:

- **Frontend**: `http://your.server.ip.here:3000`
- **API Gateway**: `http://your.server.ip.here:3001`
- **Jaeger Tracing UI**: `http://your.server.ip.here:16686`

## Legacy Usage (docker-compose-pull-v2.yml)

 **Warning**: The legacy configuration is missing several important features:

- No Jaeger distributed tracing
- Missing environment variables for tracing
- No health checks
- No restart policies
- Missing AWS S3 configuration for profile images
- Missing FRONTEND_URL for email templates

### Legacy Commands:

```bash
# Copy environment file from parent directory
cp ../.env .env.production

# Pull images
docker-compose -f docker-compose-pull-v2.yml pull

# Start services
docker-compose -f docker-compose-pull-v2.yml --env-file .env.production up -d

# Check status
docker-compose -f docker-compose-pull-v2.yml ps

# View logs
docker-compose -f docker-compose-pull-v2.yml logs -f
```

## Key Improvements in Production Version

### Fixed Issues:

- Added Jaeger distributed tracing (missing in v2)
- Complete environment variables for all services
- Health checks for databases
- Restart policies for production reliability
- AWS S3 configuration for profile image uploads
- FRONTEND_URL for email templates
- Consistent port configuration
- Production-optimized defaults
- Automated deployment script
- Comprehensive documentation

## Troubleshooting

### Service Failures:

```bash
# Check specific service logs
docker-compose -f docker-compose-production.yml --env-file .env.production logs <service-name>

# Check all services
docker-compose -f docker-compose-production.yml --env-file .env.production ps
```

### Common Issues:

- Ensure `.env.production` has all required variables
- Wait for databases to initialize (30-60 seconds)
- Check Docker Hub connectivity
- Verify ports are not already in use
- Check firewall settings for external access
