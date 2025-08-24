# API Gateway Service

The API Gateway service acts as a single entry point for all client requests to the auction website microservices. It routes requests to the appropriate backend services and handles cross-cutting concerns like CORS, logging, and error handling.

## Features

- **Request Routing**: Routes API requests to appropriate microservices
- **CORS Handling**: Configures CORS for frontend communication
- **Health Monitoring**: Provides health check endpoints
- **Error Handling**: Centralizes error handling and service unavailability
- **Logging**: Request/response logging for debugging
- **Security**: Basic security headers with Helmet

## Service Routing

| Path | Target Service | Port |
|------|---------------|------|
| `/api/auth/*` | Auth Service | 3101 |
| `/api/bids/*` | Bid Service | 3102 |
| `/api/listings/*` | Listings Service | 3103 |
| `/api/payments/*` | Payments Service | 3104 |
| `/api/profile/*` | Profile Service | 3105 |

## Environment Variables

```bash
# Server Configuration
PORT=3001
HOST=0.0.0.0

# Service URLs
AUTH_SERVICE_URL=http://localhost:3101
BID_SERVICE_URL=http://localhost:3102
LISTINGS_SERVICE_URL=http://localhost:3103
PAYMENTS_SERVICE_URL=http://localhost:3104
PROFILE_SERVICE_URL=http://localhost:3105

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Environment
NODE_ENV=development
```

## API Endpoints

### Health Check
```
GET /health
```
Returns the gateway status and configured services.

### API Documentation
```
GET /api
```
Returns information about available services and endpoints.

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Integration

The API Gateway integrates with:
- **Frontend**: Receives all API requests from the Next.js frontend
- **Auth Service**: Handles authentication and user management
- **Bid Service**: Manages bidding functionality
- **Listings Service**: Handles auction listings
- **Payments Service**: Processes payments via Stripe
- **Profile Service**: Manages user profiles

All services communicate through this gateway, providing a clean separation of concerns and centralized request handling.
