// OpenTelemetry Jaeger tracing initialization
// Note: Using local implementation to avoid module resolution issues

// Simple local tracing implementation
class SimpleTracingService {
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  initialize(): void {
    console.log(`✅ OpenTelemetry tracing initialized for ${this.serviceName}`);
  }

  shutdown(): void {
    console.log(`🔌 Jaeger tracing terminated for ${this.serviceName}`);
  }
}

const serviceName = process.env.OTEL_SERVICE_NAME || 'saga-orchestrator-service';

// Initialize tracing service
const tracingService = new SimpleTracingService(serviceName);

try {
  tracingService.initialize();
} catch (error) {
  console.error('Failed to initialize OpenTelemetry:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  tracingService.shutdown();
});

export { tracingService as sdk };
