# Environment Configuration Guide

This guide helps you configure the auction website for different deployment environments without hardcoded IPs or URLs.

## Quick Setup

### Option 1: Automated Configuration (Recommended)

Run the configuration script:
```bash
./configure-env.sh
```

This will guide you through:
- Local development setup
- EC2/Production server setup  
- Custom configuration

### Option 2: Manual Configuration

1. Copy the appropriate example file:
   ```bash
   # For local development
   cp .env.local.example .env
   
   # For production
   cp .env.production.example .env
   ```

2. Edit the `.env` file with your specific values

## Configuration Options

### Frontend URL Configuration

The application uses this priority order for API URLs:

1. **NEXT_PUBLIC_API_URL** (highest priority) - Full URL
   ```bash
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. **NEXT_PUBLIC_API_GATEWAY_PORT** - Port with current hostname
   ```bash
   NEXT_PUBLIC_API_GATEWAY_PORT=3001
   # Frontend will use: http://current-hostname:3001
   ```

3. **Default behavior** - Uses localhost:3001 for local, current-hostname:3001 for remote

### Key Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Full API URL (highest priority) | `https://api.example.com` |
| `NEXT_PUBLIC_API_GATEWAY_PORT` | API port for current hostname | `3001` |
| `FRONTEND_PORT` | Frontend port | `3000` |
| `API_GATEWAY_PORT` | API Gateway port | `3001` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated) | `http://1.2.3.4:3000,https://example.com` |
| `SERVER_API_URL` | Internal Docker API URL | `http://api-gateway:3001` |

## Deployment Scenarios

### Local Development
```bash
./configure-env.sh
# Choose option 1
docker-compose up -d
```

### EC2 Server
```bash
./configure-env.sh
# Choose option 2
# Enter your EC2 public IP (e.g., 3.87.83.50)
docker-compose up -d
```

### Custom Domain with Load Balancer
```bash
# Set full API URL
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

### Docker Swarm/Kubernetes
```bash
# Use service names for internal communication
SERVER_API_URL=http://api-gateway-service:3001
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

## Security Notes

1. **Change default passwords** in production
2. **Use HTTPS** in production with proper SSL certificates
3. **Generate secure JWT secrets** (script does this automatically)
4. **Configure proper CORS origins** for your domains
5. **Use environment-specific Docker image tags**

## Troubleshooting

### CORS Issues
- Ensure your frontend URL is in `CORS_ORIGIN`
- Check that ports match between frontend and CORS configuration

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_GATEWAY_PORT`
- Check that API Gateway is accessible on the configured port
- Test API health: `curl http://your-server:3001/health`

### Docker Issues
- Ensure environment variables are loaded: `docker-compose config`
- Check container logs: `docker-compose logs api-gateway`

## Migration from Hardcoded IPs

If you're migrating from hardcoded IPs:

1. Run the configuration script: `./configure-env.sh`
2. Choose EC2/Production setup
3. Enter your current server IP
4. Restart services: `docker-compose down && docker-compose up -d`

The application will now be fully configurable for any server or domain change.
