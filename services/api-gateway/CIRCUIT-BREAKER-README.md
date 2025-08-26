# API Gateway Circuit Breaker Implementation

## Overview

The API Gateway now includes a **Circuit Breaker pattern** implementation that protects your microservices architecture from cascade failures and provides graceful degradation when services are unavailable.

## Features Implemented

###  **Circuit Breaker States**
- **CLOSED**: Normal operation, all requests pass through
- **OPEN**: Service is down, requests are immediately rejected with fallback responses
- **HALF_OPEN**: Testing phase to check if service has recovered

###  **Automatic Failure Detection**
- Monitors service failures in real-time
- Configurable failure threshold (default: 5 failures)
- Time-window based monitoring (default: 1 minute)

###  **Fast-Fail Mechanism**
- Immediate response when circuit is open
- No waiting for timeouts on known failed services
- Reduces resource consumption

###  **Service-Specific Fallback Responses**
- Custom fallback messages for each service:
  - **Auth Service**: Authentication fallback with session guidance
  - **Listings Service**: Suggests cached listings
  - **Bid Service**: Assures bid safety
  - **Payments Service**: Payment retry guidance
  - **Profile Service**: Data safety assurance

###  **Automatic Recovery Testing**
- Transitions to HALF_OPEN state after timeout (default: 30 seconds)
- Tests service recovery with limited requests
- Automatically closes circuit when service is healthy

###  **Management Endpoints**
- `GET /circuit-breaker/status` - View all circuit breaker states
- `POST /circuit-breaker/reset/:serviceName` - Manually reset a circuit breaker
- Enhanced `/health` endpoint with circuit breaker status

## Configuration

```typescript
new CircuitBreaker({
  failureThreshold: 5,        // Open circuit after 5 failures
  resetTimeout: 30000,        // Try again after 30 seconds
  timeout: 10000,            // 10 second request timeout
  monitoringWindow: 60000     // 1 minute failure tracking window
})
```

## How It Works

### Normal Operation (CLOSED State)
```
Client → API Gateway → Circuit Breaker (CLOSED) → Service
                     ← Success Response         ←
```

### Service Failure Detection
```
Client → API Gateway → Circuit Breaker → Service (Failed)
                     ← Failure Count++
```

### Circuit Open (Protection Mode)
```
Client → API Gateway → Circuit Breaker (OPEN) → ❌ Blocked
                     ← Fallback Response
```

### Recovery Testing (HALF_OPEN State)
```
Client → API Gateway → Circuit Breaker (HALF_OPEN) → Service
                     ← Test Success → CLOSED State
```

## Service Protection

The circuit breaker protects all services routed through the API Gateway:

| Service | Port | Protected Paths | Fallback Behavior |
|---------|------|----------------|-------------------|
| **Auth** | 3101 | `/api/auth/*` | Session guidance |
| **Bid** | 3102 | `/api/bids/*` | Bid safety assurance |
| **Listings** | 3103 | `/api/listings/*` | Cached listings suggestion |
| **Payments** | 3104 | `/api/payments/*` | Retry guidance |
| **Profile** | 3105 | `/api/profile/*` | Data safety assurance |

## Testing the Implementation

### 1. Start the API Gateway
```bash
cd services/api-gateway
npm start
```

### 2. Run the Demo Script
```bash
./demo-circuit-breaker.sh
```

### 3. Manual Testing
```bash
# Check circuit breaker status
curl http://localhost:3001/circuit-breaker/status

# Test service request (will fail if service is down)
curl http://localhost:3001/api/auth/currentuser

# Reset a circuit breaker
curl -X POST http://localhost:3001/circuit-breaker/reset/auth

# Check health with circuit breaker info
curl http://localhost:3001/health
```

## Benefits for Your Auction Platform

### 🛡️ **Prevents Cascade Failures**
- If one service goes down, others remain functional
- Users can still browse listings even if bidding is temporarily unavailable

### ⚡ **Improved Performance**
- Fast-fail responses instead of hanging requests
- No waiting for timeouts on known failed services

### 🎯 **Better User Experience**
- Clear error messages with helpful suggestions
- Graceful degradation of features

### 📊 **Enhanced Monitoring**
- Real-time visibility into service health
- Circuit breaker state tracking
- Failure pattern detection

### 🔧 **Operational Control**
- Manual circuit breaker reset capability
- Service-specific configuration
- Health check integration

## Logs and Monitoring

The circuit breaker provides detailed logging:

```
 Proxying GET /api/auth/currentuser → auth (Circuit: CLOSED)
❌ Circuit breaker failure recorded for auth: 5/5
🚫 Circuit breaker for auth is now OPEN. Next attempt at 2025-08-26T...
🚫 Circuit breaker blocked request to auth: Service auth is temporarily unavailable
 Circuit breaker for auth transitioning to HALF_OPEN
 Circuit breaker for auth transitioning to CLOSED (service recovered)
```

## Next Steps

This implementation provides the foundation for Step 1 of the circuit breaker pattern. The next step would be to implement circuit breaker protection for NATS messaging between services.

## Files Modified

- `/services/api-gateway/src/circuit-breaker.ts` - Circuit breaker implementation
- `/services/api-gateway/src/index.ts` - Integration with API Gateway
- `/services/api-gateway/demo-circuit-breaker.sh` - Demo script
- `/services/api-gateway/CIRCUIT-BREAKER-README.md` - This documentation
