#!/bin/bash

# Quick solution using port forwarding
# This bypasses NodePort issues and provides immediate access

echo "🚀 QUICK ACCESS SOLUTION - PORT FORWARDING"
echo "=========================================="

echo ""
echo "⚠️  This solution uses kubectl port-forward to provide immediate access"
echo "     while we troubleshoot the NodePort connectivity issues."

echo ""
echo "🔧 Setting up port forwarding..."

# Kill any existing port forwards
echo "Cleaning up existing port forwards..."
pkill -f "kubectl.*port-forward" || echo "No existing port forwards to clean"

echo ""
echo "🌐 Starting Frontend port forward (3000)..."
kubectl port-forward --address 0.0.0.0 service/frontend-service 3000:3000 -n auction-system &
FRONTEND_PID=$!

echo "🚀 Starting API Gateway port forward (3001)..."
kubectl port-forward --address 0.0.0.0 service/api-gateway-service 3001:3001 -n auction-system &
API_PID=$!

echo ""
echo "⏳ Waiting for port forwards to establish..."
sleep 5

echo ""
echo "🧪 Testing local access..."
curl -I http://localhost:3000 --connect-timeout 3 || echo "Frontend not accessible locally"
curl -I http://localhost:3001 --connect-timeout 3 || echo "API Gateway not accessible locally"

echo ""
echo "🎯 YOUR APPLICATION IS NOW ACCESSIBLE AT:"
echo "=========================================="
echo ""
echo "🌐 Frontend:    http://34.229.99.72:3000"
echo "🚀 API Gateway: http://34.229.99.72:3001"
echo ""
echo "📊 Port Forward PIDs:"
echo "Frontend PID:    $FRONTEND_PID"
echo "API Gateway PID: $API_PID"
echo ""
echo "🛑 To stop port forwarding later:"
echo "kill $FRONTEND_PID $API_PID"
echo ""
echo "🔄 Or kill all port forwards:"
echo "pkill -f 'kubectl.*port-forward'"
echo ""
echo "✅ Port forwarding is active - try accessing your URLs!"
echo ""
echo "💡 Note: Keep this terminal open to maintain the connection."
echo "    Use Ctrl+C to stop, or open a new terminal for other commands."

# Keep the script running to maintain port forwards
wait
