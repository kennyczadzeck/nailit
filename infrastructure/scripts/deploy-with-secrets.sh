#!/bin/bash

# NailIt Infrastructure Deployment with Secure Secrets Management
# This script sets environment variables from current hardcoded values,
# then deploys the CDK infrastructure to reference them properly.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 NailIt Infrastructure Deployment with Secrets Management${NC}"
echo "=============================================================="

# Check required parameters
if [ "$#" -lt 1 ]; then
    echo -e "${RED}Usage: $0 <environment> [stack-names...]${NC}"
    echo "Environment must be one of: development, staging, production"
    echo "Example: $0 development"
    echo "Example: $0 production Secrets AppRunner"
    exit 1
fi

ENVIRONMENT="$1"
shift
STACKS="$@"

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Must be one of: development, staging, production"
    exit 1
fi

echo -e "${YELLOW}🔧 Environment: $ENVIRONMENT${NC}"

# Set environment variables with current values
# These will be moved to a secure location (like .env.secrets) in production
echo -e "${YELLOW}🔐 Setting environment variables for deployment...${NC}"

# Database URLs (environment-specific)
case $ENVIRONMENT in
    development)
        export NAILIT_DATABASE_URL_DEVELOPMENT="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
        ;;
    staging)
        export NAILIT_DATABASE_URL_STAGING="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
        ;;
    production)
        export NAILIT_DATABASE_URL_PRODUCTION="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
        ;;
esac

# Shared secrets (same across environments for now)
export NAILIT_NEXTAUTH_SECRET_DEVELOPMENT="+hP31rrZgohD7u3uHr/ASb1WE9j3MYjxHtTBmaaU+3M="
export NAILIT_NEXTAUTH_SECRET_STAGING="+hP31rrZgohD7u3uHr/ASb1WE9j3MYjxHtTBmaaU+3M="
export NAILIT_NEXTAUTH_SECRET_PRODUCTION="+hP31rrZgohD7u3uHr/ASb1WE9j3MYjxHtTBmaaU+3M="

export NAILIT_GOOGLE_CLIENT_ID_DEVELOPMENT="442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com"
export NAILIT_GOOGLE_CLIENT_ID_STAGING="442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com"
export NAILIT_GOOGLE_CLIENT_ID_PRODUCTION="442433418686-sahpnrfagrs9lfs1pdee2m06e4g2ukdc.apps.googleusercontent.com"

export NAILIT_GOOGLE_CLIENT_SECRET_DEVELOPMENT="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"
export NAILIT_GOOGLE_CLIENT_SECRET_STAGING="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"
export NAILIT_GOOGLE_CLIENT_SECRET_PRODUCTION="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"

export NAILIT_GOOGLE_MAPS_API_KEY_DEVELOPMENT="AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0"
export NAILIT_GOOGLE_MAPS_API_KEY_STAGING="AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0"
export NAILIT_GOOGLE_MAPS_API_KEY_PRODUCTION="AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0"

echo -e "${GREEN}✅ Environment variables set for $ENVIRONMENT${NC}"

# Change to infrastructure directory
cd "$(dirname "$0")/.."

# Build the project
echo -e "${YELLOW}📦 Building CDK project...${NC}"
npm run build

# Deploy the stacks
if [ -n "$STACKS" ]; then
    echo -e "${YELLOW}🚀 Deploying specific stacks: $STACKS${NC}"
    for stack in $STACKS; do
        echo -e "${YELLOW}🔄 Deploying ${stack}-${ENVIRONMENT}...${NC}"
        npx cdk deploy "${stack}-${ENVIRONMENT}" --require-approval never
    done
else
    echo -e "${YELLOW}🚀 Deploying all stacks for $ENVIRONMENT...${NC}"
    npx cdk deploy --all --require-approval never
fi

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Verify the secrets are properly stored in AWS Secrets Manager"
echo "2. Test the App Runner deployment"
echo "3. Move secrets to a secure .env.secrets file (not committed to Git)"
echo "4. Update GitHub Actions to use the secure deployment method" 