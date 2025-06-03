# Database Testing Strategy for NailIt

## Overview
This document outlines the database testing approaches for NailIt, from unit tests with mocked data to integration tests with real database connections.

---

## 🎯 **Current Database Testing Relationship**

### **Test Types & Database Interaction**

| Test Type | Database Relationship | Data Requirements | Current Status |
|-----------|----------------------|-------------------|----------------|
| **Unit Tests** | None (Mocked) | Mock objects only | ✅ Implemented |
| **Integration Tests** | Mocked Prisma | Fixture data | ✅ Implemented |
| **BDD Tests** | Mocked Prisma | Scenario-specific data | ✅ Implemented |
| **E2E Tests** | Real Database | Test database instance | 📋 Planned |

---

## 📊 **Database Testing Approaches**

### **1. Mocked Database (Current - Unit/Integration)**

**✅ What we're doing:**
```javascript
// Mock Prisma client entirely
jest.mock('../../../app/lib/prisma', () => ({
  prisma: {
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

// Define test data in-memory
const testProjects = [
  {
    id: 'project-1',
    name: 'Kitchen Renovation',
    userId: 'user-123',
    // ... rest of project data
  }
]
```

**Benefits:**
- Fast execution (no database I/O)
- Isolated tests (no shared state)
- Predictable data scenarios
- Works offline

**Limitations:**
- Doesn't test actual Prisma queries
- Doesn't catch database-specific issues
- Schema changes not validated
- Complex query logic not tested

### **2. Test Database (Recommended for E2E)**

**🔄 What we should add:**
```javascript
// Use real Prisma client against test database
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/nailit_test'

beforeEach(async () => {
  // Reset test database to known state
  await prisma.user.deleteMany()
  await prisma.project.deleteMany()
  
  // Load test fixtures
  await loadTestFixtures()
})
```

**Benefits:**
- Tests actual database interactions
- Validates Prisma queries
- Catches schema issues
- Tests database constraints

**Requirements:**
- Separate test database instance
- Database reset between tests
- Test data fixtures

### **3. In-Memory Database (Alternative)**

**🔄 Alternative approach:**
```javascript
// Use SQLite in-memory for fast tests
const testDatabaseUrl = 'file::memory:?cache=shared'
```

**Benefits:**
- Real database behavior
- Very fast (in-memory)
- No external dependencies
- Easy CI/CD setup

**Limitations:**
- SQLite vs PostgreSQL differences
- Limited for complex queries

---

## 🗂️ **Test Data Requirements**

### **Current Fixture Strategy**

We define test data **inline with each test**:
```javascript
// BDD Test Example
const userProjects = [
  {
    id: 'project-1',
    name: 'Kitchen Renovation',
    userId: 'user-123',
    user: { id: 'user-123', name: 'John Doe' },
    emailSettings: { enabled: true },
    _count: {
      flaggedItems: 3,
      timelineEntries: 7,
    },
  }
]
```

### **Recommended: Centralized Test Fixtures**

**Create organized test data:**
```javascript
// tests/fixtures/users.ts
export const testUsers = {
  john: {
    id: 'user-123',
    email: 'john@example.com',
    name: 'John Homeowner',
  },
  jane: {
    id: 'user-456', 
    email: 'jane@example.com',
    name: 'Jane Designer',
  }
}

// tests/fixtures/projects.ts
export const testProjects = {
  kitchenReno: {
    id: 'project-1',
    name: 'Kitchen Renovation',
    userId: 'user-123',
    contractor: 'Mike Johnson Construction',
    budget: 75000,
    status: 'ACTIVE',
  }
}

// tests/fixtures/index.ts
export const fixtures = {
  users: testUsers,
  projects: testProjects,
  // Utility functions
  createProject: (overrides) => ({ ...testProjects.kitchenReno, ...overrides }),
  createUser: (overrides) => ({ ...testUsers.john, ...overrides }),
}
```

---

## 🏗️ **Implementation Recommendations**

### **Phase 1: Improve Current Mocked Tests (Immediate)**

1. **Centralize Test Fixtures**
   ```bash
   mkdir tests/fixtures
   # Create reusable test data
   ```

2. **Standardize Mock Patterns**
   ```javascript
   // tests/helpers/mockPrisma.ts
   export const createMockPrisma = () => ({
     project: {
       count: jest.fn(),
       findMany: jest.fn(),
       create: jest.fn(),
       update: jest.fn(),
     },
     user: {
       findUnique: jest.fn(),
       create: jest.fn(),
     }
   })
   ```

