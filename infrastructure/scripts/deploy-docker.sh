#!/bin/bash

# Deploy Docker-based App Runner infrastructure
# Usage: ./deploy-docker.sh [environment]

set -e

ENVIRONMENT=${1:-development}

echo "🚀 Deploying Docker-based App Runner infrastructure for $ENVIRONMENT environment"

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

# Deploy ECR stack first
echo "📦 Deploying ECR stack..."
npm run cdk deploy ECR-$(echo $ENVIRONMENT | sed 's/development/dev/; s/production/prod/') \
  --context environment=$ENVIRONMENT \
  --context deploymentMode=docker \
  --require-approval never

# Deploy App Runner stack in Docker mode
echo "🏃 Deploying App Runner stack in Docker mode..."
npm run cdk deploy AppRunner-$(echo $ENVIRONMENT | sed 's/development/dev/; s/production/prod/') \
  --context environment=$ENVIRONMENT \
  --context deploymentMode=docker \
  --require-approval never

echo "✅ Docker-based deployment complete!"
echo ""
echo "Next steps:"
echo "1. Push code to trigger GitHub Actions build"
echo "2. Monitor deployment in App Runner console"
echo "3. Test the application" 