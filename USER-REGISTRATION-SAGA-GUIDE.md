# User Registration Saga Implementation Guide

## Overview

The User Registration Saga implements a distributed transaction pattern that coordinates user account creation across multiple microservices. This ensures data consistency and provides automatic compensation in case of failures.

## Architecture

### Saga Orchestration Pattern
- **Orchestrator**: Centralized saga coordinator service
- **Participants**: Auth, Profile, and Email services
- **State Management**: Redis for saga state persistence
- **Communication**: NATS messaging with circuit breaker protection

### Saga Flow
```
User Signup Request → Auth Service → Saga Orchestrator
                                           ↓
1. User Account Created ← Auth Service ←──┘
                  ↓
2. Profile Creation → Profile Service
                  ↓
3. Welcome Email → Email Service
                  ↓
4. Saga Completion
```

## Services and Ports

| Service | Port | Purpose |
|---------|------|---------|
| Auth Service | 3100 | User account management |
| Profile Service | 3103 | User profile management |
| Email Service | 3106 | Email notifications |
| Saga Orchestrator | 3107 | Saga coordination |

## Implementation Details

### 1. Saga Events (Common Package)

```typescript
// Saga Subjects
enum SagaSubjects {
  UserRegistrationSagaStarted = 'user-registration-saga:started',
  UserAccountCreated = 'user-registration-saga:user-account-created',
  ProfileCreated = 'user-registration-saga:profile-created',
  WelcomeEmailSent = 'user-registration-saga:welcome-email-sent',
  UserRegistrationSagaCompleted = 'user-registration-saga:completed',
  UserRegistrationSagaFailed = 'user-registration-saga:failed'
}

// Saga States
enum UserRegistrationSagaState {
  STARTED = 'STARTED',
  ACCOUNT_CREATED = 'ACCOUNT_CREATED',
  PROFILE_CREATED = 'PROFILE_CREATED',
  EMAIL_SENT = 'EMAIL_SENT',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  FAILED = 'FAILED'
}
```

### 2. Saga Orchestrator Service

**Key Components:**
- **SagaStateManager**: Redis-based state persistence
- **UserRegistrationSagaOrchestrator**: Main coordination logic
- **Event Listeners**: Handle saga step completions
- **REST API**: Manual saga management endpoints

**State Management:**
```typescript
interface SagaState {
  sagaId: string;
  userId?: string;
  userEmail: string;
  userName: string;
  userAvatar: string;
  state: UserRegistrationSagaState;
  completedSteps: string[];
  createdAt: string;
  updatedAt: string;
}
```

**Compensation Logic:**
- **Account Deletion**: Removes user account if profile creation fails
- **Profile Cleanup**: Removes profile if email sending fails
- **Automatic Rollback**: Triggered when any step fails

### 3. Service Modifications

#### Auth Service
- **Saga Integration**: Calls saga orchestrator before publishing events
- **Event Publishing**: Publishes UserAccountCreated with saga context
- **Rollback Handler**: Listens for account deletion commands

#### Profile Service
- **Saga Listener**: Responds to UserAccountCreated saga events
- **Profile Creation**: Creates user profile and publishes ProfileCreated
- **Compensation**: Handles profile deletion requests

#### Email Service
- **Welcome Email**: Sends personalized welcome emails
- **Saga Completion**: Publishes WelcomeEmailSent event
- **Email Content**: Customized with user name and platform info

## Configuration

### Environment Variables

Each service requires:
```bash
# NATS Configuration
NATS_CLIENT_ID=service-name-client
NATS_URL=http://localhost:4222
NATS_CLUSTER_ID=auction

# Service-specific
EMAIL=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Saga Orchestrator
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Circuit Breaker Settings
- **Failure Threshold**: 3 failures
- **Timeout**: 30 seconds
- **Retry Logic**: Exponential backoff

## Testing the Saga

### 1. Start All Services
```bash
# Start infrastructure
docker-compose up -d redis nats mysql

