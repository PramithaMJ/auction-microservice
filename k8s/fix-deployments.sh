#!/bin/bash

# Fix deployment configuration issues
# This script updates the deployments to use correct secret references

set -e

echo "🔧 Fixing Kubernetes deployment configuration issues..."

echo "📊 Current problematic pods:"
kubectl get pods -n auction-system | grep -E "(CreateContainerConfigError|CrashLoopBackOff|Pending)"

echo ""
echo "🔄 Applying fixed deployment configurations..."

# Apply the corrected deployment files
echo "   - Updating auth deployment..."
kubectl apply -f deployments/auth.yaml

echo "   - Updating bid deployment..."
kubectl apply -f deployments/bid.yaml

echo "   - Updating listings deployment..."
kubectl apply -f deployments/listings.yaml

echo "   - Updating payments deployment..."
kubectl apply -f deployments/payments.yaml

echo "   - Updating profile deployment..."
kubectl apply -f deployments/profile.yaml

echo ""
echo "🔄 Rolling out deployment updates..."
kubectl rollout restart deployment/auth -n auction-system
kubectl rollout restart deployment/bid -n auction-system
kubectl rollout restart deployment/listings -n auction-system
kubectl rollout restart deployment/payments -n auction-system
kubectl rollout restart deployment/profile -n auction-system

echo ""
echo "⏳ Waiting for deployments to be ready..."
echo "   - Waiting for auth..."
kubectl rollout status deployment/auth -n auction-system --timeout=300s

echo "   - Waiting for bid..."
kubectl rollout status deployment/bid -n auction-system --timeout=300s

echo "   - Waiting for listings..."
kubectl rollout status deployment/listings -n auction-system --timeout=300s

echo "   - Waiting for payments..."
kubectl rollout status deployment/payments -n auction-system --timeout=300s

echo "   - Waiting for profile..."
kubectl rollout status deployment/profile -n auction-system --timeout=300s

echo ""
echo "📊 Final pod status:"
kubectl get pods -n auction-system

echo ""
echo "🎉 Configuration fixes applied!"
echo ""
echo "📱 Your application should now be accessible at:"
echo "   Frontend: http://34.229.99.72:3000"
echo "   API Gateway: http://34.229.99.72:3001"
echo ""
echo "🔍 If any pods are still failing, check logs with:"
echo "   kubectl logs -n auction-system <pod-name>"
