// Circuit Breaker Implementation for API Gateway
export enum CircuitState {
  CLOSED = 'CLOSED',    // Normal operation
  OPEN = 'OPEN',        // Service is down, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back up
}

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  resetTimeout: number;          // Time before trying half-open (ms)
  timeout: number;              // Request timeout (ms)
  monitoringWindow: number;     // Time window for tracking failures (ms)
}

export interface ServiceHealth {
  serviceName: string;
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  nextAttemptTime: number;
}

export class CircuitBreaker {
  private services: Map<string, ServiceHealth> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      resetTimeout: config.resetTimeout || 30000, // 30 seconds
      timeout: config.timeout || 10000, // 10 seconds
      monitoringWindow: config.monitoringWindow || 60000 // 1 minute
    };
  }

  // Initialize service if not exists
  private initializeService(serviceName: string): ServiceHealth {
    if (!this.services.has(serviceName)) {
      const serviceHealth: ServiceHealth = {
        serviceName,
        state: CircuitState.CLOSED,
        failures: 0,
        lastFailureTime: 0,
        lastSuccessTime: Date.now(),
        nextAttemptTime: 0
      };
      this.services.set(serviceName, serviceHealth);
      return serviceHealth;
    }
    return this.services.get(serviceName)!;
  }

  // Check if request should be allowed through
  public canExecute(serviceName: string): { allowed: boolean; reason?: string } {
    const service = this.initializeService(serviceName);
    const now = Date.now();

    switch (service.state) {
      case CircuitState.CLOSED:
        return { allowed: true };

      case CircuitState.OPEN:
        if (now >= service.nextAttemptTime) {
          // Transition to half-open state
          service.state = CircuitState.HALF_OPEN;
          console.log(`Circuit breaker for ${serviceName} transitioning to HALF_OPEN`);
          return { allowed: true };
        }
        return { 
          allowed: false, 
          reason: `Service ${serviceName} is temporarily unavailable. Circuit breaker is OPEN.` 
        };

      case CircuitState.HALF_OPEN:
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  // Record successful request
  public recordSuccess(serviceName: string): void {
    const service = this.initializeService(serviceName);
    const now = Date.now();

    service.lastSuccessTime = now;

    if (service.state === CircuitState.HALF_OPEN) {
      // Service is back up, close the circuit
      service.state = CircuitState.CLOSED;
      service.failures = 0;
      console.log(`Circuit breaker for ${serviceName} transitioning to CLOSED (service recovered)`);
    } else if (service.state === CircuitState.CLOSED) {
      // Clean up old failures outside monitoring window
      if (now - service.lastFailureTime > this.config.monitoringWindow) {
        service.failures = 0;
      }
    }
  }

  // Record failed request
  public recordFailure(serviceName: string, error: any): void {
    const service = this.initializeService(serviceName);
    const now = Date.now();

    service.failures++;
    service.lastFailureTime = now;

    console.log(` Circuit breaker failure recorded for ${serviceName}: ${service.failures}/${this.config.failureThreshold}`);

    // Check if we should open the circuit
    if (service.failures >= this.config.failureThreshold) {
      service.state = CircuitState.OPEN;
      service.nextAttemptTime = now + this.config.resetTimeout;
      
      console.log(`Circuit breaker for ${serviceName} is now OPEN. Next attempt at ${new Date(service.nextAttemptTime).toISOString()}`);
    }
  }

  // Get service health status
  public getServiceHealth(serviceName: string): ServiceHealth {
    return this.initializeService(serviceName);
  }

  // Get all services health
  public getAllServicesHealth(): Record<string, ServiceHealth> {
    const health: Record<string, ServiceHealth> = {};
    this.services.forEach((service, name) => {
      health[name] = { ...service };
    });
    return health;
  }

  // Reset circuit breaker for a service
  public resetService(serviceName: string): void {
    const service = this.initializeService(serviceName);
    service.state = CircuitState.CLOSED;
    service.failures = 0;
    service.lastFailureTime = 0;
    service.nextAttemptTime = 0;
    console.log(`Circuit breaker for ${serviceName} has been reset to CLOSED`);
  }

  // Create fallback response
  public createFallbackResponse(serviceName: string, req: any): any {
    const commonResponse = {
      error: 'Service Temporarily Unavailable',
      message: `The ${serviceName} service is currently experiencing issues. Please try again later.`,
      serviceName,
      circuitBreakerState: this.getServiceHealth(serviceName).state,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    };

    // Service-specific fallback responses
    switch (serviceName) {
      case 'auth':
        return {
          ...commonResponse,
          suggestion: 'Authentication is temporarily unavailable. Cached sessions may still work.'
        };
      
      case 'listings':
        return {
          ...commonResponse,
          suggestion: 'Listing service is down. Please try viewing your saved listings.'
        };
      
      case 'bid':
        return {
          ...commonResponse,
          suggestion: 'Bidding is temporarily disabled. Your previous bids are safe.'
        };
      
      case 'payments':
        return {
          ...commonResponse,
          suggestion: 'Payment processing is unavailable. Please try again in a few minutes.'
        };
      
      case 'profile':
        return {
          ...commonResponse,
          suggestion: 'Profile service is down. Your data is safe and will be available soon.'
        };
      
      default:
        return commonResponse;
    }
  }
}
