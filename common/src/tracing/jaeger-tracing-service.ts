// OpenTelemetry tracing service that exports to Jaeger
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export interface TracingOptions {
  kind?: SpanKind;
  attributes?: Record<string, string | number | boolean>;
}

export class TracingService {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  async traceAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    options?: TracingOptions
  ): Promise<T> {
    const tracer = trace.getTracer(this.serviceName);
    const span = tracer.startSpan(operationName, {
      kind: options?.kind || SpanKind.INTERNAL,
    });

    if (options?.attributes) {
      span.setAttributes(options.attributes);
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

  traceOperation<T>(
    operationName: string,
    operation: () => T,
    options?: TracingOptions
  ): T {
    const tracer = trace.getTracer(this.serviceName);
    const span = tracer.startSpan(operationName, {
      kind: options?.kind || SpanKind.INTERNAL,
    });

    if (options?.attributes) {
      span.setAttributes(options.attributes);
    }

    try {
      const result = operation();
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

  addEvent(eventName: string, attributes?: Record<string, string | number | boolean>): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(eventName, attributes);
    }
  }
}

// Jaeger-enabled tracing service
export class JaegerTracingService {
  private sdk: NodeSDK | null = null;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  initialize(): void {
    if (this.sdk) {
      console.log('Tracing already initialized');
      return;
    }

    try {
      // Create Jaeger exporter
      const jaegerExporter = new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
      });

      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'auction',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      });

      this.sdk = new NodeSDK({
        resource,
        traceExporter: jaegerExporter,
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
            },
            '@opentelemetry/instrumentation-redis': {
              enabled: true,
            },
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      this.sdk.start();
      console.log(` Jaeger tracing initialized for ${this.serviceName}`);
    } catch (error) {
      console.warn('Failed to initialize Jaeger tracing:', error);
      // Fall back to console logging
      console.log(` Fallback tracing for ${this.serviceName}`);
    }
  }

  shutdown(): void {
    if (this.sdk) {
      this.sdk.shutdown()
        .then(() => console.log(` Jaeger tracing terminated for ${this.serviceName}`))
        .catch((error) => console.error('Error terminating tracing', error));
    }
  }

  getTracingService(): TracingService {
    return new TracingService(this.serviceName);
  }
}

// Export a function to create Jaeger-enabled tracing
export const createJaegerTracing = (serviceName: string) => {
  return new JaegerTracingService(serviceName);
};
