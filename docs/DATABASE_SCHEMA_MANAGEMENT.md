# Database Schema Management Strategy

## What Happened: Root Cause Analysis

### The Problem
```
type "public.ProjectStatus" does not exist
```

### Why It Happened
1. **Schema Drift**: Prisma schema defined enums locally, but database didn't have them
2. **Missing Migration Step**: We ran `prisma generate` (client creation) but not `prisma db push` (schema sync)
3. **Deployment Gap**: AWS Amplify wasn't pushing schema changes to production database

### The Fix
Added `npx prisma db push --accept-data-loss` to deployment pipeline

## Best Practices Going Forward

### 1. Development Workflow
```bash
# When making schema changes:
1. Edit prisma/schema.prisma
2. npx prisma db push              # Push to dev database
3. npx prisma generate             # Regenerate client
4. Test locally
5. Commit changes
```

### 2. Production Deployment Strategy

#### Current Approach (Prototyping)
```yaml
# amplify.yml - Current
- npx prisma db push --accept-data-loss
- npx prisma generate
```
✅ **Good for**: Rapid prototyping, single developer
❌ **Risk**: Data loss, no rollback capability

#### Recommended for Production (Future)
```yaml
# amplify.yml - Production Ready
- npx prisma migrate deploy        # Apply committed migrations
- npx prisma generate
```

### 3. Migration Strategy Evolution

#### Phase 1: Current (Prototyping) ✅
- Use `prisma db push` for rapid iteration
- Acceptable for MVP development
- **Current Status**: Working

#### Phase 2: Production Ready (Next)
```bash
# Switch to formal migrations
npx prisma migrate dev --name initial-schema
npx prisma migrate dev --name add-team-members
```

Benefits:
- **Version Control**: All schema changes tracked
- **Rollback Capability**: Can revert problematic changes  
- **Team Collaboration**: Shared migration history
- **Data Safety**: No accidental data loss

## Schema Sync Monitoring

### 1. Pre-deployment Checks
```bash
# Add to CI/CD pipeline
npx prisma migrate status         # Check pending migrations
npx prisma db pull               # Verify schema matches
```

### 2. Schema Validation
```typescript
// Add to deployment health check
import { prisma } from '@/lib/prisma'

export async function validateSchema() {
  try {
    await prisma.user.findFirst()    // Test basic connectivity
    await prisma.project.findFirst() // Test enum types exist
    return { status: 'healthy' }
  } catch (error) {
    return { status: 'schema-mismatch', error }
  }
}
```

## Environment-Specific Strategies

### Development
```bash
DATABASE_URL="postgresql://dev-connection"
# Use: prisma db push (fast iteration)
```

### Staging
```bash
DATABASE_URL="postgresql://staging-connection"  
# Use: prisma migrate deploy (test migrations)
```

### Production
```bash
DATABASE_URL="postgresql://prod-connection"
DIRECT_URL="postgresql://prod-direct-connection"
# Use: prisma migrate deploy (safe, versioned)
```

## Monitoring & Alerting

### Schema Drift Detection
1. **Deployment Health Checks**: Validate schema after deployment
2. **Monitoring**: Track Prisma errors for schema issues
3. **Alerts**: Notify on schema-related deployment failures

### Backup Strategy
- **Pre-migration Backups**: Automatic backups before schema changes
- **Rollback Procedure**: Document steps to revert problematic migrations

## Emergency Procedures

### Schema Mismatch in Production
1. **Immediate**: Check deployment logs for Prisma errors
2. **Diagnose**: Compare Prisma schema vs actual database schema
3. **Fix Options**:
   - Hotfix: `prisma db push` for urgent fixes
   - Proper: Create migration and deploy
4. **Prevent**: Update monitoring to catch earlier

### Data Recovery
- Use Neon's point-in-time recovery
- Restore from pre-migration backup
- Replay safe migrations

## Tools & Commands Reference

### Essential Commands
```bash
# Schema Development
npx prisma db push              # Push schema changes (dev)
npx prisma generate             # Generate client
npx prisma studio               # GUI database browser

# Migration Management  
npx prisma migrate dev          # Create migration (dev)
npx prisma migrate deploy       # Apply migrations (prod)
npx prisma migrate status       # Check migration status

# Troubleshooting
npx prisma db pull              # Pull schema from database
npx prisma validate             # Validate schema file
npx prisma format               # Format schema file
```

### Useful Flags
```bash
--accept-data-loss     # Allow destructive changes
--force-reset          # Reset entire database
--skip-generate        # Skip client generation
--preview-feature      # Enable preview features
```

## Next Steps Recommendation

### Immediate (Current)
- ✅ `prisma db push` working in deployment
- ✅ Schema sync issues resolved
- ✅ Environment variables documented

### Short-term (Next 2-4 weeks)
- [ ] Switch to formal migrations (`prisma migrate`)
- [ ] Add schema validation to deployment pipeline
- [ ] Set up staging environment for migration testing

### Long-term (Production)
- [ ] Implement automated backups before migrations
- [ ] Add schema drift monitoring
- [ ] Create rollback procedures documentation 