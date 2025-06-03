# 📚 NailIt Documentation

This directory contains all project documentation organized by category.

## 🚀 **Quick Start (Start Here)**

### **New to the Project?**
- **`QUICK_START_GUIDE.md`** - Essential project overview and immediate context
- **`SESSION_RESTORATION_CHECKLIST.md`** - Health check and troubleshooting guide

### **Lost Context?**
If you've lost session context or are picking up after a break:
1. Read `QUICK_START_GUIDE.md` for current state overview
2. Run the health check in `SESSION_RESTORATION_CHECKLIST.md`
3. Check the specific documentation categories below for details

---

## 📁 Directory Structure

### 🏗️ **Architecture**
- `CURRENT_INFRASTRUCTURE.md` - Current AWS infrastructure setup (ESSENTIAL)
- `SERVERLESS_ARCHITECTURE.md` - Serverless architecture design
- `FEATURE_BASED_MIGRATION_COMPLETE.md` - Migration to feature-based infrastructure
- `system-architecture-diagram.md` - Detailed architectural diagrams
- `aws-infrastructure-management-plan.md` - Future CDK implementation plans

### 🔐 **Authentication**
- `AUTHENTICATION_STATUS.md` - Current authentication implementation status
- `GOOGLE_OAUTH_SETUP.md` - Google OAuth configuration guide
- `SECURITY_NOTES.md` - Security considerations and notes

### 🚀 **Deployment**
- `CICD_IMPLEMENTATION_SUMMARY.md` - CI/CD pipeline implementation details (ESSENTIAL)
- `ENVIRONMENT_STRATEGY.md` - Three-environment setup strategy
- `ENVIRONMENT_VARIABLES.md` - Environment configuration guide
- `MULTI_ENVIRONMENT_SETUP.md` - Detailed environment setup
- `RESTORATION_ROADMAP.md` - Infrastructure restoration roadmap

### 💻 **Development**
- **`FEATURE_DEVELOPMENT_PLAYBOOK.md`** - **Complete feature workflow automation (ESSENTIAL)**
- `USER_STORIES.md` - Complete user stories for the application (ESSENTIAL)
- `BDD_USER_STORIES_MAPPING.md` - BDD test mapping to user stories
- `DATABASE.md` - Database schema and setup notes
- `NEON_DATABASE_SETUP.md` - Neon database configuration
- `MVP_CHANGES.md` - MVP feature changes and updates
- `TIMELINE_INTEGRATION.md` - Timeline feature integration notes

### 🧪 **Testing**
- `TESTING_PLAN.md` - Comprehensive testing strategy (ESSENTIAL)
- `TESTING_REFACTORING_GUIDE.md` - Guide for test refactoring
- `DATABASE_TESTING_STRATEGY.md` - Database testing approach
- `CICD_TEST_STRATEGY.md` - CI/CD testing strategy

---

## 🎯 Quick Navigation

### **I Need To...**
- **Start a new feature**: → `development/FEATURE_DEVELOPMENT_PLAYBOOK.md` 
- **Understand the current system**: → `QUICK_START_GUIDE.md`
- **Debug an issue**: → `SESSION_RESTORATION_CHECKLIST.md`
- **See the infrastructure**: → `architecture/CURRENT_INFRASTRUCTURE.md`
- **Understand the tests**: → `testing/TESTING_PLAN.md`
- **Know what features exist**: → `development/USER_STORIES.md`
- **Check CI/CD setup**: → `deployment/CICD_IMPLEMENTATION_SUMMARY.md`

### **For Development**
- **Feature Development**: → `development/FEATURE_DEVELOPMENT_PLAYBOOK.md` (**START HERE FOR NEW FEATURES**)
- **Getting Started**: See main [README.md](../README.md)
- **Development Setup**: See [development/](./development/)
- **Architecture Overview**: See [architecture/](./architecture/)
- **Testing Strategy**: See [testing/](./testing/)

### **For Troubleshooting**
- **Environment Issues**: See [deployment/ENVIRONMENT_STRATEGY.md](./deployment/ENVIRONMENT_STRATEGY.md)
- **Test Failures**: See [testing/DATABASE_TESTING_STRATEGY.md](./testing/DATABASE_TESTING_STRATEGY.md)
- **Authentication Problems**: See [authentication/AUTHENTICATION_STATUS.md](./authentication/AUTHENTICATION_STATUS.md)
- **Database Issues**: See [development/DATABASE.md](./development/DATABASE.md)

---

## 📊 **Current Project Status**

### **System Health (January 2025)**
- ✅ **3 Environments**: All operational (dev/staging/prod)
- ✅ **90+ Tests**: Comprehensive coverage with BDD
- ✅ **CI/CD Pipeline**: Industry-standard GitHub Actions
- ✅ **Database**: Neon PostgreSQL with branch-per-environment
- ✅ **Authentication**: Google OAuth fully implemented
- ✅ **Infrastructure**: AWS Amplify + serverless architecture
- ✅ **Feature Workflow**: Automated development playbook established

### **Key Metrics**
- **Test Success Rate**: 90+ tests passing (near 100%)
- **Infrastructure Cost**: ~$75/month savings with serverless migration
- **Deployment Pipeline**: 3-environment promotion workflow
- **Documentation**: 25+ organized documents
- **Development Efficiency**: Automated feature development workflow

---

## 📋 Contributing

When adding new documentation:
1. Place files in the appropriate category directory
2. Update this index if adding new categories or essential files
3. Use clear, descriptive filenames
4. Follow the existing documentation format
5. Mark essential files with (ESSENTIAL) in the index above
6. Consider updating `QUICK_START_GUIDE.md` if adding critical information
7. **For new features**: Follow `development/FEATURE_DEVELOPMENT_PLAYBOOK.md` 