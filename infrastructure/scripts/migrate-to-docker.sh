#!/bin/bash

# Migrate App Runner services from source code to Docker deployment
# This script will redeploy staging and production using Docker containers

set -e

ENVIRONMENT=${1:-staging}

echo "🚀 Migrating $ENVIRONMENT to Docker deployment..."

# Validate environment
case $ENVIRONMENT in
  staging|production)
    echo "✅ Valid environment: $ENVIRONMENT"
    ;;
  *)
    echo "❌ Invalid environment: $ENVIRONMENT"
    echo "Usage: $0 <staging|production>"
    exit 1
    ;;
esac

# Check for secrets file
SECRETS_FILE="$(dirname "$0")/../.env.secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "❌ Secrets file not found: $SECRETS_FILE"
  echo "Please ensure .env.secrets exists with all required environment variables"
  exit 1
fi

echo "📋 Loading secrets from $SECRETS_FILE..."
export $(grep -v '^#' "$SECRETS_FILE" | xargs)

# Validate required environment variables
REQUIRED_VARS=(
  "NAILIT_DATABASE_URL_${ENVIRONMENT^^}"
  "NAILIT_NEXTAUTH_SECRET_${ENVIRONMENT^^}"
  "NAILIT_NEXTAUTH_URL_${ENVIRONMENT^^}"
  "NAILIT_GOOGLE_CLIENT_ID_${ENVIRONMENT^^}"
  "NAILIT_GOOGLE_CLIENT_SECRET_${ENVIRONMENT^^}"
  "NAILIT_GOOGLE_MAPS_API_KEY_${ENVIRONMENT^^}"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

echo "✅ All required environment variables are set"

# Change to infrastructure directory
cd "$(dirname "$0")/.."

echo "🔧 Installing CDK dependencies..."
npm install

echo "🏗️  Deploying ECR stack (if not exists)..."
cdk deploy ECR-$([ "$ENVIRONMENT" = "staging" ] && echo "staging" || echo "prod") \
  --context environment=$ENVIRONMENT \
  --require-approval never

echo "🔐 Deploying Secrets stack..."
cdk deploy Secrets-$([ "$ENVIRONMENT" = "staging" ] && echo "staging" || echo "prod") \
  --context environment=$ENVIRONMENT \
  --require-approval never

echo "🐳 Deploying App Runner stack with Docker mode..."
cdk deploy AppRunner-$([ "$ENVIRONMENT" = "staging" ] && echo "staging" || echo "prod") \
  --context environment=$ENVIRONMENT \
  --context deploymentMode=docker \
  --require-approval never

echo "✅ Migration to Docker deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Push code to $ENVIRONMENT branch to trigger GitHub Actions"
echo "2. GitHub Actions will build and push Docker image"
echo "3. App Runner will automatically deploy the new image"
echo ""
echo "🔍 Monitor deployment:"
echo "aws apprunner list-services --query 'ServiceSummaryList[?contains(ServiceName, \`$ENVIRONMENT\`)]'"
echo ""
echo "🌐 Service URL will be available once deployment completes" 