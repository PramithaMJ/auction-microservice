#!/bin/bash

# Kubernetes Troubleshooting Script for Auction Website
# This script helps diagnose and fix common Kubernetes issues

set -e

echo "🔍 Kubernetes Troubleshooting Tool for Auction Website"
echo "======================================================"

# Function to check pod status
check_pods() {
    echo ""
    echo "📋 Pod Status Check:"
    echo "-------------------"
    
    echo "🔵 Auction System Pods:"
    kubectl get pods -n auction-system -o wide
    
    echo ""
    echo "🔵 Infrastructure Pods:"
    kubectl get pods -n auction-infrastructure -o wide
    
    # Check for failed pods
    FAILED_PODS=$(kubectl get pods --all-namespaces | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff|Pending)" | wc -l)
    if [ $FAILED_PODS -gt 0 ]; then
        echo ""
        echo "⚠️  Failed Pods Detected:"
        kubectl get pods --all-namespaces | grep -E "(Error|CrashLoopBackOff|ImagePullBackOff|Pending)"
    else
        echo "✅ No failed pods detected"
    fi
}

# Function to check services
check_services() {
    echo ""
    echo "🌐 Service Status Check:"
    echo "----------------------"
    
    kubectl get svc -n auction-system
    echo ""
    kubectl get svc -n auction-infrastructure
}

# Function to check resource usage
check_resources() {
    echo ""
    echo "💾 Resource Usage Check:"
    echo "----------------------"
    
    echo "Node resource usage:"
    kubectl top nodes 2>/dev/null || echo "Metrics server not available"
    
    echo ""
    echo "Pod resource usage:"
    kubectl top pods -n auction-system 2>/dev/null || echo "Metrics server not available"
}

# Function to show logs for problematic pods
show_logs() {
    echo ""
    echo "📄 Recent Logs from Key Services:"
    echo "--------------------------------"
    
    # Check auth service
    echo "🔐 Auth Service Logs (last 20 lines):"
    kubectl logs --tail=20 -n auction-system deployment/auth || echo "Auth logs not available"
    
    echo ""
    echo "💰 Bid Service Logs (last 20 lines):"
    kubectl logs --tail=20 -n auction-system deployment/bid || echo "Bid logs not available"
    
    echo ""
    echo "💳 Payments Service Logs (last 20 lines):"
    kubectl logs --tail=20 -n auction-system deployment/payments || echo "Payments logs not available"
    
    echo ""
    echo "🌐 Frontend Logs (last 20 lines):"
    kubectl logs --tail=20 -n auction-system deployment/frontend || echo "Frontend logs not available"
}

# Function to check network connectivity
check_connectivity() {
    echo ""
    echo "🔗 Network Connectivity Check:"
    echo "-----------------------------"
    
    # Check if services can reach databases
    echo "Testing database connectivity..."
    
    # Get a pod to test from
    AUTH_POD=$(kubectl get pod -l app=auth -n auction-system -o jsonpath="{.items[0].metadata.name}" 2>/dev/null || echo "")
    
    if [ -n "$AUTH_POD" ]; then
        echo "Testing from auth pod: $AUTH_POD"
        kubectl exec -n auction-system $AUTH_POD -- nslookup auth-mysql.auction-infrastructure.svc.cluster.local 2>/dev/null || echo "DNS resolution failed"
    else
        echo "No auth pod available for testing"
    fi
}

# Function to provide recommendations
provide_recommendations() {
    echo ""
    echo "💡 Recommendations:"
    echo "=================="
    
    # Check for common issues
    PENDING_PODS=$(kubectl get pods --all-namespaces | grep Pending | wc -l)
    if [ $PENDING_PODS -gt 0 ]; then
        echo "⚠️  $PENDING_PODS pods are in Pending state - check resource availability"
        echo "   Run: kubectl describe pod <pod-name> -n <namespace> for more details"
    fi
    
    CRASHLOOP_PODS=$(kubectl get pods --all-namespaces | grep CrashLoopBackOff | wc -l)
    if [ $CRASHLOOP_PODS -gt 0 ]; then
        echo "⚠️  $CRASHLOOP_PODS pods are in CrashLoopBackOff - check application logs"
        echo "   Run: kubectl logs <pod-name> -n <namespace> --previous"
    fi
    
    IMAGEPULL_PODS=$(kubectl get pods --all-namespaces | grep ImagePullBackOff | wc -l)
    if [ $IMAGEPULL_PODS -gt 0 ]; then
        echo "⚠️  $IMAGEPULL_PODS pods have ImagePullBackOff - check image names and availability"
    fi
    
    echo ""
    echo "🔧 Common Fix Commands:"
    echo "- Restart deployment: kubectl rollout restart deployment/<name> -n auction-system"
    echo "- Scale down/up: kubectl scale deployment/<name> --replicas=0 -n auction-system"
    echo "- Check logs: kubectl logs -f deployment/<name> -n auction-system"
    echo "- Describe pod: kubectl describe pod <pod-name> -n auction-system"
}

