// Bulkhead Pattern Implementation for API Gateway
export enum BulkheadState {
  OPEN = 'OPEN',     // Has capacity for more requests
  CLOSED = 'CLOSED'  // At or over capacity, reject requests
}

export interface BulkheadConfig {
  maxConcurrentRequests: number;  // Maximum concurrent requests allowed
  maxWaitTime: number;           // Max time in queue (ms)
  queueSize: number;             // Size of the wait queue
}

export interface BulkheadMetrics {
  serviceName: string;
  state: BulkheadState;
  concurrentExecutions: number;
  maxConcurrentExecutions: number;
  queueSize: number;
  queueCapacity: number;
  rejectionCount: number;
  lastRejectionTime: number;
}

export class Bulkhead {
  private services: Map<string, BulkheadMetrics> = new Map();
  private defaultConfig: BulkheadConfig;
  private serviceConfigs: Map<string, BulkheadConfig> = new Map();

  constructor(defaultConfig: Partial<BulkheadConfig> = {}) {
    this.defaultConfig = {
      maxConcurrentRequests: defaultConfig.maxConcurrentRequests || 50,
      maxWaitTime: defaultConfig.maxWaitTime || 1000, // 1 second
      queueSize: defaultConfig.queueSize || 10
    };

    // Configure service-specific bulkhead limits
    this.configureService('auth', { maxConcurrentRequests: 60, queueSize: 15 });
    this.configureService('bid', { maxConcurrentRequests: 100, queueSize: 25 });
    this.configureService('listings', { maxConcurrentRequests: 80, queueSize: 20 });
    this.configureService('payments', { maxConcurrentRequests: 40, queueSize: 10 });
    this.configureService('profile', { maxConcurrentRequests: 50, queueSize: 15 });
    this.configureService('email', { maxConcurrentRequests: 30, queueSize: 50 });
  }

  public configureService(serviceName: string, config: Partial<BulkheadConfig>): void {
    const serviceConfig: BulkheadConfig = {
      maxConcurrentRequests: config.maxConcurrentRequests || this.defaultConfig.maxConcurrentRequests,
      maxWaitTime: config.maxWaitTime || this.defaultConfig.maxWaitTime,
      queueSize: config.queueSize || this.defaultConfig.queueSize
    };
    
    this.serviceConfigs.set(serviceName, serviceConfig);
    
    // Initialize metrics if needed
    if (!this.services.has(serviceName)) {
      this.initializeService(serviceName);
    }
  }

  // Initialize service metrics if not exists
  private initializeService(serviceName: string): BulkheadMetrics {
    if (!this.services.has(serviceName)) {
      const config = this.serviceConfigs.get(serviceName) || this.defaultConfig;
      
      const metrics: BulkheadMetrics = {
        serviceName,
        state: BulkheadState.OPEN,
        concurrentExecutions: 0,
        maxConcurrentExecutions: config.maxConcurrentRequests,
        queueSize: 0,
        queueCapacity: config.queueSize,
        rejectionCount: 0,
        lastRejectionTime: 0
      };
      
      this.services.set(serviceName, metrics);
      return metrics;
    }
    
    return this.services.get(serviceName)!;
  }

  // Check if request should be allowed through
  public canExecute(serviceName: string): { allowed: boolean; reason?: string } {
    const service = this.initializeService(serviceName);
    
    // If under capacity, allow immediately
    if (service.concurrentExecutions < service.maxConcurrentExecutions) {
      return { allowed: true };
    }
    
    // If at execution capacity but queue has space, consider queueing
    if (service.queueSize < service.queueCapacity) {
      return { allowed: true, reason: 'queued' };
    }
    
    // No capacity in execution pool or queue
    service.rejectionCount++;
    service.lastRejectionTime = Date.now();
    service.state = BulkheadState.CLOSED;
    
    return { 
      allowed: false, 
      reason: `Service ${serviceName} is at capacity. Bulkhead is CLOSED.` 
    };
  }

  // Record the start of request execution
  public recordExecutionStart(serviceName: string): void {
    const service = this.initializeService(serviceName);
    
    // If in queue, remove from queue
    if (service.queueSize > 0) {
      service.queueSize--;
    }
    
    // Increment execution count
    service.concurrentExecutions++;
    
    // Update state if we're at capacity
    if (service.concurrentExecutions >= service.maxConcurrentExecutions) {
      service.state = BulkheadState.CLOSED;
    }
  }

  // Record the end of request execution
  public recordExecutionComplete(serviceName: string): void {
    const service = this.initializeService(serviceName);
    
    // Decrement execution count if positive
    if (service.concurrentExecutions > 0) {
      service.concurrentExecutions--;
    }
    
    // Update state if we now have capacity
    if (service.concurrentExecutions < service.maxConcurrentExecutions) {
      service.state = BulkheadState.OPEN;
    }
  }

  // Get service metrics
  public getServiceMetrics(serviceName: string): BulkheadMetrics {
    return this.initializeService(serviceName);
  }

  // Get all services metrics
  public getAllServicesMetrics(): Record<string, BulkheadMetrics> {
    const metrics: Record<string, BulkheadMetrics> = {};
    this.services.forEach((service, name) => {
      metrics[name] = { ...service };
    });
    return metrics;
  }

  // Reset bulkhead for a service
  public resetService(serviceName: string): void {
    const service = this.initializeService(serviceName);
    service.state = BulkheadState.OPEN;
    service.concurrentExecutions = 0;
    service.queueSize = 0;
    service.rejectionCount = 0;
    console.log(`Bulkhead for ${serviceName} has been reset to OPEN`);
  }

  // Create fallback response for when bulkhead is closed
  public createFallbackResponse(serviceName: string, req: any): any {
    const metrics = this.getServiceMetrics(serviceName);
    
    return {
      error: 'Service At Capacity',
      message: `The ${serviceName} service is currently at capacity. Please try again later.`,
      serviceName,
      bulkheadState: metrics.state,
      concurrentExecutions: metrics.concurrentExecutions,
      maxConcurrentExecutions: metrics.maxConcurrentExecutions,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || req.headers['x-correlation-id'] || 'unknown'
    };
  }
}
