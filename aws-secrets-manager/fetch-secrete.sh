#!/bin/bash

# Fetch secrets from AWS Secrets Manager and convert JSON to .env format in the project root
aws secretsmanager get-secret-value \
  --secret-id auctionHub-SM \
  --query SecretString \
  --output text | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' > ../.env

echo ".env file updated from AWS Secrets Manager at project root."