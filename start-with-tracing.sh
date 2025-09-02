#!/bin/bash

echo "🚀 Starting Auction Microservices with Distributed Tracing"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Set tracing environment variables
export JAEGER_ENDPOINT="http://jaeger:14268/api/traces"
export OTEL_SERVICE_NAME="auction-microservices"
export OTEL_RESOURCE_ATTRIBUTES="service.namespace=auction,service.version=1.0.0"

echo "📦 Building services with tracing support..."

# Build common package with tracing
echo "Building common package..."
cd common && npm run build && cd ..

echo "🔧 Starting infrastructure services..."
docker-compose up -d nats-streaming redis jaeger

# Wait for infrastructure services
echo "⏳ Waiting for infrastructure services to be ready..."
sleep 10

echo "🗄️ Starting database services..."
docker-compose up -d auth-mysql bid-mysql listings-mysql payments-mysql profile-mysql

# Wait for databases
echo "⏳ Waiting for databases to be ready..."
sleep 20

echo "🚀 Starting application services..."
docker-compose up -d auth bid listings payments profile email saga-orchestrator expiration

# Wait for application services
echo "⏳ Waiting for application services to start..."
sleep 15

echo "🌐 Starting API Gateway and Frontend..."
docker-compose up -d api-gateway frontend

echo "✅ All services started!"
echo ""
echo "📊 Service URLs:"
echo "  🎯 Frontend: http://localhost:3000"
echo "  🔗 API Gateway: http://localhost:3001"
echo "  🔍 Jaeger UI: http://localhost:16686"
echo "  📊 Redis: localhost:6379"
echo "  📨 NATS: localhost:4222"
echo ""
echo "🔍 Distributed Tracing:"
echo "  Open Jaeger UI at http://localhost:16686 to view traces"
echo "  All HTTP requests and database operations are being traced"
echo "  Event-driven communications are tracked across services"
echo ""
echo "🏃‍♂️ To follow logs: docker-compose logs -f [service_name]"
echo "🛑 To stop all services: docker-compose down"
