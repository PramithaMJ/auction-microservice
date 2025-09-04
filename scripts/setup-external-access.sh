#!/bin/bash

# External Access Configuration for Ubuntu Server
# This script configures external access for your auction website running on Kubernetes

set -e

echo "🌐 Configuring external access for Ubuntu server..."

# Get server IP
if curl -s --max-time 5 http://169.254.169.254/latest/meta-data/instance-id &>/dev/null; then
    # AWS EC2 detected
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
    PRIVATE_IP=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
    echo "✅ AWS EC2 detected"
    echo "Public IP: $PUBLIC_IP"
    echo "Private IP: $PRIVATE_IP"
    SERVER_IP="$PUBLIC_IP"
else
    # Get local server IP
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo "Server IP: $SERVER_IP"
fi

# Update ConfigMap with correct server IP
echo "📝 Updating ConfigMap with server IP: $SERVER_IP"

kubectl patch configmap auction-config -n auction-system --patch="
data:
  SERVER_IP: '$SERVER_IP'
  CORS_ORIGIN: 'http://localhost:3000,http://localhost:3001,http://$SERVER_IP:30000,http://$SERVER_IP:30001,http://$SERVER_IP'
"

kubectl patch configmap frontend-config -n auction-system --patch="
data:
  NEXT_PUBLIC_API_URL: 'http://$SERVER_IP:30001'
  NEXT_PUBLIC_SERVER_IP: '$SERVER_IP'
  SERVER_API_URL: 'http://$SERVER_IP:30001'
"

# Restart services to pick up new config
echo "🔄 Restarting services to apply new configuration..."
kubectl rollout restart deployment frontend -n auction-system
kubectl rollout restart deployment api-gateway -n auction-system

echo ""
echo "✅ External access configured!"
echo ""
echo "🎯 Your application is accessible at:"
echo "Frontend:    http://$SERVER_IP:30000"
echo "API Gateway: http://$SERVER_IP:30001"
echo ""

if curl -s --max-time 5 http://169.254.169.254/latest/meta-data/instance-id &>/dev/null; then
    echo "⚠️  AWS Security Group Requirements:"
    echo "Make sure these ports are open in your security group:"
    echo "- Port 30000 (Frontend)"
    echo "- Port 30001 (API Gateway)"
    echo ""
    echo "AWS CLI commands to open ports:"
    echo "aws ec2 authorize-security-group-ingress --group-id YOUR_SG_ID --protocol tcp --port 30000 --cidr 0.0.0.0/0"
    echo "aws ec2 authorize-security-group-ingress --group-id YOUR_SG_ID --protocol tcp --port 30001 --cidr 0.0.0.0/0"
fi

echo ""
echo "🔍 Monitor deployment: kubectl get pods -n auction-system -w"
