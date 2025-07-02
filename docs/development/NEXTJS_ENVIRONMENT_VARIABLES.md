# Next.js Environment Variables in Production Builds

## Overview

This document captures critical issues and solutions related to Next.js environment variable handling in production builds, particularly in Docker deployments.

## The Problem: Next.js Production Optimizations

### What Happens in Production Builds

Next.js performs aggressive optimizations in production builds that can break dynamic environment variable access:

1. **process.env Object Optimization**: Next.js optimizes away the `process.env` object in client-side bundles
2. **Static Analysis**: Only variables directly referenced in code are embedded
3. **Dynamic Access Breaks**: `process.env[variableName]` returns `undefined`
4. **Direct Access Works**: `process.env.VARIABLE_NAME` works correctly

### Example of the Issue

```typescript
// ❌ BROKEN: Dynamic access in production builds
const value = process.env[variableName]; // Returns undefined

// ✅ WORKS: Direct access in production builds  
const value = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // Returns actual value

// ❌ BROKEN: Object.keys() is empty in production
Object.keys(process.env); // Returns []

// ✅ WORKS: Direct property check
!!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // Returns true/false correctly
```

## Symptoms

### Debug Console Output
```
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "AIzaSy..." ✅ Works
All process.env keys: [] ❌ Empty array
NEXT_PUBLIC keys: [] ❌ Empty array
Environment variable NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured ❌ False warning
```

### User-Facing Issues
- Environment variables appear available on server but not client
- Dynamic environment variable checks fail
- Conditional rendering based on env vars shows fallback UI
- Google Maps API key "not found" despite being correctly configured

## Root Cause Analysis

### Next.js Build Process
1. **Build Time**: Environment variables are correctly available during `npm run build`
2. **Bundle Generation**: Next.js only embeds directly referenced variables
3. **Runtime Optimization**: `process.env` object is optimized away
4. **Client Bundle**: Only direct property access works

### Docker vs Local Development
- **Local Development**: `process.env` object remains intact
- **Docker Production**: Next.js optimizations are more aggressive
- **Server vs Client**: Server-side has full `process.env`, client-side is optimized

## Solution: Update Dynamic Access Patterns

### Before (Broken in Production)
```typescript
export function checkEnvironmentVariable(name: string): boolean {
  const value = process.env[name]; // ❌ Returns undefined in production
  return !!value && value.length > 0;
}
```

### After (Works in Production)
```typescript
export function checkEnvironmentVariable(name: string): boolean {
  let value: string | undefined;
  
  // Handle Next.js optimized builds where dynamic property access fails
  // but direct property access works
  switch (name) {
    case 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY':
      value = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; // ✅ Direct access
      break;
    case 'NEXT_PUBLIC_BUILD_TIME':
      value = process.env.NEXT_PUBLIC_BUILD_TIME; // ✅ Direct access
      break;
    default:
      value = process.env[name]; // Fallback for server-side or non-optimized cases
      break;
  }
  
  return !!value && value.length > 0;
}
```

## Best Practices

### 1. Always Use Direct Property Access
```typescript
// ✅ GOOD: Direct access
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// ❌ AVOID: Dynamic access in production
const apiKey = process.env[keyName];
```

### 2. Avoid Dynamic Environment Variable Enumeration
```typescript
// ❌ AVOID: Will be empty in production
const allEnvVars = Object.keys(process.env);

// ✅ GOOD: Check specific variables directly
const hasApiKey = !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
```

### 3. Use Switch Statements for Dynamic Checks
```typescript
// ✅ GOOD: Switch statement with direct access
function getEnvVar(name: string) {
  switch (name) {
    case 'NEXT_PUBLIC_API_KEY': return process.env.NEXT_PUBLIC_API_KEY;
    case 'NEXT_PUBLIC_APP_URL': return process.env.NEXT_PUBLIC_APP_URL;
    default: return undefined;
  }
}
```

## Docker Configuration

### Dockerfile Environment Variables
Ensure NEXT_PUBLIC variables are available during build:

```dockerfile
# Accept build arguments
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Set environment variables from build arguments
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

# Include in build command
RUN NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY" \
    npm run build
```

### GitHub Actions
Pass variables as build arguments:

```yaml
build-args: |
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${{ secrets.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY }}
```

## Testing and Debugging

### Client-Side Debug Code
```typescript
useEffect(() => {
  console.log('🔍 Environment Variable Debug:');
  console.log('Direct access:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  console.log('Object keys:', Object.keys(process.env));
  console.log('NEXT_PUBLIC keys:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
}, []);
```

### Expected Production Output
```
Direct access: "AIzaSy..." ✅ Has value
Object keys: [] ✅ Empty (expected in production)
NEXT_PUBLIC keys: [] ✅ Empty (expected in production)
```

## Related Issues

### Google Maps API Referrer Restrictions
When using App Runner URLs, ensure API key restrictions include wildcards:
- ✅ `https://u9eack5h4f.us-east-1.awsapprunner.com/*`
- ❌ `https://u9eack5h4f.us-east-1.awsapprunner.com` (root only)

### Next.js Version Considerations
- **Next.js 13+**: More aggressive optimizations
- **App Router**: Different optimization patterns than Pages Router
- **Standalone Output**: Additional optimizations in Docker builds

## Conclusion

Next.js production optimizations can break dynamic environment variable access while preserving direct access. Always use direct property access for NEXT_PUBLIC variables in client-side code, and implement switch statements for dynamic checks.

## References

- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [Next.js Runtime Configuration](https://nextjs.org/docs/api-reference/next.config.js/runtime-configuration)
- [Docker Multi-stage Builds with Next.js](https://nextjs.org/docs/deployment#docker-image) 