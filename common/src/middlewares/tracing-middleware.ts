import { Request, Response, NextFunction } from 'express';
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';

export interface TracedRequest extends Request {
  traceId?: string;
  spanId?: string;
}

export const tracingMiddleware = (serviceName: string) => {
  return (req: TracedRequest, res: Response, next: NextFunction) => {
    try {
      const tracer = trace.getTracer(serviceName);
      
      const span = tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.route': req.route?.path || req.path,
          'http.user_agent': req.get('User-Agent') || '',
          'service.name': serviceName,
        },
      });

      // Add trace information to request for logging
      const spanContext = span.spanContext();
      req.traceId = spanContext.traceId;
      req.spanId = spanContext.spanId;

      // Add correlation ID header if present
      const correlationId = req.get('x-correlation-id');
      if (correlationId) {
        span.setAttribute('correlation.id', correlationId);
      }

      // Set response headers for tracing
      res.setHeader('x-trace-id', req.traceId);
      res.setHeader('x-span-id', req.spanId);

      // Track response completion
      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
        });

        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();
      });

      // Handle errors
      const originalNext = next;
      next = (error?: any) => {
        if (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message || 'Unknown error',
          });
          span.recordException(error);
          span.end();
        }
        originalNext(error);
      };

      // Execute in span context
      context.with(trace.setSpan(context.active(), span), () => {
        next();
      });
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
      correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    
    next();
  } catch (error) {
    console.warn('Correlation ID middleware error:', error);
    next();
  }
};
