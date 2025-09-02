import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { IncomingMessage } from 'http';

class TracingService {
  private sdk: NodeSDK | null = null;
  private serviceName: string;
  private serviceVersion: string;

  constructor(serviceName: string, serviceVersion: string = '1.0.0') {
    this.serviceName = serviceName;
    this.serviceVersion = serviceVersion;
  }

  public initialize(): void {
    if (this.sdk) {
      console.log('Tracing already initialized');
      return;
    }

    const jaegerExporter = new JaegerExporter({
      endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.serviceVersion,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'auction',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    this.sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-mysql2': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              // Type guard to check if request has headers property
              if ('headers' in request && request.headers) {
                span.setAttributes({
                  'http.user_agent': request.headers['user-agent'] || '',
                  'http.request_content_length': request.headers['content-length'] || 0,
                });
              }
            },
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });

    this.sdk.start();
    console.log(`🔍 Distributed tracing initialized for ${this.serviceName}`);
  }

  public shutdown(): Promise<void> {
    if (this.sdk) {
      return this.sdk.shutdown();
    }
    return Promise.resolve();
  }

  public createSpan(name: string, options?: { kind?: SpanKind; attributes?: Record<string, string | number | boolean> }) {
    const tracer = trace.getTracer(this.serviceName, this.serviceVersion);
    const span = tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes || {},
    });
    return span;
  }

  public async traceAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.createSpan(operationName, options);
    
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

  public traceSyncOperation<T>(
    operationName: string,
    operation: () => T,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): T {
    const span = this.createSpan(operationName, options);
    
    try {
      const result = context.with(trace.setSpan(context.active(), span), operation);
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

  public addEventToCurrentSpan(eventName: string, attributes?: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(eventName, attributes);
    }
  }

  public setAttributeOnCurrentSpan(key: string, value: string | number | boolean): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute(key, value);
    }
  }

  public getCurrentTraceId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().traceId;
  }

  public getCurrentSpanId(): string | undefined {
    const span = trace.getActiveSpan();
    return span?.spanContext().spanId;
  }
}

export { TracingService };

// Export a default instance for convenience
export const createTracing = (serviceName: string, serviceVersion?: string) => {
  return new TracingService(serviceName, serviceVersion);
};
