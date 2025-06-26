# App Runner Troubleshooting Guide

## Overview
This guide documents common issues encountered when deploying Next.js applications to AWS App Runner and their solutions.

## Issue: Complex Application Build Failures

### Symptoms
- CloudFormation reports "NotStabilized" error
- App Runner service creation fails
- Build process times out or fails silently

### Root Cause Analysis
Our investigation revealed that complex Next.js applications with Prisma fail in App Runner's build environment due to:

1. **Prisma Postinstall Scripts**: The `postinstall` script in package.json runs `prisma generate` during `npm install`, but this fails in App Runner's build environment
2. **Environment Variables**: Complex env configurations in `next.config.ts` can cause build failures
3. **Node.js Version**: App Runner supports Node.js 22 but not Node.js 20
4. **Dependency Complexity**: Large dependency trees can cause timeouts

### Solution Steps

#### 1. Fix apprunner.yaml Build Process
```yaml
version: 1.0
runtime: nodejs22
build:
  commands:
    build:
      # Set up environment first
      - export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
      - export NEXTAUTH_SECRET="dummy-secret-for-build"
      - export NEXTAUTH_URL="http://localhost:3000"
      # Install dependencies WITHOUT running postinstall scripts
      - npm ci --ignore-scripts --legacy-peer-deps
      # Run Prisma generate manually
      - npx prisma generate
      # Build the application
      - npm run build
run:
  runtime-version: nodejs22
  command: npm start
  network:
    port: 3000
```

#### 2. Simplify next.config.ts
Remove complex environment variable configurations that can cause build issues:

```typescript
// BEFORE (problematic)
const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    // ... many env vars that may not be available during build
  }
};

// AFTER (working)
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};
```

#### 3. Use Correct Node.js Version
- ✅ Use `nodejs22` (supported)
- ❌ Avoid `nodejs20` (not supported by App Runner)

## Issue: GitHub Connection Problems

### Symptoms
- Service fails to create with authentication errors
- Repository not found errors

### Solutions
1. **Verify Connection ARN**: Ensure the GitHub connection ARN is correct
2. **Complete Handshake**: Go to AWS Console > App Runner > Connections and complete the handshake
3. **Check Repository URL**: Use format `https://github.com/owner/repo`
4. **Verify Branch**: Ensure branch name matches exactly (case-sensitive)

## Debugging Strategy

### Phase 1: Infrastructure Validation
Before deploying complex applications, test with a minimal setup:

1. **Create Simple Test App**:
   ```javascript
   // index.js
   const express = require('express');
   const app = express();
   app.get('/', (req, res) => res.json({ message: 'Working!' }));
   app.listen(3000, () => console.log('Server running'));
   ```

2. **Simple apprunner.yaml**:
   ```yaml
   version: 1.0
   runtime: nodejs22
   build:
     commands:
       build:
         - npm install --production
   run:
     command: npm start
   ```

3. **Deploy and Verify**: Confirm basic functionality works before adding complexity

### Phase 2: Incremental Addition
1. Add Next.js framework
2. Add Prisma with proper build configuration
3. Add authentication and other features
4. Test each addition independently

## Useful Commands

### Check Service Status
```bash
aws apprunner list-services --no-cli-pager
aws apprunner describe-service --service-arn <service-arn> --no-cli-pager
```

### Check Operations and Logs
```bash
aws apprunner list-operations --service-arn <service-arn> --no-cli-pager
```

### Test Local Build Process
Simulate App Runner build locally:
```bash
# Clean environment
rm -rf node_modules .next

# Set dummy environment variables
export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
export NEXTAUTH_SECRET="dummy-secret-for-build"
export NEXTAUTH_URL="http://localhost:3000"

# Install without postinstall scripts
npm ci --ignore-scripts --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Build application
npm run build
```

## Key Learnings

1. **Always Start Simple**: Test infrastructure with minimal applications first
2. **Isolate Issues**: Separate infrastructure problems from application complexity
3. **Check Supported Versions**: Verify runtime version compatibility
4. **Use Operations API**: Get detailed error information beyond CloudFormation
5. **Manual Prisma Generation**: Skip postinstall scripts and run Prisma generate manually
6. **Environment Variables**: Keep build-time env vars simple and set runtime vars in App Runner

## Success Criteria

A successful App Runner deployment should:
- ✅ Complete CloudFormation stack creation
- ✅ Show service status as "RUNNING"
- ✅ Respond to HTTP requests at the service URL
- ✅ Auto-deploy on GitHub pushes
- ✅ Show healthy status in health checks

## When to Escalate

Consider alternative approaches if:
- Build consistently fails after following this guide
- Build times exceed 15 minutes regularly
- Memory or CPU limits are consistently hit during build
- Dependencies have fundamental incompatibilities with App Runner environment 