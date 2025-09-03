// OpenTelemetry Jaeger tracing initialization
import { JaegerTracingService } from '@jjmauction/common/build/tracing'

const serviceName = process.env.OTEL_SERVICE_NAME || 'profile-service';

// Initialize tracing service
const tracingService = new JaegerTracingService(serviceName);

try {
  tracingService.initialize();
  console.log(` OpenTelemetry tracing initialized for ${serviceName}`);
} catch (error) {
  console.error('Failed to initialize OpenTelemetry:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  tracingService.shutdown();
});

export { tracingService as sdk };
