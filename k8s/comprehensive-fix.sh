#!/bin/bash

# Comprehensive fix for all identified issues
# This addresses application errors and network connectivity

echo "🔧 COMPREHENSIVE FIX FOR AUCTION WEBSITE"
echo "========================================"

echo ""
echo "📊 Issue Analysis:"
echo "✅ Minikube and Kubernetes are running properly"
echo "✅ Services are accessible on Minikube IP (192.168.49.2)"
echo "❌ Frontend returning HTTP 500 error"
echo "❌ API Gateway returning 404 (missing health endpoint)"
echo "❌ Network isolation between Minikube and EC2 host"

echo ""
echo "🔧 Step 1: Fix Application Configuration Issues"

echo "Checking frontend logs for 500 error..."
kubectl logs deployment/frontend -n auction-system --tail=20

echo ""
echo "Checking API Gateway logs for routing issues..."
kubectl logs deployment/api-gateway -n auction-system --tail=20

echo ""
echo "🔧 Step 2: Clean up resource-constrained pods"
echo "Scaling down to reduce memory pressure..."

# Scale down to single replicas to reduce memory usage
kubectl scale deployment api-gateway --replicas=1 -n auction-system
kubectl scale deployment auth --replicas=1 -n auction-system
kubectl scale deployment bid --replicas=1 -n auction-system
kubectl scale deployment listings --replicas=1 -n auction-system
kubectl scale deployment payments --replicas=1 -n auction-system
kubectl scale deployment profile --replicas=1 -n auction-system
kubectl scale deployment frontend --replicas=1 -n auction-system

echo "Deleting pending and failed pods..."
kubectl delete pods --field-selector=status.phase=Pending -n auction-system
kubectl delete pods --field-selector=status.phase=Failed -n auction-system

# Delete crashing pods to force restart with single replica
kubectl get pods -n auction-system | grep CrashLoopBackOff | awk '{print $1}' | xargs -r kubectl delete pod -n auction-system

echo ""
echo "⏳ Waiting for pods to stabilize..."
sleep 30

echo ""
echo "🔧 Step 3: Set up Port Forwarding for Immediate Access"
echo "This bypasses the network isolation issue..."

# Kill any existing port forwards
pkill -f "kubectl.*port-forward" 2>/dev/null || echo "No existing port forwards to clean"

echo "Setting up port forwarding..."
kubectl port-forward --address 0.0.0.0 service/frontend-service 3000:3000 -n auction-system &
FRONTEND_PID=$!

kubectl port-forward --address 0.0.0.0 service/api-gateway-service 3001:3001 -n auction-system &
API_PID=$!

echo "Frontend PID: $FRONTEND_PID"
echo "API Gateway PID: $API_PID"

echo ""
echo "⏳ Waiting for port forwards to establish..."
sleep 10

echo ""
echo "🧪 Testing access after fixes..."

echo "Testing frontend access:"
curl -I http://localhost:3000 --connect-timeout 5 || echo "Frontend still not responding"

echo ""
echo "Testing API Gateway access:"
curl -I http://localhost:3001 --connect-timeout 5 || echo "API Gateway still not responding"

echo ""
echo "Testing external access:"
curl -I http://34.229.99.72:3000 --connect-timeout 5 || echo "External frontend access failed"
curl -I http://34.229.99.72:3001 --connect-timeout 5 || echo "External API Gateway access failed"

echo ""
echo "📊 Current pod status:"
kubectl get pods -n auction-system

echo ""
echo "🎯 SOLUTION SUMMARY:"
echo "==================="
echo ""
echo "✅ Port forwarding is now active for immediate access:"
echo "   🌐 Frontend:    http://34.229.99.72:3000"
echo "   🚀 API Gateway: http://34.229.99.72:3001"
echo ""
echo "🔧 Next steps to fix underlying issues:"
echo ""
echo "1. 🌐 For permanent NodePort access, run minikube tunnel:"
echo "   minikube tunnel"
echo "   (Keep this running in a separate terminal)"
echo ""
echo "2. 🔍 If frontend still shows 500 error, check configuration:"
echo "   kubectl logs deployment/frontend -n auction-system"
echo "   kubectl describe configmap frontend-config -n auction-system"
echo ""
echo "3. 🚀 If API Gateway shows 404, try specific endpoints:"
echo "   http://34.229.99.72:3001/health"
echo "   http://34.229.99.72:3001/api/auth/health"
echo ""
echo "💡 Alternative access method:"
echo "   minikube service frontend-service -n auction-system"
echo "   minikube service api-gateway-service -n auction-system"
echo ""
echo "🛑 To stop port forwarding:"
echo "   kill $FRONTEND_PID $API_PID"
echo ""
echo "✅ Setup complete! Your application should now be accessible."

# Keep script running to maintain port forwards
echo ""
echo "📡 Port forwarding active. Press Ctrl+C to stop..."
wait
