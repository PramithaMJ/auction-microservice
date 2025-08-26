#!/bin/bash

# User Registration Saga Demo Script
echo "🎬 Starting User Registration Saga Demo"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if services are running
print_step "Checking if required services are running..."

# Check Auth Service
if curl -s http://localhost:3100/api/auth/health > /dev/null; then
    print_success "Auth Service (3100) is running"
else
    print_error "Auth Service (3100) is not running"
    echo "Please start the auth service first"
    exit 1
fi

# Check Profile Service
if curl -s http://localhost:3103/api/profile/health > /dev/null; then
    print_success "Profile Service (3103) is running"
else
    print_error "Profile Service (3103) is not running"
    echo "Please start the profile service first"
    exit 1
fi

# Check Email Service
if curl -s http://localhost:3106/api/email/health > /dev/null; then
    print_success "Email Service (3106) is running"
else
    print_error "Email Service (3106) is not running"
    echo "Please start the email service first"
    exit 1
fi

# Check Saga Orchestrator
if curl -s http://localhost:3108/health > /dev/null; then
    print_success "Saga Orchestrator (3108) is running"
else
    print_error "Saga Orchestrator (3108) is not running"
    echo "Please start the saga orchestrator service first"
    exit 1
fi

echo ""
print_step "All services are running. Starting saga test..."
echo ""

# Test user data
USER_EMAIL="demo.saga@example.com"
USER_PASSWORD="password123"
USER_NAME="Demo User"
USER_AVATAR="https://avatars.dicebear.com/api/avataaars/demo.svg"

print_step "Step 1: Creating user account via Auth Service (This triggers the saga)"
echo "POST /api/auth/signup"
echo "Data: email=$USER_EMAIL, password=$USER_PASSWORD, name=$USER_NAME, avatar=$USER_AVATAR"

SIGNUP_RESPONSE=$(curl -s -X POST http://localhost:3100/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$USER_EMAIL'",
    "password": "'$USER_PASSWORD'",
    "name": "'$USER_NAME'",
    "avatar": "'$USER_AVATAR'"
  }')

echo "Response: $SIGNUP_RESPONSE"

# Extract user ID and saga ID if available
USER_ID=$(echo $SIGNUP_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    print_error "User creation failed or user ID not found in response"
    exit 1
fi

print_success "User created with ID: $USER_ID"
echo ""

# Wait a moment for saga to process
print_step "Waiting 3 seconds for saga to process..."
sleep 3

# Check saga status
print_step "Step 2: Checking active sagas"
echo "GET /api/sagas/user-registration"

SAGA_STATUS=$(curl -s http://localhost:3107/api/sagas/user-registration)
echo "Active Sagas Response: $SAGA_STATUS"
echo ""

# Check if profile was created
print_step "Step 3: Verifying profile creation"
echo "This should happen automatically via the saga"

# Note: In a real implementation, you might have an endpoint to check if profile exists
# For now, we'll check the saga status

# Wait a bit more for email to be sent
print_step "Waiting 5 seconds for email processing..."
sleep 5

# Check final saga status
print_step "Step 4: Final saga status and metrics check"
FINAL_STATUS=$(curl -s http://localhost:3107/api/sagas/user-registration)
echo "Final Active Sagas: $FINAL_STATUS"

METRICS=$(curl -s http://localhost:3107/api/sagas/metrics)
echo "Saga Metrics: $METRICS"
echo ""

print_step "Step 5: Manual verification steps"
echo "You can manually verify the saga completion by:"
echo "1. Checking the logs of all services"
echo "2. Verifying the email was 'sent' (check email service logs)"
echo "3. Checking if profile was created in the database"
echo ""

print_success "Saga demo completed!"
echo ""
print_warning "Note: This demo assumes all services are running with their databases"
print_warning "The email won't actually be sent unless you configure real SMTP settings"
echo ""

# Show service logs tip
echo "To view service logs in real-time, run:"
echo "Auth Service:        tail -f logs/auth.log"
echo "Profile Service:     tail -f logs/profile.log"
echo "Email Service:       tail -f logs/email.log"
echo "Saga Orchestrator:   tail -f logs/saga-orchestrator.log"
