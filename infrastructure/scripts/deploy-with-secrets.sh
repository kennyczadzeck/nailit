#!/bin/bash

# Secure deployment script for NailIt CDK infrastructure
# This script reads credentials from .env.secrets (not committed to Git)
# Usage: ./deploy-with-secrets.sh [environment] [stack]

set -e

ENVIRONMENT=${1:-development}
STACK=${2:-all}

echo "🔐 Deploying NailIt infrastructure with secure credential management"
echo "Environment: $ENVIRONMENT"
echo "Stack: $STACK"

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

# Check for .env.secrets file
SECRETS_FILE="$(dirname "$0")/../.env.secrets"
if [ ! -f "$SECRETS_FILE" ]; then
  echo "❌ Secrets file not found: $SECRETS_FILE"
  echo ""
  echo "📋 Please create .env.secrets with the following format:"
  echo ""
  echo "# Database URLs for each environment"
  echo "NAILIT_DATABASE_URL_DEVELOPMENT=\"postgresql://user:pass@host/db\""
  echo "NAILIT_DATABASE_URL_STAGING=\"postgresql://user:pass@host/db\""
  echo "NAILIT_DATABASE_URL_PRODUCTION=\"postgresql://user:pass@host/db\""
  echo ""
  echo "# NextAuth secrets"
  echo "NAILIT_NEXTAUTH_SECRET_DEVELOPMENT=\"your-nextauth-secret\""
  echo "NAILIT_NEXTAUTH_SECRET_STAGING=\"your-nextauth-secret\""
  echo "NAILIT_NEXTAUTH_SECRET_PRODUCTION=\"your-nextauth-secret\""
  echo ""
  echo "# Google OAuth credentials"
  echo "NAILIT_GOOGLE_CLIENT_ID_DEVELOPMENT=\"your-google-client-id\""
  echo "NAILIT_GOOGLE_CLIENT_ID_STAGING=\"your-google-client-id\""
  echo "NAILIT_GOOGLE_CLIENT_ID_PRODUCTION=\"your-google-client-id\""
  echo ""
  echo "NAILIT_GOOGLE_CLIENT_SECRET_DEVELOPMENT=\"your-google-client-secret\""
  echo "NAILIT_GOOGLE_CLIENT_SECRET_STAGING=\"your-google-client-secret\""
  echo "NAILIT_GOOGLE_CLIENT_SECRET_PRODUCTION=\"your-google-client-secret\""
  echo ""
  echo "# API Keys"
  echo "NAILIT_GOOGLE_MAPS_API_KEY_DEVELOPMENT=\"your-api-key\""
  echo "NAILIT_GOOGLE_MAPS_API_KEY_STAGING=\"your-api-key\""
  echo "NAILIT_GOOGLE_MAPS_API_KEY_PRODUCTION=\"your-api-key\""
  echo ""
  echo "⚠️  IMPORTANT: .env.secrets should NEVER be committed to Git!"
  echo "   Add it to .gitignore if not already there."
  exit 1
fi

# Load secrets from file
echo "📁 Loading secrets from $SECRETS_FILE"
export $(grep -v '^#' "$SECRETS_FILE" | xargs)

# Validate that required secrets are loaded
REQUIRED_VARS=(
  "NAILIT_DATABASE_URL_${ENVIRONMENT^^}"
  "NAILIT_NEXTAUTH_SECRET_${ENVIRONMENT^^}"
  "NAILIT_GOOGLE_CLIENT_ID_${ENVIRONMENT^^}"
  "NAILIT_GOOGLE_CLIENT_SECRET_${ENVIRONMENT^^}"
  "NAILIT_GOOGLE_MAPS_API_KEY_${ENVIRONMENT^^}"
)

echo "🔍 Validating required environment variables..."
MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  else
    echo "  ✅ $var is set"
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  printf '  - %s\n' "${MISSING_VARS[@]}"
  echo ""
  echo "Please update your .env.secrets file with the missing variables."
  exit 1
fi

# Change to infrastructure directory
cd "$(dirname "$0")/.."

# Deploy stacks
echo "🚀 Starting CDK deployment..."

if [ "$STACK" = "all" ] || [ "$STACK" = "secrets" ]; then
  echo "📦 Deploying Secrets stack..."
  npx cdk deploy "Secrets-$(echo $ENVIRONMENT | sed 's/development/dev/; s/production/prod/')" \
    --context environment=$ENVIRONMENT \
    --require-approval never
fi

if [ "$STACK" = "all" ] || [ "$STACK" = "logging" ]; then
  echo "📊 Deploying Logging stack..."
  npx cdk deploy "LoggingStack-$(echo $ENVIRONMENT | sed 's/development/dev/; s/production/prod/')" \
    --context environment=$ENVIRONMENT \
    --require-approval never
fi

if [ "$STACK" = "all" ] || [ "$STACK" = "app-runner" ]; then
  echo "🏃 Deploying App Runner stack..."
  npx cdk deploy "AppRunner-$(echo $ENVIRONMENT | sed 's/development/dev/; s/production/prod/')" \
    --context environment=$ENVIRONMENT \
    --require-approval never
fi

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify deployment in AWS Console"
echo "2. Test application functionality"
echo "3. Monitor CloudWatch logs for any issues"
echo ""
echo "🔒 Security reminder:"
echo "- All credentials are now stored securely in AWS Secrets Manager"
echo "- No hardcoded secrets remain in the codebase"
echo "- .env.secrets file should remain local and never be committed" 