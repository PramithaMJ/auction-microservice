#!/bin/bash

# Database cleanup script to remove duplicate "Unknown User" entries
# This script removes any "Unknown User" placeholder entries that might be causing unique constraint violations

echo "🧹 Cleaning up duplicate 'Unknown User' entries in databases..."

# Get container IDs for MySQL databases
BID_DB_CONTAINER=$(docker ps --filter "name=bid-mysql" --format "{{.ID}}")
LISTINGS_DB_CONTAINER=$(docker ps --filter "name=listings-mysql" --format "{{.ID}}")
PAYMENTS_DB_CONTAINER=$(docker ps --filter "name=payments-mysql" --format "{{.ID}}")
PROFILE_DB_CONTAINER=$(docker ps --filter "name=profile-mysql" --format "{{.ID}}")

echo "📊 Checking for 'Unknown User' entries..."

# Cleanup bid database
if [ ! -z "$BID_DB_CONTAINER" ]; then
    echo "🔧 Cleaning bid database..."
    docker exec $BID_DB_CONTAINER mysql -u root -ppassword -e "
        USE bid_db;
        SELECT COUNT(*) as unknown_users FROM users WHERE name = 'Unknown User';
        DELETE FROM bids WHERE userId IN (SELECT id FROM users WHERE name = 'Unknown User');
        DELETE FROM users WHERE name = 'Unknown User';
        SELECT 'Bid database cleaned' as status;
    "
fi

# Cleanup listings database  
if [ ! -z "$LISTINGS_DB_CONTAINER" ]; then
    echo "🔧 Cleaning listings database..."
    docker exec $LISTINGS_DB_CONTAINER mysql -u root -ppassword -e "
        USE listings_db;
        SELECT COUNT(*) as unknown_users FROM users WHERE name = 'Unknown User';
        DELETE FROM users WHERE name = 'Unknown User';
        SELECT 'Listings database cleaned' as status;
    "
fi

# Cleanup payments database
if [ ! -z "$PAYMENTS_DB_CONTAINER" ]; then
    echo "🔧 Cleaning payments database..."
    docker exec $PAYMENTS_DB_CONTAINER mysql -u root -ppassword -e "
        USE payments_db;
        SELECT COUNT(*) as unknown_users FROM users WHERE name = 'Unknown User';
        DELETE FROM users WHERE name = 'Unknown User';
        SELECT 'Payments database cleaned' as status;
    "
fi

echo "✅ Database cleanup completed!"
echo "🚀 Restart the bid service to apply the fix:"
echo "   docker-compose restart bid"
