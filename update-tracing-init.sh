#!/bin/bash

# Update all tracing-init.ts files to use common package

services=("auth" "bid" "email" "expiration" "payments" "profile" "saga-orchestrator" "api-gateway")

for service in "${services[@]}"; do
  tracing_file="services/$service/src/tracing-init.ts"
  
  if [ -f "$tracing_file" ]; then
    echo "Updating $tracing_file..."
    
    # Determine the service name
    if [ "$service" = "api-gateway" ]; then
      service_name="api-gateway-service"
    else
      service_name="$service-service"
    fi
    
    cat > "$tracing_file" << EOF
// OpenTelemetry Jaeger tracing initialization
import { JaegerTracingService } from '@jjmauction/common/build/tracing';

const serviceName = process.env.OTEL_SERVICE_NAME || '$service_name';

// Initialize tracing service
const tracingService = new JaegerTracingService(serviceName);

try {
  tracingService.initialize();
  console.log(\` OpenTelemetry tracing initialized for \${serviceName}\`);
} catch (error) {
  console.error('Failed to initialize OpenTelemetry:', error);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  tracingService.shutdown();
});

export { tracingService as sdk };
EOF
    
    echo "Updated $tracing_file"
  else
    echo "File $tracing_file does not exist, skipping..."
  fi
done

echo "All tracing-init.ts files updated!"
