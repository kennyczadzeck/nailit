# Docker-based Deployment Migration Plan

## Overview

This document outlines the migration from source code-based App Runner deployment to Docker-based deployment to resolve the `NEXT_PUBLIC_*` environment variable embedding issue.

## Background

### The Problem
- **NEXT_PUBLIC environment variables** (like `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) must be available during the `next build` command execution to be embedded in the client bundle
- **App Runner source code deployment** doesn't reliably pass environment variables set in the build command to the Node.js process running `npm run build`
- This results in client-side code not having access to required environment variables

### The Solution
- **Docker-based deployment** with build arguments provides guaranteed environment variable availability during the build process
- **GitHub Actions** handles building and pushing Docker images to ECR with proper build-time environment variables
- **App Runner** pulls pre-built images with environment variables already embedded

## Architecture Changes

### Before (Source Code Deployment)
```
GitHub → App Runner → Build Process → Runtime
                   ↳ Environment variables may not be available during build
```

### After (Docker Deployment)
```
GitHub → GitHub Actions → Docker Build → ECR → App Runner → Runtime
                       ↳ Environment variables guaranteed during build
```

## Implementation Details

### 1. Infrastructure Components

#### ECR Repositories
- **Purpose**: Store Docker images for each environment
- **Repositories**:
  - `nailit-dev` (development)
  - `nailit-staging` (staging) 
  - `nailit-prod` (production)
- **Lifecycle**: Keep last 10 images, delete untagged after 1 day

#### Updated App Runner Stack
- **Dual Mode Support**: Can deploy in either `source` or `docker` mode
- **Environment Variable Handling**:
  - **Docker Mode**: Environment variables embedded during build
  - **Source Mode**: Legacy behavior (for fallback)

#### GitHub Actions Workflow
- **Triggers**: Push to develop/staging/main branches
- **Matrix Strategy**: Builds for each environment based on branch
- **Build Process**:
  1. Build Docker image with `NEXT_PUBLIC_*` build arguments
  2. Push to ECR
  3. Trigger App Runner deployment

### 2. Environment Variable Strategy

#### Build-time Variables (Embedded in Client Bundle)
```dockerfile
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_BUILD_TIME
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_BUILD_TIME=$NEXT_PUBLIC_BUILD_TIME
```

#### Runtime Variables (Server-side Only)
- `DATABASE_URL` (from AWS Secrets Manager)
- `NEXTAUTH_SECRET` (from AWS Secrets Manager)
- `NEXTAUTH_URL` (from AWS Secrets Manager)
- `GOOGLE_CLIENT_ID` (from AWS Secrets Manager)
- `GOOGLE_CLIENT_SECRET` (from AWS Secrets Manager)

## Migration Steps

### Phase 1: Infrastructure Setup ✅
1. **Create ECR Stack** (`infrastructure/lib/ecr-stack.ts`)
2. **Update App Runner Stack** to support both deployment modes
3. **Create deployment scripts** for easy switching between modes
4. **Update CDK app** to include ECR stacks

### Phase 2: Docker Configuration ✅
1. **Update Dockerfile** to accept build arguments
2. **Create GitHub Actions workflow** for automated builds
3. **Test Docker build locally** (optional)

### Phase 3: Deployment ⏳
1. **Deploy ECR repositories** for all environments
2. **Deploy App Runner in Docker mode** for development environment
3. **Test and validate** the deployment
4. **Migrate staging and production** environments

### Phase 4: Cleanup 🔄
1. **Remove source code deployment configuration** (optional)
2. **Update documentation** and team processes
3. **Remove legacy build commands** and debug scripts

## Deployment Commands

### Deploy Docker-based Infrastructure
```bash
# Development
cd infrastructure
npm run deploy:docker:dev

# Staging  
npm run deploy:docker:staging

# Production
npm run deploy:docker:prod
```

### Deploy Legacy Source-based Infrastructure (Fallback)
```bash
# Development
cd infrastructure
npm run deploy:source:dev

# Staging
npm run deploy:source:staging

# Production  
npm run deploy:source:prod
```

### Manual CDK Commands
```bash
# Deploy ECR stack
cdk deploy ECR-dev --context environment=development

# Deploy App Runner in Docker mode
cdk deploy AppRunner-dev --context environment=development --context deploymentMode=docker

# Deploy App Runner in source mode (legacy)
cdk deploy AppRunner-dev --context environment=development --context deploymentMode=source
```

## Environment Configuration

### GitHub Secrets Required
- `AWS_ACCESS_KEY_ID`: AWS access key for ECR and App Runner
- `AWS_SECRET_ACCESS_KEY`: AWS secret key

### Build Arguments in GitHub Actions
```yaml
build-args: |
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDCLRbf1Nf6NxV4PqO_92-q1wE1rCNOaw0
  NEXT_PUBLIC_BUILD_TIME=${{ steps.meta.outputs.build_time }}
  NAILIT_ENVIRONMENT=${{ matrix.environment }}
```

## Testing Strategy

### 1. Build Verification
- **Health Endpoint**: Check if `NEXT_PUBLIC_*` variables are available
- **Browser Console**: Verify client-side environment variables
- **Build Logs**: Monitor Docker build process

### 2. Deployment Validation
- **App Runner Console**: Monitor deployment status
- **Application Functionality**: Test Google Maps integration
- **Performance**: Compare with source code deployment

### 3. Rollback Plan
- **Quick Rollback**: Switch back to source mode using CDK context
- **Emergency**: Revert to previous working commit

## Benefits

### ✅ Solved Issues
1. **NEXT_PUBLIC Variables**: Guaranteed embedding in client bundle
2. **Build Reliability**: Consistent build environment
3. **Debugging**: Better visibility into build process
4. **Security**: Proper separation of build-time vs runtime secrets

### ✅ Additional Benefits
1. **Faster Deployments**: Pre-built images deploy faster
2. **Consistency**: Same image across environments
3. **Caching**: Docker layer caching in GitHub Actions
4. **Scalability**: Easier to add new environments

## Tradeoffs

### ⚠️ Considerations
1. **Build Time**: GitHub Actions adds ~3-5 minutes to deployment
2. **Complexity**: More moving parts (ECR, GitHub Actions)
3. **Storage**: ECR storage costs (minimal with lifecycle policies)
4. **Dependencies**: Requires GitHub Actions and ECR

### ⚠️ Operational Changes
1. **Deployment Trigger**: Manual via GitHub Actions vs automatic via App Runner
2. **Monitoring**: Need to monitor both GitHub Actions and App Runner
3. **Debugging**: Build issues now occur in GitHub Actions

## Monitoring and Maintenance

### GitHub Actions
- **Build Status**: Monitor workflow runs
- **Build Time**: Track performance
- **Failure Alerts**: Set up notifications

### ECR
- **Storage Usage**: Monitor repository sizes
- **Image Scanning**: Review security scan results
- **Lifecycle**: Ensure old images are cleaned up

### App Runner
- **Deployment Status**: Monitor service health
- **Performance**: Compare with previous deployment method
- **Logs**: Check for runtime issues

## Success Criteria

### ✅ Migration Complete When:
1. **Environment Variables**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` available in client bundle
2. **Google Maps**: Address autocomplete working in all environments
3. **Performance**: No degradation in application performance
4. **Stability**: All three environments (dev/staging/prod) working reliably

### ✅ Validation Checks:
1. **Health Endpoint**: Shows `"hasGoogleMapsKey": true` and `"publicEnvVars": ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"]`
2. **Project Creation**: Address autocomplete field works without errors
3. **Browser Console**: No "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" errors
4. **Build Info**: Correct build metadata displayed

## Next Steps

1. **Deploy Development Environment** using Docker mode
2. **Validate Google Maps Integration** works correctly
3. **Monitor for 24-48 hours** to ensure stability
4. **Migrate Staging Environment** if development is successful
5. **Migrate Production Environment** after staging validation
6. **Document lessons learned** and update team processes

## Rollback Plan

If issues arise:

### Immediate Rollback (< 5 minutes)
```bash
cd infrastructure
npm run deploy:source:dev  # Switch back to source mode
```

### Emergency Rollback (< 2 minutes)
```bash
# Revert to last known good commit
git revert HEAD
git push origin develop
# App Runner will auto-deploy previous version
```

## Support and Troubleshooting

### Common Issues
1. **Build Failures**: Check GitHub Actions logs
2. **Image Pull Errors**: Verify ECR permissions
3. **Environment Variables**: Check Dockerfile build args
4. **App Runner Issues**: Check service logs in CloudWatch

### Debugging Commands
```bash
# Check ECR repositories
aws ecr describe-repositories

# Check App Runner services
aws apprunner list-services

# Check GitHub Actions status
gh run list --repo kennyczadzeck/nailit
``` 