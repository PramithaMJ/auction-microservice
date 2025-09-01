#!/bin/bash

# Script to expose services to external traffic via NodePort
# This allows access from outside the EC2 instance

set -e

echo "🌐 Exposing Auction Website Services to External Traffic"
echo "======================================================"

echo ""
echo "📊 Current service status:"
kubectl get services -n auction-system

echo ""
echo "🔧 Exposing Frontend Service (Port 3000 → 30000)..."
kubectl patch service frontend-service -n auction-system -p '{
  "spec": {
    "type": "NodePort",
    "ports": [
      {
        "port": 3000,
        "targetPort": 3000,
        "nodePort": 30000,
        "protocol": "TCP"
      }
    ]
  }
}'

echo "🔧 Exposing API Gateway Service (Port 3001 → 30001)..."
kubectl patch service api-gateway-service -n auction-system -p '{
  "spec": {
    "type": "NodePort", 
    "ports": [
      {
        "port": 3001,
        "targetPort": 3001,
        "nodePort": 30001,
        "protocol": "TCP"
      }
    ]
  }
}'

echo ""
echo "⏳ Waiting for services to update..."
sleep 5

echo ""
echo "📊 Updated service status:"
kubectl get services -n auction-system -o wide

echo ""
echo "🎯 Testing service connectivity..."
echo "Testing if services are responding..."

# Get minikube IP
MINIKUBE_IP=$(minikube ip)
echo "Minikube IP: $MINIKUBE_IP"

# Test internal connectivity
echo "Testing frontend internally..."
kubectl exec -n auction-system deployment/frontend -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "Frontend test failed"

echo "Testing API Gateway internally..."
kubectl exec -n auction-system deployment/api-gateway -- curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health || echo "API Gateway test failed"

echo ""
echo "🔗 Service URLs:"
echo "================================"
echo "🌐 Frontend:     http://34.229.99.72:30000"
echo "🚀 API Gateway:  http://34.229.99.72:30001"
echo ""
echo "📝 Alternative URLs (if above don't work):"
echo "🌐 Frontend:     http://$MINIKUBE_IP:30000"
echo "🚀 API Gateway:  http://$MINIKUBE_IP:30001"

echo ""
echo "🔍 Troubleshooting Commands:"
echo "Check pods:      kubectl get pods -n auction-system"
echo "Check services:  kubectl get services -n auction-system"
echo "Check logs:      kubectl logs -f deployment/frontend -n auction-system"

echo ""
echo "⚠️  IMPORTANT: Ensure EC2 Security Group allows traffic on ports 30000 and 30001"
echo "   Go to AWS Console → EC2 → Security Groups → Edit Inbound Rules"
echo "   Add: Custom TCP, Port 30000, Source 0.0.0.0/0"
echo "   Add: Custom TCP, Port 30001, Source 0.0.0.0/0"
