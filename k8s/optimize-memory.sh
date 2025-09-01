#!/bin/bash

# Memory optimization script for Minikube deployment
# Reduces resource usage and removes duplicates

set -e

echo "🚨 MEMORY OPTIMIZATION FOR MINIKUBE"
echo "====================================="

echo ""
echo "📊 Current memory situation:"
kubectl top nodes || echo "Metrics server not available"
kubectl describe nodes | grep -A 10 "Allocated resources:"

echo ""
echo "🧹 Step 1: Cleanup duplicate deployments and pods"

# Force delete all pending pods (they're stuck due to memory)
echo "🗑️ Removing pending pods..."
kubectl get pods -n auction-system | grep Pending | awk '{print $1}' | xargs -r kubectl delete pod -n auction-system --force --grace-period=0
kubectl get pods -n auction-infrastructure | grep Pending | awk '{print $1}' | xargs -r kubectl delete pod -n auction-infrastructure --force --grace-period=0

# Delete failed/crashing pods
echo "🗑️ Removing failed pods..."
kubectl get pods -n auction-system | grep -E "(CrashLoopBackOff|Error|CreateContainerConfigError)" | awk '{print $1}' | xargs -r kubectl delete pod -n auction-system --force --grace-period=0

echo ""
echo "🔄 Step 2: Scale down to minimal configuration"

# Scale all deployments to 1 replica (instead of 2)
echo "📉 Scaling down application services to 1 replica..."
kubectl scale deployment api-gateway auth bid listings payments profile saga-orchestrator email expiration frontend -n auction-system --replicas=1

# Scale down infrastructure to 1 replica 
echo "📉 Scaling down infrastructure services..."
kubectl scale deployment auth-mysql bid-mysql listings-mysql payments-mysql profile-mysql -n auction-infrastructure --replicas=1

echo ""
echo "⏳ Waiting for scaling to complete..."
sleep 15

echo ""
echo "📊 Step 3: Current status after cleanup"
echo "Application pods:"
kubectl get pods -n auction-system

echo ""
echo "Infrastructure pods:"
kubectl get pods -n auction-infrastructure

echo ""
echo "🔧 Step 4: Optimize resource requests/limits"
echo "Creating optimized deployment configurations..."

# Create a patch to reduce memory requirements
cat > /tmp/memory-patch.yaml << 'EOF'
spec:
  template:
    spec:
      containers:
      - name: auth
        resources:
          requests:
            memory: "128Mi"
            cpu: "50m"
          limits:
            memory: "256Mi"
            cpu: "200m"
EOF

# Apply memory optimization to all services
for service in auth bid listings payments profile; do
    echo "Optimizing $service..."
    kubectl patch deployment $service -n auction-system --patch-file /tmp/memory-patch.yaml || echo "Failed to patch $service"
done

# Patch the container name in the patch file for each service
for service in auth bid listings payments profile; do
    sed -i.bak "s/name: auth/name: $service/" /tmp/memory-patch.yaml
    kubectl patch deployment $service -n auction-system --patch-file /tmp/memory-patch.yaml || echo "Failed to patch $service"
    sed -i.bak "s/name: $service/name: auth/" /tmp/memory-patch.yaml
done

echo ""
echo "⏳ Waiting for optimized deployments..."
sleep 30

echo ""
echo "📊 Final status:"
kubectl get pods -n auction-system
kubectl get pods -n auction-infrastructure

echo ""
echo "🎯 Resource usage:"
kubectl top pods -n auction-system || echo "Metrics not available"

echo ""
echo "✅ Memory optimization complete!"
echo ""
echo "📱 Your application should now be accessible at:"
echo "   Frontend: http://34.229.99.72:3000"
echo "   API Gateway: http://34.229.99.72:3001"
echo ""
echo "💡 Tips for Minikube:"
echo "   - All services now run with 1 replica"
echo "   - Memory usage reduced to 128Mi request, 256Mi limit"
echo "   - Consider increasing Minikube memory: minikube config set memory 4096"
