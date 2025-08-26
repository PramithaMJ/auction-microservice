#!/bin/bash

# Circuit Breaker Demo Script
# This script demonstrates the circuit breaker functionality

echo "🎯 API Gateway Circuit Breaker Demo"
echo "=================================="
echo ""

# Start the API Gateway in background
echo "🚀 Starting API Gateway..."
cd /Users/pramithajayasooriya/Desktop/Final-auction/auction-website/services/api-gateway
npm start &
GATEWAY_PID=$!

# Wait for gateway to start
echo "⏳ Waiting for gateway to start..."
sleep 5

echo ""
echo "📊 Testing Circuit Breaker Functionality:"
echo ""

# Test 1: Check circuit breaker status
echo "1️⃣ Initial Circuit Breaker Status:"
curl -s http://localhost:3001/circuit-breaker/status | jq '.' || echo "Failed to connect"
echo ""

# Test 2: Check health endpoint
echo "2️⃣ Health Check with Circuit Breaker Info:"
curl -s http://localhost:3001/health | jq '.' || echo "Failed to connect"
echo ""

# Test 3: Try to access a down service (this will trigger circuit breaker)
echo "3️⃣ Testing requests to unavailable services..."
echo "Making 6 requests to trigger circuit breaker (threshold: 5):"

for i in {1..6}; do
    echo "   Request $i to auth service:"
    curl -s -o /dev/null -w "   Status: %{http_code}, Time: %{time_total}s\n" http://localhost:3001/api/auth/currentuser || echo "   Failed to connect"
    sleep 1
done

echo ""

# Test 4: Check circuit breaker status after failures
echo "4️⃣ Circuit Breaker Status After Failures:"
curl -s http://localhost:3001/circuit-breaker/status | jq '.services.auth' || echo "Failed to connect"
echo ""

# Test 5: Try another request (should be blocked by circuit breaker)
echo "5️⃣ Testing Blocked Request (Circuit Breaker Open):"
curl -s http://localhost:3001/api/auth/currentuser | jq '.' || echo "Failed to connect"
echo ""

# Test 6: Reset circuit breaker
echo "6️⃣ Resetting Auth Service Circuit Breaker:"
curl -s -X POST http://localhost:3001/circuit-breaker/reset/auth | jq '.' || echo "Failed to connect"
echo ""

# Test 7: Check status after reset
echo "7️⃣ Circuit Breaker Status After Reset:"
curl -s http://localhost:3001/circuit-breaker/status | jq '.services.auth' || echo "Failed to connect"
echo ""

echo "✅ Demo completed!"
echo ""
echo "🛑 Stopping API Gateway..."
kill $GATEWAY_PID 2>/dev/null

echo ""
echo "📝 Circuit Breaker Features Demonstrated:"
echo "   ✓ Automatic failure detection"
echo "   ✓ Circuit opening after threshold"
echo "   ✓ Fast-fail responses when circuit open"
echo "   ✓ Service-specific fallback messages"
echo "   ✓ Manual circuit breaker reset"
echo "   ✓ Health monitoring integration"
echo ""
