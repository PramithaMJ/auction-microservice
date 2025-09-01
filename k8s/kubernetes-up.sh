#!/bin/bash
set -e

echo "🚀 Starting Kubernetes deployment..."

# 1. Namespace
echo "📦 Applying namespace..."
kubectl apply -f 00-namespace.yaml

# 2. Secrets
echo "🔑 Applying secrets..."
kubectl apply -f secrets/

# 3. ConfigMaps
echo "⚙️ Applying configmaps..."
kubectl apply -f configmaps/

# 4. Infrastructure (databases, redis, nats)
echo "🗄️  Applying infrastructure..."
kubectl apply -f infrastucture/

# 5. Deployments (microservices)
echo "🛠️  Applying deployments..."
kubectl apply -f deployments/

# 6. Ingress
echo "🌐 Applying ingress..."
kubectl apply -f ingress/

# Apply opensearch for logs
echo "Applying opensearch ..."
kubectl apply -f opensearch/

# 7. Overlays (choose one: development/staging/production)
# Default to development
OVERLAY=${1:-development}
echo "📂 Applying overlay: $OVERLAY"
kubectl apply -k overlays/$OVERLAY

echo "✅ All resources applied successfully!"

# 8. Show status
echo "🔍 Checking pod status..."
kubectl get pods -n auction -o wide
