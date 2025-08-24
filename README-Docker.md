# Auction Website - Docker Setup

This guide shows you how to run the entire Auction Website using Docker Compose instead of the hybrid script.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)
- At least 8GB RAM available for Docker

### 1. Environment Configuration
```bash
# Copy the environment template
cp .env.docker .env

# Edit the .env file with your actual configuration
# Important: Update these values:
# - JWT_KEY (use a strong random string)
# - AWS credentials (for image uploads)
# - Stripe key (for payments)
# - Email settings (for notifications)
```

### 2. Start All Services
```bash
./start-docker.sh
```

This script will:
- ✅ Check all prerequisites
- 🏗️ Build all Docker images
- 🚀 Start all services in the correct order
- ⏳ Wait for services to be ready
- 📊 Show service status and URLs

### 3. Access the Application
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:3001
- **NATS Monitoring**: http://localhost:8222

## 🛠️ Service Management

### Stop Services
```bash
./stop-docker.sh
```

This provides options to:
1. Stop services (keep data)
2. Stop and remove containers (keep data)
3. Complete cleanup (⚠️ deletes all data)
4. Stop specific service
5. Restart all services
6. View service logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth

# Real-time logs for multiple services
docker-compose logs -f auth bid listings
```

### Restart Specific Service
```bash
docker-compose restart auth
```

### Scale Services (if needed)
```bash
# Run multiple instances of a service
docker-compose up -d --scale auth=2
```

## 🏗️ Architecture

### Infrastructure Services
- **NATS Streaming** (4222, 8222) - Message broker
- **Redis** (6379) - Cache and session store
- **MySQL Instances** (3306-3310) - Databases for each service

### Application Services
- **API Gateway** (3001) - Routes requests to microservices
- **Auth Service** (3101) - User authentication
- **Bid Service** (3102) - Auction bidding
- **Listings Service** (3103) - Auction listings
- **Payments Service** (3104) - Payment processing
- **Profile Service** (3105) - User profiles
- **Email Service** (3106) - Email notifications
- **Expiration Service** (3107) - Auction expiration handling
- **Frontend** (3000) - Next.js web application

## 🔧 Development

### Hot Reloading
The frontend service is configured for development with hot reloading. Changes to frontend code will automatically reload the browser.

### Debug a Service
```bash
# Stop a specific service
docker-compose stop auth

# Run it with debug output
docker-compose run --rm -p 3101:3101 auth npm run dev
```

### Access Service Shell
```bash
# Get shell access to a running service
docker-compose exec auth sh

# Or start a new container with shell
docker-compose run --rm auth sh
```

### Database Access
```bash
# Connect to a database
docker-compose exec auth-mysql mysql -u root -ppassword auth
```

## 📊 Monitoring

### Check Service Health
```bash
# View all containers status
docker-compose ps

# Check specific service health
curl http://localhost:3001/health
```

### Resource Usage
```bash
# View resource usage
docker stats

# View specific service logs with timestamps
docker-compose logs -f -t auth
```

## 🔄 Updates and Rebuilds

### Rebuild Specific Service
```bash
# Rebuild and restart a service
docker-compose up -d --build auth
```

### Rebuild All Services
```bash
# Stop, rebuild, and start all services
docker-compose down
docker-compose up -d --build
```

### Update Dependencies
```bash
# Rebuild with no cache (forces fresh npm install)
docker-compose build --no-cache auth
docker-compose up -d auth
```

## 🐛 Troubleshooting

### Services Won't Start
1. Check Docker Desktop is running
2. Ensure ports aren't already in use: `lsof -i :3000-3107`
3. Check available disk space: `docker system df`
4. Clean up unused containers: `docker system prune`

### Database Connection Issues
1. Check MySQL containers are running: `docker-compose ps`
2. Wait longer for database initialization (can take 1-2 minutes)
3. Check database logs: `docker-compose logs auth-mysql`

### Frontend Won't Load
1. Check if API Gateway is running: `curl http://localhost:3001/health`
2. Verify environment variables in `.env`
3. Check frontend logs: `docker-compose logs frontend`

### Performance Issues
1. Increase Docker Desktop memory allocation (8GB+ recommended)
2. Close unnecessary applications
3. Use `docker stats` to identify resource-heavy containers

## 📝 Environment Variables

Key variables in `.env`:
```bash
# Security
JWT_KEY=your_super_secret_jwt_key_here_change_this

# AWS (for image uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name

# Stripe (for payments)
STRIPE_KEY=sk_test_your_stripe_secret_key_here

# Email (for notifications)
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🔄 Migration from Hybrid Script

If you were using the `start-local-hybrid.sh` script:

1. **Stop the hybrid setup**: `./stop-local-hybrid.sh`
2. **Copy environment**: Your existing `.env` files should work
3. **Start Docker setup**: `./start-docker.sh`

Benefits of Docker setup:
- ✅ Consistent environment across machines
- ✅ No need for local Node.js/npm installation
- ✅ Isolated services with proper networking
- ✅ Easy scaling and management
- ✅ Simplified deployment to production

## 📚 Additional Commands

```bash
# View all images
docker images

# Clean up everything (be careful!)
docker system prune -a

# Backup database
docker-compose exec auth-mysql mysqldump -u root -ppassword auth > auth_backup.sql

# Restore database
docker-compose exec -T auth-mysql mysql -u root -ppassword auth < auth_backup.sql

# Export logs
docker-compose logs --no-color > all_services.log
```
