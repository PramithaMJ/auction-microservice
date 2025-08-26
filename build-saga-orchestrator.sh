#!/bin/bash

# Build and push saga orchestrator Docker image
echo "🔨 Building Saga Orchestrator Docker image..."

# Set the image tag (default to latest if not provided)
IMAGE_TAG=${1:-latest}
DOCKER_REPO="pramithamj/auction-website-saga-orchestrator"

# Build the image
cd services/saga-orchestrator
docker build -t $DOCKER_REPO:$IMAGE_TAG .

if [ $? -eq 0 ]; then
    echo "✅ Successfully built $DOCKER_REPO:$IMAGE_TAG"
    
    # Ask if user wants to push
    read -p "Do you want to push the image to Docker Hub? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Pushing image to Docker Hub..."
        docker push $DOCKER_REPO:$IMAGE_TAG
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully pushed $DOCKER_REPO:$IMAGE_TAG"
        else
            echo "❌ Failed to push image"
            exit 1
        fi
    fi
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

echo "🎯 Saga Orchestrator Docker image ready!"