# Function to run automatic fixes
run_automatic_fixes() {
    echo ""
    echo "🔧 Running Automatic Fixes:"
    echo "============================"
    
    # Fix common issues
    echo "1. Updating resource limits for memory-intensive pods..."
    
    # Patch auth deployment with more memory
    kubectl patch deployment auth -n auction-system -p='{"spec":{"template":{"spec":{"containers":[{"name":"auth","resources":{"limits":{"memory":"512Mi","cpu":"500m"},"requests":{"memory":"256Mi","cpu":"100m"}}}]}}}}' || true
    
    # Patch bid deployment
    kubectl patch deployment bid -n auction-system -p='{"spec":{"template":{"spec":{"containers":[{"name":"bid","resources":{"limits":{"memory":"512Mi","cpu":"500m"},"requests":{"memory":"256Mi","cpu":"100m"}}}]}}}}' || true
    
    # Patch payments deployment
    kubectl patch deployment payments -n auction-system -p='{"spec":{"template":{"spec":{"containers":[{"name":"payments","resources":{"limits":{"memory":"512Mi","cpu":"500m"},"requests":{"memory":"256Mi","cpu":"100m"}}}]}}}}' || true
    
    echo "2. Restarting problematic deployments..."
    kubectl rollout restart deployment auth -n auction-system || true
    kubectl rollout restart deployment bid -n auction-system || true
    kubectl rollout restart deployment payments -n auction-system || true
    
    echo "3. Checking service types..."
    # Convert LoadBalancer to NodePort if needed
    kubectl patch service frontend-service -n auction-system -p '{"spec":{"type":"NodePort"}}' || true
    kubectl patch service api-gateway-service -n auction-system -p '{"spec":{"type":"NodePort"}}' || true
    
    echo "✅ Automatic fixes applied"
}

# Main menu
show_menu() {
    echo ""
    echo "Select an option:"
    echo "1. Check pod status"
    echo "2. Check services"
    echo "3. Check resource usage"
    echo "4. Show recent logs"
    echo "5. Check network connectivity"
    echo "6. Run automatic fixes"
    echo "7. Full diagnostic report"
    echo "8. Exit"
    echo ""
    read -p "Enter your choice (1-8): " choice
    
    case $choice in
        1) check_pods ;;
        2) check_services ;;
        3) check_resources ;;
        4) show_logs ;;
        5) check_connectivity ;;
        6) run_automatic_fixes ;;
        7) 
            check_pods
            check_services
            check_resources
            check_connectivity
            provide_recommendations
            ;;
        8) echo "Exiting..."; exit 0 ;;
        *) echo "Invalid choice. Please try again." ;;
    esac
}

# If script is run with arguments, run specific function
if [ $# -gt 0 ]; then
    case $1 in
        "pods") check_pods ;;
        "services") check_services ;;
        "resources") check_resources ;;
        "logs") show_logs ;;
        "connectivity") check_connectivity ;;
        "fix") run_automatic_fixes ;;
        "all") 
            check_pods
            check_services  
            check_resources
            check_connectivity
            provide_recommendations
            ;;
        *) echo "Unknown argument: $1" ;;
    esac
else
    # Interactive mode
    while true; do
        show_menu
        echo ""
        read -p "Press Enter to continue or 'q' to quit: " continue_choice
        if [ "$continue_choice" = "q" ]; then
            break
        fi
    done
fi

provide_recommendations
