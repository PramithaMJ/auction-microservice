# Bulkhead Pattern Implementation

## Overview

The Bulkhead Pattern is a resilience pattern that isolates components of an application to prevent cascading failures. This pattern is named after the compartmentalized sections (bulkheads) in ships that prevent a single breach from sinking the entire vessel.

In this auction website, we've implemented bulkheads to ensure that traffic spikes or failures in one part of the system don't affect other critical components.

## Key Components

### 1. API Gateway Bulkhead

The API Gateway service now includes a bulkhead implementation that:

- Limits concurrent requests to each downstream service
- Provides isolation between different service types (auth, bid, listings, etc.)
- Gracefully rejects requests when a service is at capacity
- Offers monitoring and reset capabilities

### 2. Integration with Circuit Breaker

The bulkhead pattern works alongside our existing circuit breaker pattern:

- **Circuit Breaker**: Prevents calls to failing services
- **Bulkhead**: Limits resource consumption to prevent overload

Together, these patterns provide comprehensive resilience against both service failures and traffic spikes.

## Configuration

The bulkhead implementation can be configured with the following parameters:

```typescript
{
  maxConcurrentRequests: 50,  // Maximum concurrent requests per service
  maxWaitTime: 1000,         // Maximum wait time in milliseconds
  queueSize: 10              // Size of the queue for pending requests
}
```

Each service has specific limits:

- **Auth**: 60 concurrent requests, queue size 15
- **Bid**: 100 concurrent requests, queue size 25
- **Listings**: 80 concurrent requests, queue size 20
- **Payments**: 40 concurrent requests, queue size 10
- **Profile**: 50 concurrent requests, queue size 15
- **Email**: 30 concurrent requests, queue size 50

## Monitoring and Management

### Endpoints

- `GET /bulkhead/status` - View current bulkhead metrics for all services
- `POST /bulkhead/reset/:serviceName` - Reset a service's bulkhead
- `GET /health` - Combined health check including bulkhead status

### Metrics

For each service, the bulkhead tracks:

- Current concurrent executions
- Maximum allowed concurrent executions
- Current queue size
- Queue capacity
- Rejection count
- Bulkhead state (OPEN or CLOSED)

## Behavior During High Load

1. When a service reaches its concurrent execution limit:

   - New requests are rejected with HTTP 429 (Too Many Requests)
   - Clients receive a structured response explaining the capacity issue
2. After load decreases:

   - Bulkhead automatically opens as executions complete
   - No manual intervention required

## Example Response

When a service is at capacity:

```json
{
  "error": "Service At Capacity",
  "message": "The bid service is currently at capacity. Please try again later.",
  "serviceName": "bid",
  "bulkheadState": "CLOSED",
  "concurrentExecutions": 100,
  "maxConcurrentExecutions": 100,
  "timestamp": "2023-09-05T12:34:56.789Z",
  "requestId": "abc-123-xyz"
}
```

## Best Practices

1. Set appropriate limits based on each service's resource requirements
2. Monitor bulkhead metrics to adjust limits as needed
3. Implement client-side retry with exponential backoff for 429 responses
4. Consider service criticality when allocating resources (bid operations vs. recommendations)

## Implementation Details

The bulkhead pattern is implemented in:

- `/services/api-gateway/src/bulkhead.ts` - Core bulkhead implementation
- `/services/api-gateway/src/bulkhead-middleware.ts` - Express middleware
- `/services/api-gateway/src/index.ts` - Integration with API Gateway
