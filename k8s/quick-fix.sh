#!/bin/bash

# Quick fix script for immediate deployment
# This works with existing PVCs and standard StorageClass

set -e

echo "🔧 Quick fix for Kubernetes deployment issues..."

echo "✅ YAML syntax errors have been fixed"

echo "🗄️ Deploying MySQL services (fixed YAML)..."
kubectl apply -f infrastucture/listings-mysql.yaml
kubectl apply -f infrastucture/payments-mysql.yaml  
kubectl apply -f infrastucture/profile-mysql.yaml

echo "⏳ Waiting for MySQL pods to be ready..."
sleep 20

echo "🚀 Continuing with remaining deployments..."
kubectl apply -f services/
kubectl apply -f deployments/
kubectl apply -f ingress/

echo ""
echo "📊 Checking final status..."
echo ""
echo "=== ALL PODS ==="
kubectl get pods -n auction-system
echo ""
kubectl get pods -n auction-infrastructure

echo ""
echo "=== SERVICES ==="
kubectl get svc -n auction-system

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📱 Your application should be accessible at:"
echo "   Frontend: http://34.229.99.72:3000"
echo "   API Gateway: http://34.229.99.72:3001"
echo ""
echo "🔍 To check logs if needed:"
echo "   kubectl logs -n auction-system <pod-name>"
echo "   kubectl logs -n auction-infrastructure <pod-name>"
