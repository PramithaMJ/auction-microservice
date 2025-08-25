# Pull-Only Docker Deployment Guide

This guide covers the deployment of the auction website using pre-built Docker images rather than building them locally.

## Quick Start

Use the provided script to deploy the pull-only version:

```bash
./run-pull-only.sh
```

This script will:
1. Detect your host IP address
2. Set all the required environment variables
3. Stop any existing containers
4. Pull the latest Docker images
5. Start all services with the correct configuration

## Manual Configuration

If you need to set specific values, you can pass arguments to the script:

```bash
./run-pull-only.sh [SERVER_IP] [API_GATEWAY_PORT] [FRONTEND_PORT] [IMAGE_TAG]
```

Example:
```bash
./run-pull-only.sh 192.168.1.100 3001 3000 v1.0.45
```

## Troubleshooting

### CSS Not Loading

If the CSS is not loading properly:

1. Make sure you're using the correct SERVER_IP environment variable:
   ```bash
   export SERVER_IP=your_actual_ip_address
   ```

2. Check that CORS is properly configured:
   ```bash
   export CORS_ORIGIN="http://${SERVER_IP}:3000,http://localhost:3000"
   ```

3. Verify the frontend container logs:
   ```bash
   docker-compose -f docker-compose.pull-only.yml logs -f frontend
   ```

4. Try accessing the site with different URLs:
   - http://localhost:3000
   - http://{your_ip}:3000

### Ensuring Environment Variables are Set

You can check your current environment variables with:

```bash
docker-compose -f docker-compose.pull-only.yml config
```

This will show you the resolved configuration with all environment variables substituted.

### Specific Service Issues

For troubleshooting specific services:

```bash
# Check API Gateway logs
docker-compose -f docker-compose.pull-only.yml logs -f api-gateway

# Check frontend logs
docker-compose -f docker-compose.pull-only.yml logs -f frontend
```

## Environment Variables

Key environment variables for the pull-only deployment:

| Variable | Description | Default |
|----------|-------------|---------|
| SERVER_IP | The IP address of your host machine | localhost |
| API_GATEWAY_PORT | Port for the API Gateway | 3001 |
| FRONTEND_PORT | Port for the frontend service | 3000 |
| IMAGE_TAG | Docker image tag to use | latest |
| NODE_ENV | Node.js environment | production |
| NEXT_PUBLIC_API_URL | URL for frontend to access API | http://{SERVER_IP}:3001 |

## Common Solutions

1. **Restart All Services**: Sometimes a clean restart fixes issues:
   ```bash
   docker-compose -f docker-compose.pull-only.yml down
   docker-compose -f docker-compose.pull-only.yml up -d
   ```

2. **Force Pull Latest Images**:
   ```bash
   docker-compose -f docker-compose.pull-only.yml pull
   ```

3. **Clear Docker Cache** (if you're having persistent issues):
   ```bash
   docker system prune -a
   ```
