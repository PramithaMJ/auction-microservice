#!/bin/bash

# Fix tracing imports to use the correct path

services=("auth" "bid" "email" "expiration" "payments" "profile" "saga-orchestrator" "api-gateway" "listings")

for service in "${services[@]}"; do
  tracing_file="services/$service/src/tracing-init.ts"
  
  if [ -f "$tracing_file" ]; then
    echo "Fixing import in $tracing_file..."
    
    # Replace the incorrect import path with the correct one
    sed -i '' 's|@jjmauction/common/build/tracing|@jjmauction/common/server|g' "$tracing_file"
    
    echo "Fixed import in $tracing_file"
  else
    echo "File $tracing_file does not exist, skipping..."
  fi
done

echo "All tracing import paths fixed!"
