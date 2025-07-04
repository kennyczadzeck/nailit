#!/bin/bash

# Manual Docker Build and Push Script
# This script builds and pushes the Docker image to ECR for testing

set -e

# Configuration
ENVIRONMENT=${1:-development}
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="207091906248"

# Determine ECR repository based on environment
case $ENVIRONMENT in
  development)
    ECR_REPO="nailit-dev"
    ;;
  staging)
    ECR_REPO="nailit-staging"
    ;;
  production)
    ECR_REPO="nailit-prod"
    ;;
  *)
    echo "Error: Invalid environment. Use: development, staging, or production"
    exit 1
    ;;
esac

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

echo "🚀 Building Docker image for $ENVIRONMENT environment"
echo "📦 ECR Repository: $ECR_URI"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Get Google Maps API key from AWS Secrets Manager
echo "🔑 Retrieving Google Maps API key from AWS Secrets Manager..."
GOOGLE_MAPS_API_KEY=$(aws secretsmanager get-secret-value \
    --secret-id "nailit-google-maps-api-key-${ENVIRONMENT}" \
    --query SecretString \
    --output text \
    --region $AWS_REGION)

if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
    echo "❌ Failed to retrieve Google Maps API key"
    exit 1
fi

echo "✅ Retrieved API key: ${GOOGLE_MAPS_API_KEY:0:10}..."

# Generate build metadata
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
COMMIT_HASH=$(git rev-parse --short HEAD)
IMAGE_TAG="${COMMIT_HASH}-$(date +%s)"

echo "🏗️  Build metadata:"
echo "   Build Time: $BUILD_TIME"
echo "   Commit Hash: $COMMIT_HASH"
echo "   Image Tag: $IMAGE_TAG"

# Authenticate with ECR
echo "🔐 Authenticating with ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
echo "🔨 Building Docker image..."
docker build \
    --build-arg NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
    --build-arg NEXT_PUBLIC_BUILD_TIME="$BUILD_TIME" \
    --build-arg NAILIT_ENVIRONMENT="$ENVIRONMENT" \
    -t "${ECR_URI}:${IMAGE_TAG}" \
    -t "${ECR_URI}:latest" \
    .

# Push Docker image
echo "📤 Pushing Docker image to ECR..."
docker push "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:latest"

echo "✅ Docker image successfully built and pushed!"
echo "📋 Image Details:"
echo "   Repository: $ECR_URI"
echo "   Tags: $IMAGE_TAG, latest"
echo "   Build Time: $BUILD_TIME"
echo "   Environment: $ENVIRONMENT"

echo ""
echo "🚀 Next steps:"
echo "1. Deploy App Runner in Docker mode:"
echo "   cd infrastructure"
echo "   cdk deploy AppRunner-dev --context environment=$ENVIRONMENT --context deploymentMode=docker --require-approval never"
echo ""
echo "2. Verify deployment:"
echo "   curl -s https://\$(aws apprunner list-services --query 'ServiceSummaryList[?ServiceName==\`nailit-dev\`].ServiceUrl' --output text)/api/health" 