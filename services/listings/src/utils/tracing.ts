// Simple logging-based tracing for listings service
export interface TracingOptions {
  kind?: string;
  attributes?: Record<string, string | number | boolean>;
}

class SimpleTracingService {
  private serviceName = 'listings-service';

  async traceAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: TracingOptions
  ): Promise<T> {
    const startTime = Date.now();
    const traceId = this.generateTraceId();
    
    console.log(`[${this.serviceName}] Starting operation: ${operationName}`, {
      traceId,
      timestamp: new Date().toISOString(),
      ...options?.attributes,
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

  private generateTraceId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

const tracingService = new SimpleTracingService();

export const traceDbOperation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  return tracingService.traceAsyncOperation(
    `db.${operationName}`,
    operation,
    {
      kind: 'CLIENT',
      attributes: {
        'db.operation': operationName,
        'component': 'database',
        ...attributes,
      },
    }
  );
};

export const traceEventOperation = async <T>(
  eventName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  return tracingService.traceAsyncOperation(
    `event.${eventName}`,
    operation,
    {
      kind: 'PRODUCER',
      attributes: {
        'messaging.operation': 'publish',
        'messaging.destination': eventName,
        'component': 'nats',
        ...attributes,
      },
    }
  );
};

export const traceS3Operation = async <T>(
  operationName: string,
  operation: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> => {
  return tracingService.traceAsyncOperation(
    `s3.${operationName}`,
    operation,
    {
      kind: 'CLIENT',
      attributes: {
        'aws.service': 's3',
        'aws.operation': operationName,
        'component': 'aws-s3',
        ...attributes,
      },
    }
  );
};

export { tracingService };
