#!/bin/bash

# Force cleanup of stuck deployments and try a clean restart

echo "🚨 Force cleanup of stuck deployments..."

echo "📊 Current status:"
kubectl get pods -n auction-system

echo ""
echo "🛑 Force deleting stuck pods..."
kubectl delete pods -n auction-system --field-selector=status.phase=Pending --force --grace-period=0
kubectl delete pods -n auction-system --field-selector=status.phase=Failed --force --grace-period=0

# Delete pods with CreateContainerConfigError
echo "🗑️ Cleaning up pods with configuration errors..."
kubectl get pods -n auction-system | grep CreateContainerConfigError | awk '{print $1}' | xargs -r kubectl delete pod -n auction-system --force --grace-period=0

echo ""
echo "⏳ Waiting for cleanup..."
sleep 10

echo ""
echo "🔄 Scaling down and up deployments to force restart..."
kubectl scale deployment auth bid listings payments profile saga-orchestrator -n auction-system --replicas=0
sleep 10
kubectl scale deployment auth bid listings payments profile -n auction-system --replicas=1
kubectl scale deployment saga-orchestrator -n auction-system --replicas=1

echo ""
echo "⏳ Waiting for new pods to start..."
sleep 30

echo ""
echo "📊 New pod status:"
kubectl get pods -n auction-system

echo ""
echo "🔍 Checking for any remaining issues:"
kubectl get pods -n auction-system | grep -E "(CreateContainerConfigError|CrashLoopBackOff|Pending|Error)" || echo "✅ No problematic pods found!"

echo ""
echo "🎯 If pods are still pending, checking node resources:"
kubectl describe nodes | grep -A 5 "Allocated resources"
