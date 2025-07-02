# Docker Migration Quick Start Guide

This guide provides step-by-step instructions to migrate from source code-based to Docker-based App Runner deployment.

## Prerequisites

- AWS CLI configured with appropriate permissions
- CDK CLI installed (`npm install -g aws-cdk`)
- GitHub repository with Actions enabled
- Access to AWS Secrets Manager

## Step 1: Deploy ECR Infrastructure

Deploy the ECR repositories for all environments:

```bash
cd infrastructure

# Deploy ECR for development
npm run cdk deploy ECR-dev --context environment=development --require-approval never

# Deploy ECR for staging  
npm run cdk deploy ECR-staging --context environment=staging --require-approval never

# Deploy ECR for production
npm run cdk deploy ECR-prod --context environment=production --require-approval never
```

## Step 2: Set Up GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Add the following repository secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

## Step 3: Deploy App Runner in Docker Mode

Deploy the App Runner services in Docker mode:

```bash
# Deploy development environment
npm run deploy:docker:dev

# Wait for deployment to complete, then deploy staging
npm run deploy:docker:staging

# Wait for deployment to complete, then deploy production  
npm run deploy:docker:prod
```

## Step 4: Trigger Initial Build

Push a commit to trigger the GitHub Actions build:

```bash
# Make a small change to trigger build
echo "# Docker Migration Complete" >> README.md
git add README.md
git commit -m "feat: migrate to Docker-based deployment"
git push origin develop
```

## Step 5: Monitor Deployment

1. **GitHub Actions**: Watch the workflow run at `https://github.com/kennyczadzeck/nailit/actions`
2. **ECR**: Verify images are pushed to ECR repositories
3. **App Runner**: Monitor deployment in AWS Console

## Step 6: Verify Deployment

Test that the Google Maps API key is now properly embedded:

```bash
# Check development environment
curl -s "https://d3pvc5dn43.us-east-1.awsapprunner.com/api/health" | jq '.build'

# Should show:
# {
#   "hasGoogleMapsKey": true,
#   "publicEnvVars": ["NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "NEXT_PUBLIC_BUILD_TIME"]
# }
```

## Step 7: Test Application

1. Visit the development environment: `https://d3pvc5dn43.us-east-1.awsapprunner.com`
2. Navigate to "Create Project"
3. Verify that the address autocomplete field works without errors
4. Check browser console for any environment variable errors

## Rollback (If Needed)

If issues arise, quickly rollback to source code deployment:

```bash
cd infrastructure
npm run deploy:source:dev
```

## Success Criteria

✅ **Migration is successful when:**
- GitHub Actions workflow completes successfully
- ECR repositories contain Docker images
- App Runner services are running
- Health endpoint shows `hasGoogleMapsKey: true`
- Google Maps address autocomplete works
- No environment variable errors in browser console

## Troubleshooting

### GitHub Actions Fails
- Check workflow logs in GitHub Actions tab
- Verify AWS credentials are set correctly
- Ensure ECR repositories exist

### App Runner Deployment Fails
- Check App Runner service logs in CloudWatch
- Verify ECR image exists and is accessible
- Check IAM permissions for App Runner service

### Environment Variables Not Working
- Verify Dockerfile build arguments are set correctly
- Check GitHub Actions build logs for environment variable values
- Ensure Next.js build process completes successfully

## Next Steps

After successful migration:

1. **Monitor** all environments for 24-48 hours
2. **Update team documentation** about new deployment process
3. **Consider removing** legacy source code deployment configuration
4. **Set up monitoring** for GitHub Actions workflow failures

## Support

For issues or questions:
- Check the full migration plan: `docs/deployment/DOCKER_MIGRATION_PLAN.md`
- Review troubleshooting section in the migration plan
- Check GitHub Actions logs and AWS CloudWatch logs 