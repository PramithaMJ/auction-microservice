#!/bin/bash

# Quick diagnosis script to check what's happening with the deployments

echo "🔍 Diagnosing deployment issues..."

echo ""
echo "📊 Current pod status:"
kubectl get pods -n auction-system

echo ""
echo "🏥 Current pod health (detailed):"
kubectl get pods -n auction-system -o wide

echo ""
echo "🔧 Checking infrastructure pods:"
kubectl get pods -n auction-infrastructure

echo ""
echo "📝 Recent events in auction-system:"
kubectl get events -n auction-system --sort-by='.lastTimestamp' | tail -10

echo ""
echo "🔍 Checking one problematic pod in detail:"
# Get the first problematic pod
PROBLEM_POD=$(kubectl get pods -n auction-system | grep -E "(CreateContainerConfigError|CrashLoopBackOff|Pending|Error)" | head -1 | awk '{print $1}')

if [ ! -z "$PROBLEM_POD" ]; then
    echo "Examining pod: $PROBLEM_POD"
    echo ""
    echo "Pod description:"
    kubectl describe pod $PROBLEM_POD -n auction-system | tail -20
    echo ""
    echo "Pod logs (if available):"
    kubectl logs $PROBLEM_POD -n auction-system --tail=10 || echo "No logs available (pod might not be running)"
else
    echo "No problematic pods found"
fi

echo ""
echo "🗄️ Checking if databases are ready:"
kubectl get pods -n auction-infrastructure | grep mysql

echo ""
echo "🔑 Checking if secrets exist:"
kubectl get secrets -n auction-system
kubectl describe secret auction-secrets -n auction-system | grep "Data"
