#!/bin/bash

# Comprehensive troubleshooting script for external access issues
# This will help identify why external connections are failing

echo "🔍 TROUBLESHOOTING EXTERNAL ACCESS ISSUES"
echo "=========================================="

echo ""
echo "📊 Step 1: Checking Minikube and Kubernetes Status"
echo "Minikube status:"
minikube status

echo ""
echo "Minikube IP:"
minikube ip

echo ""
echo "📊 Step 2: Checking Pod and Service Status"
echo "Pods in auction-system:"
kubectl get pods -n auction-system -o wide

echo ""
echo "Services in auction-system:"
kubectl get services -n auction-system -o wide

echo ""
echo "📊 Step 3: Testing Internal Minikube Access"
MINIKUBE_IP=$(minikube ip)
echo "Testing access to Minikube IP ($MINIKUBE_IP)..."

echo "Testing Frontend on Minikube:"
curl -I http://$MINIKUBE_IP:30000 --connect-timeout 5 || echo "❌ Frontend not accessible on Minikube IP"

echo ""
echo "Testing API Gateway on Minikube:"
curl -I http://$MINIKUBE_IP:30001 --connect-timeout 5 || echo "❌ API Gateway not accessible on Minikube IP"

echo ""
echo "📊 Step 4: Checking if Minikube Tunnel is Needed"
echo "Checking if services have external IPs..."
kubectl get services -n auction-system | grep LoadBalancer

echo ""
echo "📊 Step 5: Network Configuration Check"
echo "Checking network interfaces:"
ip addr show | grep -E "(docker|minikube|bridge)" || echo "Using ifconfig fallback:"
ifconfig | grep -E "(docker|minikube|bridge)" || echo "No docker/minikube interfaces found"

echo ""
echo "📊 Step 6: Port Binding Check"
echo "Checking what's listening on relevant ports:"
sudo netstat -tlnp | grep -E "(30000|30001|3000|3001)" || echo "netstat not available, trying ss:"
ss -tlnp | grep -E "(30000|30001|3000|3001)" || echo "No processes listening on these ports"

echo ""
echo "📊 Step 7: Docker/Container Check"
echo "Docker containers:"
docker ps | grep -E "(minikube|k8s)" || echo "No relevant containers found"

echo ""
echo "📊 Step 8: EC2 Network Configuration"
echo "EC2 instance metadata:"
curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "Could not get public IP"
curl -s http://169.254.169.254/latest/meta-data/local-ipv4 || echo "Could not get private IP"

echo ""
echo "📊 Step 9: Testing Direct Pod Access"
echo "Getting pod IPs and testing direct access..."

FRONTEND_POD=$(kubectl get pods -n auction-system -l app=frontend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$FRONTEND_POD" ]; then
    FRONTEND_IP=$(kubectl get pod $FRONTEND_POD -n auction-system -o jsonpath='{.status.podIP}')
    echo "Testing direct access to frontend pod ($FRONTEND_IP:3000)..."
    kubectl exec $FRONTEND_POD -n auction-system -- wget -qO- http://localhost:3000 | head -1 || echo "Frontend pod not responding internally"
fi

API_POD=$(kubectl get pods -n auction-system -l app=api-gateway -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$API_POD" ]; then
    API_IP=$(kubectl get pod $API_POD -n auction-system -o jsonpath='{.status.podIP}')
    echo "Testing direct access to API gateway pod ($API_IP:3001)..."
    kubectl exec $API_POD -n auction-system -- wget -qO- http://localhost:3001/health | head -1 || echo "API gateway pod not responding internally"
fi

echo ""
echo "📊 Step 10: Minikube Service URLs"
echo "Getting Minikube service URLs..."
minikube service list

echo ""
echo "🔧 RECOMMENDED SOLUTIONS:"
echo "========================"
echo ""
echo "1. 🌐 Try Minikube Service URLs:"
echo "   minikube service frontend-service -n auction-system --url"
echo "   minikube service api-gateway-service -n auction-system --url"
echo ""
echo "2. 🚇 Try Minikube Tunnel (run in separate terminal):"
echo "   minikube tunnel"
echo ""
echo "3. 🔄 Try Port Forwarding:"
echo "   kubectl port-forward --address 0.0.0.0 service/frontend-service 3000:3000 -n auction-system"
echo "   kubectl port-forward --address 0.0.0.0 service/api-gateway-service 3001:3001 -n auction-system"
echo ""
echo "4. 🔍 Check if Docker is using different network:"
echo "   docker network ls"
echo "   docker inspect minikube"
echo ""
echo "✅ Troubleshooting complete!"
