#!/bin/bash

# Cleanup and redeploy script for Kubernetes resources
# This script handles immutable resource issues

set -e

echo "🧹 Starting cleanup and redeploy process..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Please install kubectl first."
    exit 1
fi

echo "⚠️  WARNING: This will delete existing PVCs and data!"
echo "📊 Current PVCs:"
kubectl get pvc -n auction-infrastructure

read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

echo "🛑 Stopping deployments that use PVCs..."
kubectl delete deployment auth-mysql bid-mysql listings-mysql payments-mysql profile-mysql -n auction-infrastructure --ignore-not-found=true

echo "⏳ Waiting for pods to terminate..."
sleep 10

echo "🗑️ Deleting existing StorageClass..."
kubectl delete storageclass fast-ssd --ignore-not-found=true

echo "🗑️ Deleting existing PVCs..."
kubectl delete pvc auth-mysql-pvc bid-mysql-pvc listings-mysql-pvc payments-mysql-pvc profile-mysql-pvc -n auction-infrastructure --ignore-not-found=true

echo "⏳ Waiting for PVCs to be fully deleted..."
sleep 15

echo "🆕 Creating new StorageClass with standard provisioner..."
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: kubernetes.io/hostpath
volumeBindingMode: Immediate
allowVolumeExpansion: true
reclaimPolicy: Delete
EOF

echo "💾 Creating new PVCs..."
kubectl apply -f infrastucture/mysql-pvcs.yaml

echo "🗄️ Redeploying MySQL databases..."
kubectl apply -f infrastucture/auth-mysql.yaml
kubectl apply -f infrastucture/bid-mysql.yaml
kubectl apply -f infrastucture/listings-mysql.yaml
kubectl apply -f infrastucture/payments-mysql.yaml
kubectl apply -f infrastucture/profile-mysql.yaml

echo "⏳ Waiting for MySQL pods to be ready..."
sleep 30

echo "📊 Checking deployment status..."
echo ""
echo "=== INFRASTRUCTURE PODS ==="
kubectl get pods -n auction-infrastructure

echo ""
echo "=== PVCs ==="
kubectl get pvc -n auction-infrastructure

echo ""
echo "=== STORAGE CLASSES ==="
kubectl get storageclass

echo ""
echo "🚀 Now deploying remaining services..."
kubectl apply -f services/
kubectl apply -f deployments/
kubectl apply -f ingress/

echo ""
echo "🎉 Cleanup and redeploy completed!"
echo ""
echo "📱 Your application should be accessible at:"
echo "   Frontend: http://34.229.99.72:3000"
echo "   API Gateway: http://34.229.99.72:3001"
