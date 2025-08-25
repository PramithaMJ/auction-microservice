# CORS Troubleshooting Guide

This guide provides steps to diagnose and fix CORS (Cross-Origin Resource Sharing) issues in the Auction Website application.

## Common CORS Errors

When you see errors like:

```
Access to XMLHttpRequest at 'http://98.87.131.233:3001/api/auth/signin' from origin 'http://98.87.131.233:3000' has been blocked by CORS policy.
```

This means that the API Gateway is not properly configured to allow requests from your frontend application.

## Quick Fix Steps

1. **Deploy with the production script:**

   ```bash
   ./deploy-production.sh
   ```

   This script will automatically set the correct environment variables for production deployment.

2. **Manually set environment variables:**

   If you need to manually set the environment variables:

   ```bash
   # Set the server IP
   export SERVER_IP=98.87.131.233
   
   # Set API Gateway Port
   export API_GATEWAY_PORT=3001
   
   # Set Frontend Port
   export FRONTEND_PORT=3000
   
   # Set CORS origins
   export CORS_ORIGIN="http://${SERVER_IP}:${FRONTEND_PORT},https://${SERVER_IP}:${FRONTEND_PORT},http://${SERVER_IP},https://${SERVER_IP}"
   
   # Set API URL for frontend
   export NEXT_PUBLIC_API_URL="http://${SERVER_IP}:${API_GATEWAY_PORT}"
   ```

3. **Restart the services:**

   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Debugging CORS Issues

1. **Check API Gateway logs:**

   ```bash
   docker-compose logs api-gateway
   ```

   Look for any CORS-related errors or configuration messages.

2. **Check frontend logs:**

   ```bash
   docker-compose logs frontend
   ```

   Look for network request errors or API connection issues.

3. **Verify CORS configuration:**

   Check that the `CORS_ORIGIN` environment variable in the API Gateway service includes all necessary origins.

4. **Test with curl:**

   Test API endpoints with curl to verify they're working:

   ```bash
   # Test the API Gateway
   curl -v http://98.87.131.233:3001/health
   
   # Test with OPTIONS request (simulates CORS preflight)
   curl -v -X OPTIONS http://98.87.131.233:3001/api/auth/signin \
     -H "Origin: http://98.87.131.233:3000" \
     -H "Access-Control-Request-Method: POST"
   ```

## Common Solutions

1. **Update the CORS configuration in the API Gateway:**

   Edit the `services/api-gateway/config/default.ts` file to include all necessary origins.

2. **Check for typos in URLs:**

   Ensure that the URLs in the frontend application match exactly what's configured in the CORS settings.

3. **Use the correct protocol:**

   Make sure you're using `http://` or `https://` consistently.

4. **Use the browser developer tools:**

   Check the network tab in developer tools to see the exact request and response headers.

5. **Disable browser extensions:**

   Some browser extensions can interfere with CORS requests. Try disabling extensions or using an incognito window.

## Production Considerations

For a production environment, consider the following:

- Use a reverse proxy like Nginx to handle CORS
- Set up proper SSL certificates for HTTPS
- Use environment-specific configuration files
- Consider using a domain name instead of an IP address
