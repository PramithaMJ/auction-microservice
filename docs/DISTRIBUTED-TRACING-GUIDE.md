# Distributed Tracing with Jaeger 

## Overview

This implementation adds comprehensive distributed tracing to the auction microservices using OpenTelemetry and Jaeger.

## Features Implemented

### 1. Infrastructure

- **Jaeger All-in-One**: Complete tracing backend with UI
- **OpenTelemetry SDK**: Modern tracing instrumentation
- **Auto-instrumentation**: HTTP, Database, Redis tracing out-of-the-box

### 2. Tracing Coverage

- **HTTP Requests**: All API calls between services
- **Database Operations**: MySQL queries and connections
- **Event Publishing**: NATS message publishing/consuming
- **File Operations**: S3 uploads and downloads
- **Cache Operations**: Redis interactions

### 3. Correlation IDs

- **Request Tracking**: Each request gets a unique correlation ID
- **Cross-Service**: IDs propagated across service boundaries
- **Event Correlation**: Events linked to originating requests

## Quick Start

```### 1.Access Jaeger UI

- Open http://localhost:16686
- Select service from dropdown
- View traces and dependencies

## 2. Generate Sample Traffic

```bash
# Create a listing
curl -X POST http://localhost:3001/api/listings \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Item","description":"Test Description","startPrice":100}'

# Place a bid
curl -X POST http://localhost:3001/api/bids \
  -H "Content-Type: application/json" \
  -d '{"listingId":"xxx","amount":150}'
```
## Trace Analysis

### Service Map

View the complete service topology and dependencies in Jaeger.

### Performance Monitoring

- Request latencies across services
- Database query performance
- Bottleneck identification

### Error Tracking

- Failed requests with stack traces
- Error propagation across services
- Root cause analysis

## Environment Variables

### Jaeger Configuration

```env
JAEGER_ENDPOINT=http://jaeger:14268/api/traces
JAEGER_AGENT_HOST=jaeger
JAEGER_AGENT_PORT=6832
OTEL_EXPORTER_JAEGER_ENDPOINT=http://jaeger:14268/api/traces
```
### OpenTelemetry Configuration

```env
OTEL_SERVICE_NAME=auction-microservices
OTEL_RESOURCE_ATTRIBUTES=service.namespace=auction,service.version=1.0.0
```
## Service-Specific Configuration

### API Gateway

- Traces all incoming requests
- Propagates correlation IDs
- Monitors proxy performance

### Listings Service

- Database operations traced
- S3 upload/download operations
- Event publishing tracked

### Bid Service

- Real-time bidding operations
- Auction logic performance
- Event processing latency

### Payments Service

- Stripe API interactions
- Payment processing flows
- Transaction tracing

## Custom Instrumentation

### Adding Custom Spans

```typescript
import { listingsTracing } from './utils/simple-tracing';

await listingsTracing.traceAsyncOperation(
  'business-logic-operation',
  async () => {
    // Your business logic here
  },
  SpanKind.INTERNAL,
  { 
    'custom.attribute': 'value',
    'operation.type': 'business'
  }
);
```
### Adding Events to Spans

```typescript
listingsTracing.addEventToCurrentSpan('validation-completed', {
  'validation.result': 'success',
  'items.validated': 5
});
```
## Monitoring Best Practices

### 1. Performance Thresholds

- API response times < 200ms
- Database queries < 50ms
- Event processing < 100ms

### 2. Error Rate Monitoring

- Track error rates per service
- Monitor failed database connections
- Alert on event processing failures

### 3. Business Metrics

- Auction completion rates
- Bid success rates
- Payment processing success

## Troubleshooting

### No Traces Appearing

1. Check Jaeger is running: `docker ps | grep jaeger`
2. Verify environment variables are set
3. Check service logs for tracing errors

### High Latency

1. Use service map to identify bottlenecks
2. Check database query performance
3. Monitor external API calls (S3, Stripe)

### Missing Dependencies

1. Ensure all services have tracing environment variables
2. Check network connectivity between services
3. Verify correlation ID propagation

## Scaling Considerations

### Production Setup

- Use Jaeger Collector + Storage backend (Elasticsearch/Cassandra)
- Configure sampling rates for high-traffic scenarios
- Set up monitoring alerts

### Performance Impact

- Tracing overhead: < 1% CPU, < 50MB RAM per service
- Network overhead: ~1KB per trace
- Storage: Plan for trace retention policies

This implementation provides comprehensive observability for your auction platform, enabling better debugging, performance optimization, and system understanding.