3. **Add BDD Test Data Helpers**
   ```javascript
   // tests/bdd/helpers/testData.ts
   export const givenUserHasProjects = (userId: string, count: number) => {
     const projects = Array.from({length: count}, (_, i) => 
       fixtures.createProject({ id: `project-${i}`, userId })
     )
     mockPrisma.project.findMany.mockResolvedValue(projects)
     return projects
   }
   ```

### **Phase 2: Add Test Database for E2E (Next)**

1. **Setup Test Database Environment**
   ```bash
   # Add to .env.test
   TEST_DATABASE_URL="postgresql://test:test@localhost:5432/nailit_test"
   ```

2. **Create Database Test Utilities**
   ```javascript
   // tests/helpers/database.ts
   export const resetTestDatabase = async () => {
     await prisma.project.deleteMany()
     await prisma.user.deleteMany()
   }
   
   export const seedTestData = async () => {
     const user = await prisma.user.create({ data: fixtures.users.john })
     const project = await prisma.project.create({ 
       data: { ...fixtures.projects.kitchenReno, userId: user.id }
     })
     return { user, project }
   }
   ```

3. **E2E Test Setup**
   ```javascript
   // tests/e2e/database.test.ts
   describe('Database Integration', () => {
     beforeEach(async () => {
       await resetTestDatabase()
     })
     
     test('Should create and retrieve projects', async () => {
       // Real database operations
       const { user, project } = await seedTestData()
       
       // Test actual API with real data
       const response = await fetch('/api/projects', {
         headers: { /* authenticated headers */ }
       })
       
       const projects = await response.json()
       expect(projects).toHaveLength(1)
       expect(projects[0].name).toBe('Kitchen Renovation')
     })
   })
   ```

---

## 📋 **Specific Data Requirements by Test Type**

### **BDD Tests (Current)**
**Data Needs:**
- User authentication states (authenticated/unauthenticated)
- Project ownership scenarios (user has projects/no projects)
- API response formats matching Prisma schema
- Error scenarios (database failures)

**Current Approach:** ✅ Well-implemented with mocked data

### **User Story Tests**
**Data Needs:**
- Project creation workflows (form data validation)
- Team member relationships (contractor, architect, PM)
- Email monitoring settings
- Account profile data synced with Google

**Recommendation:** Continue with mocked data, add fixtures

### **Integration Tests**
**Data Needs:**
- Complex Prisma queries with joins and counts
- Database constraint validation
- Transaction rollback scenarios
- Performance with realistic data volumes

**Recommendation:** Add test database for critical paths

### **E2E Tests (Future)**
**Data Needs:**
- Full user journey data (signup → project creation → email monitoring)
- Gmail integration test accounts
- AI classification test emails
- Multi-project, multi-user scenarios

**Recommendation:** Dedicated test database with rich fixtures

---

## 🛠️ **Implementation Plan**

### **Week 1: Fixture Organization**
```bash
# Create centralized test fixtures
mkdir tests/fixtures
touch tests/fixtures/{users,projects,flaggedItems,index}.ts

# Refactor existing tests to use fixtures
# Update BDD tests to use shared data
```

### **Week 2: Enhanced Mocking**
```bash
# Create reusable mock utilities
mkdir tests/helpers
touch tests/helpers/{mockPrisma,testData}.ts

# Add BDD data helper functions
# Standardize mock patterns across tests
```

### **Week 3: Test Database Setup**
```bash
# Setup test database configuration
# Create database utilities
# Add E2E test foundation
```

---

## 💡 **Key Insights**

### **✅ Current Strengths**
- **Fast test execution** with mocked database
- **Isolated test scenarios** without shared state
- **Good BDD coverage** of user story scenarios
- **Comprehensive API testing** with proper mocking

### **🔄 Areas for Enhancement**
- **Centralized test fixtures** for consistency
- **Database integration testing** for complex queries
- **Schema validation** with real Prisma operations
- **Performance testing** with realistic data volumes

### **📊 Test Data Complexity**

| Test Type | Data Complexity | Database Connection | Current Status |
|-----------|----------------|-------------------|----------------|
| Unit Tests | Simple objects | None | ✅ Sufficient |
| BDD Tests | Scenario-specific | Mocked | ✅ Good |
| Integration Tests | Complex relationships | Mocked | 🟡 Could improve |
| E2E Tests | Full user journeys | Real | 📋 Not implemented |

---

**Bottom Line:** Our current mocked approach is excellent for the tests we have. For true integration and E2E testing, we'll want a dedicated test database with rich fixtures. 