#!/bin/bash

# Quick deployment script for EC2 Kubernetes setup
# Run this script from the k8s directory

set -e

echo "🚀 Starting Kubernetes deployment for EC2 (34.229.99.72)..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

# Check if we can connect to the cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

echo "✅ kubectl is working and connected to cluster"

# Deploy in order
echo "📦 Creating namespaces..."
kubectl apply -f namespace.yaml

echo "🔐 Creating secrets..."
kubectl apply -f secrets/auction-secrets.yaml

echo "💾 Creating storage class and PVCs..."
kubectl apply -f infrastucture/storageclass.yaml
kubectl apply -f infrastucture/mysql-pvcs.yaml

echo "⚙️  Creating ConfigMaps..."
kubectl apply -f configmaps/

echo "🗄️  Deploying infrastructure (databases, Redis, NATS)..."
kubectl apply -f infrastucture/

echo "🌐 Creating services..."
kubectl apply -f services/

echo "🚀 Deploying applications..."
kubectl apply -f deployments/

echo "🌍 Setting up ingress..."
kubectl apply -f ingress/

echo "⏳ Waiting for pods to be ready (this may take a few minutes)..."
sleep 30

echo "📊 Checking deployment status..."
echo ""
echo "=== AUCTION SYSTEM PODS ==="
kubectl get pods -n auction-system

echo ""
echo "=== INFRASTRUCTURE PODS ==="
kubectl get pods -n auction-infrastructure

echo ""
echo "=== SERVICES ==="
kubectl get svc -n auction-system
kubectl get svc -n auction-infrastructure

echo ""
echo "=== PERSISTENT VOLUMES ==="
kubectl get pv
kubectl get pvc -n auction-infrastructure

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📱 Your application should be accessible at:"
echo "   Frontend: http://34.229.99.72:3000"
echo "   API Gateway: http://34.229.99.72:3001"
echo ""
echo "🔍 To check logs, use:"
echo "   kubectl logs -n auction-system <pod-name>"
echo "   kubectl logs -n auction-infrastructure <pod-name>"
echo ""
echo "⚠️  If pods are not ready, wait a few more minutes and check again:"
echo "   kubectl get pods -n auction-system"
echo "   kubectl get pods -n auction-infrastructure"
