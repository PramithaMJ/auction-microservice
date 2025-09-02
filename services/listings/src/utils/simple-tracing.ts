// Simple logging-based tracing utility for Listings Service
export class ListingsTracing {
  private serviceName = 'listings-service';

  createSpan(name: string, kind: string = 'INTERNAL') {
    const traceId = this.generateTraceId();
    console.log(`[${this.serviceName}] Created span: ${name}`, {
      traceId,
      kind,
      timestamp: new Date().toISOString(),
    });
    return { traceId, name, kind };
  }

  async traceAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    kind: string = 'INTERNAL',
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    console.log(`[${this.serviceName}] Starting operation: ${operationName}`, {
      traceId,
      kind,
      timestamp: new Date().toISOString(),
      ...attributes,
    });

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      console.log(`[${this.serviceName}] Completed operation: ${operationName}`, {
        traceId,
        duration: `${duration}ms`,
        status: 'success',
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(`[${this.serviceName}] Failed operation: ${operationName}`, {
        traceId,
        duration: `${duration}ms`,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }

  addEventToCurrentSpan(eventName: string, attributes?: Record<string, string | number | boolean>): void {
    console.log(`[${this.serviceName}] Event: ${eventName}`, {
      timestamp: new Date().toISOString(),
      ...attributes,
    });
  }

  setAttributeOnCurrentSpan(key: string, value: string | number | boolean): void {
    console.log(`[${this.serviceName}] Attribute set: ${key} = ${value}`, {
      timestamp: new Date().toISOString(),
    });
  }

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const listingsTracing = new ListingsTracing();
