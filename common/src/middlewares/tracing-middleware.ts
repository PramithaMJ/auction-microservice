import { Request, Response, NextFunction } from 'express';

export interface TracedRequest extends Request {
  traceId?: string;
  spanId?: string;
}

export const tracingMiddleware = (serviceName: string) => {
  return (req: TracedRequest, res: Response, next: NextFunction) => {
    try {
      const startTime = Date.now();
      const traceId = generateTraceId();
      const spanId = generateSpanId();
      
      // Add trace information to request for logging
      req.traceId = traceId;
      req.spanId = spanId;

      // Add correlation ID header if present
      const correlationId = req.get('x-correlation-id') || traceId;
      
      // Set response headers for tracing
      res.setHeader('x-trace-id', traceId);
      res.setHeader('x-span-id', spanId);
      res.setHeader('x-correlation-id', correlationId);

      console.log(`[${serviceName}] Starting request: ${req.method} ${req.path}`, {
        traceId,
        spanId,
        correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent') || '',
        timestamp: new Date().toISOString(),
      });

      // Track response completion
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logLevel = res.statusCode >= 400 ? 'error' : 'log';
        
        console[logLevel](`[${serviceName}] Completed request: ${req.method} ${req.path}`, {
          traceId,
          spanId,
          correlationId,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle errors
      const originalNext = next;
      next = (error?: any) => {
        if (error) {
          const duration = Date.now() - startTime;
          console.error(`[${serviceName}] Request error: ${req.method} ${req.path}`, {
            traceId,
            spanId,
            correlationId,
            error: error.message || 'Unknown error',
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          });
        }
        originalNext(error);
      };

      next();
    } catch (error) {
      console.warn('Tracing middleware error:', error);
      next();
    }
  };
};

export const addCorrelationId = (req: Request, res: Response, next: NextFunction) => {
  try {
    let correlationId = req.get('x-correlation-id');
    
    if (!correlationId) {
      correlationId = generateTraceId();
    }
    
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    
    next();
  } catch (error) {
    console.warn('Correlation ID middleware error:', error);
    next();
  }
};

// Helper functions
function generateTraceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function generateSpanId(): string {
  return Math.random().toString(36).substring(2, 15);
}
