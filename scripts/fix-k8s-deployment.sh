#!/bin/bash

# Fix Kubernetes Deployment Issues
# This script applies fixes to resolve common deployment problems

set -e

echo "🔧 Fixing Kubernetes deployment issues..."

# Apply updated secrets
echo "📝 Applying updated secrets..."
kubectl apply -f k8s/secrets/auction-secrets.yaml

# Apply updated services with NodePort
echo "🌐 Updating services to use NodePort..."
kubectl apply -f k8s/services/frontend-service.yaml
kubectl apply -f k8s/services/api-gateway-service.yaml

# Restart problematic deployments with increased resources
echo "🔄 Restarting deployments with fixes..."
kubectl apply -f k8s/deployments/auth.yaml
kubectl apply -f k8s/deployments/bid.yaml
kubectl apply -f k8s/deployments/payments.yaml

# Scale down problematic pods first
echo "⬇️  Scaling down problematic deployments..."
kubectl scale deployment auth --replicas=0 -n auction-system
kubectl scale deployment bid --replicas=0 -n auction-system
kubectl scale deployment payments --replicas=0 -n auction-system

# Wait a bit for pods to terminate
echo "⏳ Waiting for pods to terminate..."
sleep 10

# Scale back up with fixes
echo "⬆️  Scaling up deployments with fixes..."
kubectl scale deployment auth --replicas=1 -n auction-system
kubectl scale deployment bid --replicas=2 -n auction-system
kubectl scale deployment payments --replicas=2 -n auction-system

# Restart other services that might be stuck
echo "🔄 Restarting other services..."
kubectl rollout restart deployment frontend -n auction-system
kubectl rollout restart deployment expiration -n auction-system
kubectl rollout restart deployment saga-orchestrator -n auction-system

# Wait for rollouts to complete
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment auth -n auction-system --timeout=300s
kubectl rollout status deployment bid -n auction-system --timeout=300s
kubectl rollout status deployment payments -n auction-system --timeout=300s
kubectl rollout status deployment frontend -n auction-system --timeout=300s

# Check status
echo "📊 Checking deployment status..."
kubectl get pods -n auction-system
kubectl get pods -n auction-infrastructure

echo "🌐 Getting service endpoints..."
kubectl get services -n auction-system

# Get NodePort access information
echo ""
echo "🚀 External Access Information:"
echo "================================"

# Get the cluster IP (for local clusters like minikube/kind)
if command -v minikube &> /dev/null && minikube status &> /dev/null; then
    CLUSTER_IP=$(minikube ip)
    echo "Minikube detected. Use Minikube IP: $CLUSTER_IP"
elif kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}' | grep -q .; then
    CLUSTER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="ExternalIP")].address}')
    echo "External IP detected: $CLUSTER_IP"
else
    CLUSTER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
    echo "Using Internal IP: $CLUSTER_IP"
fi

FRONTEND_PORT=$(kubectl get svc frontend-service -n auction-system -o jsonpath='{.spec.ports[0].nodePort}')
API_GATEWAY_PORT=$(kubectl get svc api-gateway-service -n auction-system -o jsonpath='{.spec.ports[0].nodePort}')

echo ""
echo "🎯 Access your application at:"
echo "Frontend:    http://$CLUSTER_IP:$FRONTEND_PORT"
echo "API Gateway: http://$CLUSTER_IP:$API_GATEWAY_PORT"
echo ""

# For AWS EC2 instances
echo "💡 If running on AWS EC2, make sure to:"
echo "1. Open ports $FRONTEND_PORT and $API_GATEWAY_PORT in your Security Group"
echo "2. Use your EC2 public IP instead of $CLUSTER_IP"
echo ""

echo "✅ Deployment fixes applied successfully!"
echo "🔍 Monitor the pods with: kubectl get pods -n auction-system -w"