# Start microservices
cd services/auth && npm start &
cd services/profile && npm start &
cd services/email && npm start &
cd services/saga-orchestrator && npm start &
```

### 2. Run Demo Script
```bash
./demo-user-registration-saga.sh
```

### 3. Manual Testing
```bash
# Create user account (triggers saga)
curl -X POST http://localhost:3100/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "avatar": "https://example.com/avatar.jpg"
  }'

# Check saga status
curl http://localhost:3107/api/saga/status
```

## Monitoring and Debugging

### Health Endpoints
- Auth: `GET /api/auth/health`
- Profile: `GET /api/profile/health`
- Email: `GET /api/email/health`
- Saga: `GET /api/saga/health`

### NATS Health Endpoints
- Auth: `GET /api/auth/health/nats`
- Profile: `GET /api/profile/health/nats`
- Email: `GET /api/email/health/nats`
- Saga: `GET /api/saga/health/nats`

### Saga Management Endpoints
- Status: `GET /api/saga/status`
- Specific Saga: `GET /api/saga/status/:sagaId`
- Retry Failed: `POST /api/saga/retry/:sagaId`
- Cancel: `POST /api/saga/cancel/:sagaId`

### Log Monitoring
```bash
# Real-time logs
tail -f logs/auth.log
tail -f logs/profile.log
tail -f logs/email.log
tail -f logs/saga-orchestrator.log
```

## Failure Scenarios and Recovery

### 1. Profile Creation Failure
- **Detection**: Profile service fails to create profile
- **Compensation**: Saga orchestrator deletes user account
- **Recovery**: User can try registration again

### 2. Email Service Failure
- **Detection**: Email service unavailable or SMTP issues
- **Compensation**: Saga orchestrator removes profile and account
- **Recovery**: Manual retry or automatic retry after service recovery

### 3. Network Partition
- **Detection**: NATS circuit breaker opens
- **Behavior**: Services fail fast, prevent cascade failures
- **Recovery**: Automatic reconnection when network recovers

### 4. Saga Orchestrator Failure
- **State Persistence**: Saga state stored in Redis
- **Recovery**: On restart, saga orchestrator resumes from saved state
- **Timeout Handling**: Redis TTL ensures stale sagas are cleaned up

## Best Practices

### 1. Idempotency
- All saga operations are idempotent
- Duplicate events are safely ignored
- Retry-safe operations

### 2. Timeout Management
- Saga state expires after 1 hour
- Step-level timeouts prevent hanging sagas
- Automatic cleanup of expired sagas

### 3. Error Handling
- Comprehensive error logging
- Circuit breaker protection
- Graceful degradation

### 4. Monitoring
- Health check endpoints
- Real-time status monitoring
- Performance metrics

## Future Enhancements

### 1. Additional Sagas
- Bid Placement Saga
- Auction Completion Saga
- Payment Processing Saga

### 2. Advanced Features
- Saga visualization dashboard
- Metrics and alerting
- Distributed tracing
- Performance optimization

### 3. Scalability
- Multiple saga orchestrator instances
- Partitioned saga processing
- Event sourcing integration

## Troubleshooting

### Common Issues

1. **Services not starting**
   - Check port availability
   - Verify environment variables
   - Ensure dependencies are running

2. **Saga not progressing**
   - Check NATS connectivity
   - Verify event publishing/listening
   - Check Redis connection

3. **Compensation not working**
   - Verify compensation handlers
   - Check error propagation
   - Review saga state transitions

4. **Email not sending**
   - Verify SMTP configuration
   - Check email service logs
   - Validate email credentials

### Debug Commands
```bash
# Check service connectivity
curl http://localhost:3100/api/auth/health
curl http://localhost:3103/api/profile/health
curl http://localhost:3106/api/email/health
curl http://localhost:3107/api/saga/health

# Check NATS connectivity
curl http://localhost:3100/api/auth/health/nats

# Monitor Redis
redis-cli monitor

# Check NATS server
curl http://localhost:8222/varz
```

## Conclusion

The User Registration Saga provides a robust, fault-tolerant solution for distributed user registration across microservices. With comprehensive error handling, compensation logic, and monitoring capabilities, it ensures data consistency while maintaining system resilience.

The implementation follows saga pattern best practices and provides a solid foundation for additional saga implementations in the auction platform.
