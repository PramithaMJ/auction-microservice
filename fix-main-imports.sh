#!/bin/bash

# Fix all tracing imports to use the main common package

services=("auth" "bid" "email" "expiration" "payments" "profile" "saga-orchestrator" "api-gateway" "listings")

for service in "${services[@]}"; do
  tracing_file="services/$service/src/tracing-init.ts"
  
  if [ -f "$tracing_file" ]; then
    echo "Updating import in $tracing_file..."
    
    # Replace any tracing import path with the main common package
    sed -i '' 's|@jjmauction/common.*|@jjmauction/common'\''|g' "$tracing_file"
    
    echo "Updated import in $tracing_file"
  else
    echo "File $tracing_file does not exist, skipping..."
  fi
done

echo "All tracing imports updated to use main common package!"
