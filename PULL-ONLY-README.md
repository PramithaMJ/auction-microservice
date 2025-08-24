# 🐳 Pull-Only Docker Compose Setup

This setup allows you to run your auction website using only pre-built Docker images from Docker Hub, without any local building.

## 🚀 Quick Start

### Method 1: Using the Script (Recommended)
```bash
# Run with latest images
./scripts/pull-and-run.sh

# Run with specific version
./scripts/pull-and-run.sh v1.0.123

# Run with specific commit
./scripts/pull-and-run.sh v1.0.123-abc1234
```

### Method 2: Direct Docker Compose
```bash
# Set the version you want
export IMAGE_TAG=v1.0.123

# Pull and run
docker-compose -f docker-compose.pull-only.yml up -d
```

### Method 3: Using .env file
```bash
# Edit .env file
echo "IMAGE_TAG=v1.0.123" > .env

# Run with default compose file
docker-compose -f docker-compose.pull-only.yml up -d
```

## 📦 Available Images

All images are hosted on Docker Hub under `pramithamj/auction-website/`:

- `auth` - Authentication service
- `bid` - Bidding service  
- `listing` - Listings service
- `payment` - Payment service
- `profile` - Profile service
- `email` - Email service
- `expiration` - Expiration service
- `api-gateway` - API Gateway
- `frontend` - Next.js Frontend

## 🏷️ Image Tags

### Latest
```bash
pramithamj/auction-website/auth:latest
```

### Versioned
```bash
pramithamj/auction-website/auth:v1.0.123
pramithamj/auction-website/auth:v1.0.123-abc1234
```

## 🌐 Service URLs

After running, your services will be available at:

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **Auth Service**: http://localhost:3101
- **Bid Service**: http://localhost:3102
- **Listings Service**: http://localhost:3103
- **Payments Service**: http://localhost:3104
- **Profile Service**: http://localhost:3105
- **Email Service**: http://localhost:3106
- **Expiration Service**: http://localhost:3107

## 🗃️ Database Access

- **Auth MySQL**: localhost:3306
- **Bid MySQL**: localhost:3307
- **Listings MySQL**: localhost:3308
- **Payments MySQL**: localhost:3309
- **Profile MySQL**: localhost:3310
- **Redis**: localhost:6379
- **NATS**: localhost:4222

## 🛠️ Management Commands

### Start Services
```bash
# Latest version
./scripts/pull-and-run.sh

# Specific version
./scripts/pull-and-run.sh v1.0.100
```

### Stop Services
```bash
docker-compose -f docker-compose.pull-only.yml down
```

### View Status
```bash
docker-compose -f docker-compose.pull-only.yml ps
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.pull-only.yml logs -f

# Specific service
docker-compose -f docker-compose.pull-only.yml logs -f frontend
```

### Restart Services
```bash
docker-compose -f docker-compose.pull-only.yml restart
```

### Update to New Version
```bash
# Stop current
docker-compose -f docker-compose.pull-only.yml down

# Run new version
./scripts/pull-and-run.sh v1.0.124
```

## 🔧 Configuration

### Environment Variables
Edit `.env` file to set default image tag:
```bash
IMAGE_TAG=v1.0.123
```

### Custom Environment Variables
You can override any environment variable:
```bash
# Set custom database password
export MYSQL_ROOT_PASSWORD=mynewpassword

# Set custom JWT key
export JWT_KEY=mynewjwtkey

# Run with custom settings
docker-compose -f docker-compose.pull-only.yml up -d
```

## 📋 Version Management

### Check Available Versions
Visit Docker Hub to see available versions:
https://hub.docker.com/u/pramithamj

### Use Specific Versions in Production
```bash
# Production stable
export IMAGE_TAG=v1.0.100

# Staging latest
export IMAGE_TAG=latest

# Development specific feature
export IMAGE_TAG=v1.0.123-feature-branch
```

## 🚨 Troubleshooting

### Image Not Found
```bash
# Check if image exists on Docker Hub
docker search pramithamj/auction-website

# Try pulling manually
docker pull pramithamj/auction-website/auth:v1.0.123
```

### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.pull-only.yml logs [service-name]

# Check if ports are free
lsof -i :3000-3110
```

### Database Connection Issues
```bash
# Wait for databases to be ready
docker-compose -f docker-compose.pull-only.yml logs auth-mysql

# Check database health
docker-compose -f docker-compose.pull-only.yml exec auth-mysql mysqladmin ping
```

## 💡 Tips

1. **Always use specific versions in production**
2. **Test new versions in staging first**
3. **Keep your .env file updated**
4. **Monitor logs for any issues**
5. **Use the pull-and-run script for convenience**

## 🎯 No Build Required!

This setup is perfect when:
- ✅ You just want to run the application
- ✅ Images are already built by CI/CD
- ✅ You don't need to modify source code
- ✅ You want fast deployment
- ✅ You're running in production

---

🎉 **Ready to run your auction website with zero build time!**
