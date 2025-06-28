#!/bin/bash

# Deploy source code-based App Runner infrastructure (legacy)
# Usage: ./deploy-source.sh [environment]

set -e

ENVIRONMENT=${1:-development}

echo "🚀 Deploying source code-based App Runner infrastructure for $ENVIRONMENT environment"

# Validate environment
case $ENVIRONMENT in
  development|staging|production)
    echo "✅ Valid environment: $ENVIRONMENT"
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Must be one of: development, staging, production"
    exit 1
    ;;
esac

# Deploy App Runner stack in source mode
echo "🏃 Deploying App Runner stack in source code mode..."
npx cdk deploy AppRunner-$(echo $ENVIRONMENT | sed 's/development/dev/; s/production/prod/') \
  --context environment=$ENVIRONMENT \
  --context deploymentMode=source \
  --require-approval never

echo "✅ Source code-based deployment complete!"
echo ""
echo "Note: This is the legacy deployment mode."
echo "Consider migrating to Docker-based deployment for better environment variable handling." 