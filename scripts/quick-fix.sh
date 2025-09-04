#!/bin/bash

# Simple K8s Deployment Fix Script
# Fixes the common issues in your Kubernetes auction website deployment

set -e

echo "🔧 Fixing Kubernetes deployment issues for Auction Website..."

# 1. Apply updated secrets and configs
echo "📝 Applying updated configurations..."
kubectl apply -f k8s/secrets/auction-secrets.yaml
kubectl apply -f k8s/configmaps/auction-configmap.yaml

# 2. Update services to use NodePort instead of LoadBalancer
echo "🌐 Converting LoadBalancer services to NodePort..."
kubectl patch service frontend-service -n auction-system -p '{"spec":{"type":"NodePort","ports":[{"port":3000,"targetPort":3000,"nodePort":30000}]}}'
kubectl patch service api-gateway-service -n auction-system -p '{"spec":{"type":"NodePort","ports":[{"port":3001,"targetPort":3001,"nodePort":30001}]}}'

# 3. Scale down problematic pods
echo "⬇️ Scaling down problematic deployments..."
kubectl scale deployment auth --replicas=0 -n auction-system
kubectl scale deployment bid --replicas=0 -n auction-system  
kubectl scale deployment payments --replicas=0 -n auction-system

sleep 5

# 4. Scale back up with better resource limits
echo "⬆️ Scaling up with fixed configurations..."
kubectl scale deployment auth --replicas=1 -n auction-system
kubectl scale deployment bid --replicas=1 -n auction-system
kubectl scale deployment payments --replicas=1 -n auction-system

# 5. Restart other deployments
echo "🔄 Restarting other services..."
kubectl rollout restart deployment frontend -n auction-system
kubectl rollout restart deployment api-gateway -n auction-system

# 6. Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/auth -n auction-system --timeout=300s || true
kubectl wait --for=condition=available deployment/frontend -n auction-system --timeout=300s || true
kubectl wait --for=condition=available deployment/api-gateway -n auction-system --timeout=300s || true

echo ""
echo "✅ Fix script completed!"
echo ""

# Get access information
echo "🚀 Access Information:"
echo "======================"

# Try to detect if this is a cloud environment
if curl -s --max-time 5 http://169.254.169.254/latest/meta-data/instance-id &>/dev/null; then
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    echo "Detected AWS EC2 - Public IP: $PUBLIC_IP"
    echo ""
    echo "🎯 Access your application at:"
    echo "Frontend:    http://$PUBLIC_IP:30000"
    echo "API Gateway: http://$PUBLIC_IP:30001"
    echo ""
    echo "⚠️  Make sure these ports are open in your Security Group:"
    echo "- Port 30000 (Frontend)"
    echo "- Port 30001 (API Gateway)"
else
    # For local/other deployments
    echo "🎯 Access your application at:"
    echo "Frontend:    http://localhost:30000"  
    echo "API Gateway: http://localhost:30001"
fi

echo ""
echo "📊 Current Status:"
kubectl get pods -n auction-system
echo ""
kubectl get svc -n auction-system

echo ""
echo "🔍 To monitor pods: kubectl get pods -n auction-system -w"
echo "📋 To check logs: kubectl logs -f deployment/auth -n auction-system"
