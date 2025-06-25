#!/bin/bash

# Script to create GitHub connection for App Runner
# This creates the connection but you still need to complete the handshake in the console

echo "Creating GitHub connection for App Runner..."

CONNECTION_NAME="nailit-github-connection"

# Create the connection
RESULT=$(aws apprunner create-connection \
  --connection-name "$CONNECTION_NAME" \
  --provider-type GITHUB \
  --output json)

if [ $? -eq 0 ]; then
  CONNECTION_ARN=$(echo "$RESULT" | jq -r '.Connection.ConnectionArn')
  CONNECTION_STATUS=$(echo "$RESULT" | jq -r '.Connection.Status')
  
  echo "✅ GitHub connection created successfully!"
  echo "Connection ARN: $CONNECTION_ARN"
  echo "Status: $CONNECTION_STATUS"
  echo ""
  echo "🔗 IMPORTANT: You need to complete the handshake in the AWS Console:"
  echo "1. Go to AWS App Runner Console → Connections"
  echo "2. Find connection: $CONNECTION_NAME"
  echo "3. Click 'Complete handshake' and authorize with GitHub"
  echo ""
  echo "🚀 After completing handshake, deploy with:"
  echo "npx cdk deploy AppRunner-dev -c githubConnectionArn=\"$CONNECTION_ARN\""
  echo ""
  echo "💾 Save this ARN for future use:"
  echo "export GITHUB_CONNECTION_ARN=\"$CONNECTION_ARN\""
else
  echo "❌ Failed to create GitHub connection"
  exit 1
fi 