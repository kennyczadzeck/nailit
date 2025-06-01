# Neon Database Setup & Branch Management

## 🗄️ **Database Branch Structure**

### Current Setup
```
🏗️ Project: Nailit (falling-glade-40364957)
├── 🟢 production (br-yellow-mouse-a5c2gnvp) - Main/Default branch
├── 🟠 staging (br-lively-brook-a5wck55u) - Pre-production testing  
├── 🔵 development (br-late-wildflower-a5s97ll8) - Development branch
└── 📦 Feature branches (created as needed)
```

## 🔗 **Connection Strings by Environment**

### Production Environment
```bash
# Pooled connection (for application)
DATABASE_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Direct connection (for migrations) 
DIRECT_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Branch ID: br-yellow-mouse-a5c2gnvp
```

### Staging Environment  
```bash
# Pooled connection (for application)
DATABASE_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Direct connection (for migrations)
DIRECT_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Branch ID: br-lively-brook-a5wck55u
```

### Development Environment
```bash
# Pooled connection (for application)
DATABASE_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Direct connection (for migrations)
DIRECT_URL="postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Branch ID: br-late-wildflower-a5s97ll8
```

## 🚀 **Neon MCP Integration Benefits**

With Neon MCP now connected, we can automate:

### 1. **Feature Branch Creation**
```bash
# When creating a new feature
git checkout -b feature/email-monitoring

# Automatically create matching database branch
# neon.createBranch({
#   name: "feature-email-monitoring", 
#   parent: "production"
# })
```

### 2. **Schema Testing Workflow**
```bash
# 1. Create feature database branch
# 2. Apply schema changes with prisma db push
# 3. Test with real data copy from production
# 4. Create formal migration
# 5. Apply to staging for final testing
# 6. Promote to production
```

### 3. **Data Management**
- **Reset development data** from production snapshots
- **Create test datasets** for different scenarios  
- **Branch cleanup** when features are merged

## 📋 **AWS Amplify Environment Configuration**

### Required Environment Variables by Environment

#### Production (main branch)
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-misty-frog-a5pcr9pt.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://main.d1rq0k9js5lwg3.amplifyapp.com
```

#### Staging (staging branch) 
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-raspy-sound-a5eg97xu.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://staging.[future-domain].amplifyapp.com
```

#### Development (develop branch)
```bash
DATABASE_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
DIRECT_URL=postgresql://neondb_owner:npg_avELx8uqOAc0@ep-still-paper-a5tgtem8.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=https://develop.[future-domain].amplifyapp.com
```

## 🛠️ **Next Steps with Neon MCP**

### Immediate Actions
1. ✅ **Staging branch created** via MCP
2. 📋 **Configure AWS Amplify environments** with connection strings above
3. 📋 **Test schema sync** between branches
4. 📋 **Create automated branch management** workflows

### Advanced Automation (Future)
1. **Auto-create database branches** when git branches are created
2. **Schema diff reports** in pull requests
3. **Automated data refreshes** for development/staging
4. **Migration impact analysis** before production deployment

## 🔧 **Common Operations**

### Create Feature Database Branch
```typescript
// Via MCP integration
await neon.createBranch({
  projectId: "falling-glade-40364957",
  branchName: "feature-new-dashboard", 
  // Inherits from production branch by default
})
```

### Reset Development Data
```bash
# Delete and recreate development branch from production
# This gives fresh data copy for testing
```

### Cleanup Old Feature Branches
```typescript
// Remove database branches for merged features
await neon.deleteBranch({
  projectId: "falling-glade-40364957",
  branchId: "br-old-feature-xyz"
})
```

## 📊 **Branch Management Best Practices**

### Branch Lifecycle
1. **Create**: Feature branch from production
2. **Develop**: Schema changes with `prisma db push`
3. **Migrate**: Create formal migration with `prisma migrate dev`
4. **Test**: Apply migration to staging branch
5. **Deploy**: Apply migration to production branch
6. **Cleanup**: Delete feature branch after merge

### Naming Conventions
- **Production**: `production` (main branch)
- **Staging**: `staging` (pre-production)
- **Development**: `development` (integration)
- **Features**: `feature-{description}` (temporary) 