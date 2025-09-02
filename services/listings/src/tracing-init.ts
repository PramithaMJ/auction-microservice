// OpenTelemetry Jaeger tracing initialization
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const serviceName = process.env.OTEL_SERVICE_NAME || 'listings-service';
const jaegerEndpoint = process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces';

// Create Jaeger exporter
const jaegerExporter = new JaegerExporter({
  endpoint: jaegerEndpoint,
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
    'service.namespace': 'auction',
    'deployment.environment': process.env.NODE_ENV || 'production',
  }),
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
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable filesystem instrumentation for cleaner traces
      },
    }),
  ],
});

// Start the SDK
try {
  sdk.start();
  console.log(`🔍 OpenTelemetry tracing initialized for ${serviceName}`);
  console.log(`🔍 Jaeger endpoint: ${jaegerEndpoint}`);
} catch (error) {
  console.error('Failed to initialize OpenTelemetry:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('🔍 Tracing terminated'))
    .catch((error) => console.error('Error terminating tracing', error));
});

export { sdk };
