#!/bin/bash
# Production environment configuration script

# Set the API gateway URL for frontend to use
export NEXT_PUBLIC_API_URL=http://98.87.131.233:3001
export NEXT_PUBLIC_API_GATEWAY_PORT=3001

# Set CORS configuration for API Gateway
export CORS_ORIGIN=http://98.87.131.233:3000,https://98.87.131.233:3000,http://98.87.131.233:3001,https://98.87.131.233:3001,http://98.87.131.233,https://98.87.131.233

echo "Production environment variables set successfully!"
echo "NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "CORS_ORIGIN: $CORS_ORIGIN"
