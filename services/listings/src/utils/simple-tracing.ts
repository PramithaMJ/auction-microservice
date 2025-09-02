// Simple tracing utility for Listings Service
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';

export class ListingsTracing {
  private serviceName = 'listings-service';

  createSpan(name: string, kind: SpanKind = SpanKind.INTERNAL) {
    const tracer = trace.getTracer(this.serviceName);
    return tracer.startSpan(name, { kind });
  }

  async traceAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const span = this.createSpan(operationName, kind);
    
    if (attributes) {
      span.setAttributes(attributes);
    }

    try {
      const result = await context.with(trace.setSpan(context.active(), span), operation);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  addEventToCurrentSpan(eventName: string, attributes?: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(eventName, attributes);
    }
  }

  setAttributeOnCurrentSpan(key: string, value: string | number | boolean): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }
}

export const listingsTracing = new ListingsTracing();
