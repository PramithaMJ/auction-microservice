#!/bin/bash

# Complete diagnostics for external access issues

echo "🔍 COMPREHENSIVE DIAGNOSTICS FOR EXTERNAL ACCESS"
echo "=================================================="

echo ""
echo "📊 1. Service Status Check:"
kubectl get services -n auction-system -o wide

echo ""
echo "🔧 2. Pod Status Check:"
kubectl get pods -n auction-system | grep -E "(frontend|api-gateway)"

echo ""
echo "🌐 3. Network Connectivity Check:"
echo "Testing internal connectivity..."

# Test if pods are responding internally
FRONTEND_POD=$(kubectl get pods -n auction-system -l app=frontend -o jsonpath='{.items[0].metadata.name}')
API_POD=$(kubectl get pods -n auction-system -l app=api-gateway -o jsonpath='{.items[0].metadata.name}')

echo "Frontend Pod: $FRONTEND_POD"
echo "API Gateway Pod: $API_POD"

if [ ! -z "$FRONTEND_POD" ]; then
    echo "Testing frontend pod health..."
    kubectl exec $FRONTEND_POD -n auction-system -- wget -q --spider http://localhost:3000 && echo "✅ Frontend responds internally" || echo "❌ Frontend not responding"
fi

if [ ! -z "$API_POD" ]; then
    echo "Testing API gateway pod health..."
    kubectl exec $API_POD -n auction-system -- wget -q --spider http://localhost:3001 && echo "✅ API Gateway responds internally" || echo "❌ API Gateway not responding"
fi

echo ""
echo "🔌 4. Port Check on EC2:"
sudo netstat -tlnp | grep -E ":30000|:30001" || echo "⚠️ Ports 30000/30001 not listening on EC2"

echo ""
echo "🔥 5. Firewall Check:"
sudo ufw status || echo "UFW not installed/configured"

echo ""
echo "☁️ 6. Security Group Check:"
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
echo "Instance ID: $INSTANCE_ID"

if command -v aws &> /dev/null; then
    echo "Current Security Group Rules:"
    SECURITY_GROUP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
    aws ec2 describe-security-groups --group-ids $SECURITY_GROUP --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' --output table
else
    echo "AWS CLI not configured"
fi

echo ""
echo "🎯 7. Direct Connection Test:"
echo "Testing from localhost..."
curl -s -o /dev/null -w "Frontend (30000): %{http_code} - %{time_total}s\n" http://localhost:30000 || echo "❌ Frontend not accessible locally"
curl -s -o /dev/null -w "API Gateway (30001): %{http_code} - %{time_total}s\n" http://localhost:30001 || echo "❌ API Gateway not accessible locally"

echo ""
echo "📝 8. Minikube Node Port Check:"
minikube service list

echo ""
echo "🔗 9. Endpoints Check:"
kubectl get endpoints -n auction-system frontend-service api-gateway-service

echo ""
echo "✅ DIAGNOSTICS COMPLETE"
echo "========================"
echo ""
echo "🎯 Next Steps:"
echo "1. Update AWS Security Group to allow ports 30000, 30001"
echo "2. Test: curl -I http://34.229.99.72:30000"
echo "3. Access: http://34.229.99.72:30000 in browser"
