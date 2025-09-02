#!/bin/bash

# Script to add Jaeger tracing to all microservices

echo "🔍 Adding Jaeger tracing to all services..."

# Services to update
services=("auth" "bid" "payments" "api-gateway" "email" "expiration" "profile" "saga-orchestrator")

for service in "${services[@]}"; do
    echo "📦 Updating $service service..."
    
    # Check if the service directory exists
    if [ -d "services/$service" ]; then
        # Copy the tracing-init.ts file
        cp services/listings/src/tracing-init.ts services/$service/src/tracing-init.ts
        
        echo "✅ Added tracing to $service"
    else
        echo "⚠️  Service directory not found: services/$service"
    fi
done

echo "🎉 Tracing setup complete! Services will now send traces to Jaeger."
echo "🔗 Access Jaeger UI at: http://localhost:16686 (or your server IP:16686)"
