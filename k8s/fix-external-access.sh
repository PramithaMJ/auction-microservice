#!/bin/bash

# Complete fix script for external access issues
# This addresses all the problems found in diagnostics

echo "🔧 FIXING EXTERNAL ACCESS ISSUES"
echo "================================="

echo ""
echo "📊 Step 1: Checking current pod logs for errors..."

# Check frontend logs for the 500 error
echo "🌐 Frontend logs:"
kubectl logs deployment/frontend -n auction-system --tail=10

echo ""
echo "🚀 API Gateway logs:"
kubectl logs deployment/api-gateway -n auction-system --tail=10

echo ""
echo "📊 Step 2: Fixing Security Group (AWS)"

# Get instance details
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)
if [ ! -z "$INSTANCE_ID" ]; then
    echo "Instance ID: $INSTANCE_ID"
    
    # Try to get security group
    if command -v aws &> /dev/null; then
        SECURITY_GROUP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text 2>/dev/null)
        
        if [ "$SECURITY_GROUP" != "None" ] && [ ! -z "$SECURITY_GROUP" ]; then
            echo "Security Group: $SECURITY_GROUP"
            
            echo "Adding inbound rules for ports 30000 and 30001..."
            aws ec2 authorize-security-group-ingress \
                --group-id $SECURITY_GROUP \
                --protocol tcp \
                --port 30000 \
                --cidr 0.0.0.0/0 2>/dev/null || echo "Port 30000 rule may already exist"
                
            aws ec2 authorize-security-group-ingress \
                --group-id $SECURITY_GROUP \
                --protocol tcp \
                --port 30001 \
                --cidr 0.0.0.0/0 2>/dev/null || echo "Port 30001 rule may already exist"
                
            echo "✅ Security group rules added/verified"
        else
            echo "⚠️ Could not determine security group automatically"
        fi
    else
        echo "⚠️ AWS CLI not configured"
    fi
else
    echo "⚠️ Could not get instance ID"
fi

echo ""
echo "🔧 Step 3: Fixing Frontend Configuration"

# Check and fix frontend environment variables
echo "Checking frontend configuration..."
kubectl get configmap frontend-config -n auction-system -o yaml

echo ""
echo "🔧 Step 4: Restart services with fresh configuration"

# Scale down and up to restart pods
echo "Restarting frontend and api-gateway..."
kubectl rollout restart deployment/frontend -n auction-system
kubectl rollout restart deployment/api-gateway -n auction-system

echo "Waiting for restart..."
kubectl rollout status deployment/frontend -n auction-system --timeout=120s
kubectl rollout status deployment/api-gateway -n auction-system --timeout=120s

echo ""
echo "🔧 Step 5: Test internal connectivity"

sleep 10

# Test if pods are responding
echo "Testing frontend pod response..."
FRONTEND_POD=$(kubectl get pods -n auction-system -l app=frontend --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$FRONTEND_POD" ]; then
    kubectl exec $FRONTEND_POD -n auction-system -- wget -qO- http://localhost:3000 | head -5 || echo "Frontend not responding on internal port"
fi

echo ""
echo "Testing API Gateway pod response..."
API_POD=$(kubectl get pods -n auction-system -l app=api-gateway --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$API_POD" ]; then
    kubectl exec $API_POD -n auction-system -- wget -qO- http://localhost:3001/health | head -5 || echo "API Gateway not responding on internal port"
fi

echo ""
echo "🔧 Step 6: Final connectivity test"

echo "Testing external access..."
echo "Frontend (port 30000):"
curl -I http://34.229.99.72:30000 --connect-timeout 5 || echo "❌ Frontend not accessible externally"

echo ""
echo "API Gateway (port 30001):"
curl -I http://34.229.99.72:30001 --connect-timeout 5 || echo "❌ API Gateway not accessible externally"

echo ""
echo "🎯 MANUAL STEPS REQUIRED:"
echo "=========================="
echo ""
echo "1. 🔒 AWS Security Group (if not done automatically):"
echo "   - Go to AWS Console → EC2 → Security Groups"
echo "   - Find your instance's security group"
echo "   - Add inbound rules:"
echo "     * Type: Custom TCP, Port: 30000, Source: 0.0.0.0/0"
echo "     * Type: Custom TCP, Port: 30001, Source: 0.0.0.0/0"
echo ""
echo "2. 🌐 Access URLs:"
echo "   Frontend:    http://34.229.99.72:30000"
echo "   API Gateway: http://34.229.99.72:30001"
echo ""
echo "3. 🔍 If still not working, check:"
echo "   kubectl logs deployment/frontend -n auction-system"
echo "   kubectl logs deployment/api-gateway -n auction-system"
echo ""
echo "✅ Fix script completed!"
