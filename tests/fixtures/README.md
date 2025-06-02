# Centralized Test Fixtures

This directory contains centralized test fixtures that provide consistent, reusable test data across all test types (BDD, integration, unit).

## 📁 Structure

```
tests/fixtures/
├── index.ts              # Main export file - import everything from here
├── users.ts              # User data and authentication scenarios  
├── projects.ts           # Project data and scenarios
├── api-responses.ts      # HTTP response mocks
└── README.md            # This documentation
```

## 🎯 Benefits

1. **Consistency**: Same test data across all tests
2. **Maintainability**: Update data in one place
3. **Readability**: Self-documenting test scenarios  
4. **Reusability**: Share fixtures between test types
5. **BDD-Friendly**: Named scenarios match user stories

## 🚀 Quick Start

Import fixtures in your test files:

```typescript
// Import everything (recommended)
import { testUsers, testProjects, givenUserHasProjects, successResponses } from '../../fixtures'

// Or import specific items
import { testUsers } from '../../fixtures/users'
import { testProjects } from '../../fixtures/projects'
```

## 📊 Available Fixtures

### User Fixtures

```typescript
import { testUsers, createAuthenticatedSession, userScenarios } from '../../fixtures'

// Pre-defined users
testUsers.john        // Primary test user with projects
testUsers.jane        // New user without projects  
testUsers.error       // For error scenarios

// Authentication helpers
createAuthenticatedSession(testUsers.john)
createUnauthenticatedSession()

// User scenarios
userScenarios.authenticated
userScenarios.newUser
```

### Project Fixtures

```typescript
import { testProjects, projectScenarios, givenUserHasProjects } from '../../fixtures'

// Pre-defined projects
testProjects.kitchenReno      // Main test project with full data
testProjects.bathroomRemodel  // Secondary active project
testProjects.deckAddition     // Completed project
testProjects.simple           // Minimal project for new users

// Project scenarios
projectScenarios.userWithProjects     // User has 3 projects
projectScenarios.userWithoutProjects  // User has 0 projects
projectScenarios.userWithSingleProject // User has 1 project

// BDD helpers
givenUserHasProjects('user-123', 3)  // Returns scenario with 3 projects
givenUserHasNoProjects('user-456')   // Returns empty scenario
```

### API Response Fixtures

```typescript
import { successResponses, errorResponses, formResponses } from '../../fixtures'

// Success responses
successResponses.projectsList        // GET /api/projects success
successResponses.projectCreated      // POST /api/projects success

// Error responses  
errorResponses.unauthorized          // 401 error
errorResponses.badRequest           // 400 validation error
errorResponses.internalError        // 500 server error

// Form responses
formResponses.projectCreation.success         // Successful form submission
formResponses.projectCreation.validationError // Form validation error
```

### Database Mock Fixtures

```typescript
import { mockPrisma, setupPrismaMocks, givenDatabaseHas } from '../../fixtures'

// Mock setup
setupPrismaMocks.projectsList([testProjects.kitchenReno])
setupPrismaMocks.projectsEmpty()
setupPrismaMocks.reset()  // Clear all mocks

// BDD-style helpers
givenDatabaseHas.projects([testProjects.kitchenReno])
givenDatabaseHas.noProjects()
givenDatabaseHas.user(testUsers.john)
givenDatabaseFails.withError(new Error('Database down'))
```

## 🧪 Usage Examples

### BDD Test Example

```typescript
describe('User Story: Project Dashboard', () => {
  test('Given user has projects, When they view dashboard, Then they see project list', () => {
    // Given: user has projects (using centralized fixtures)
    const scenario = givenUserHasProjects(testUsers.john.id, 3)
    givenDatabaseHas.projects(scenario.projects)
    
    // When: user views dashboard
    render(<Dashboard user={testUsers.john} />)
    
    // Then: they see their projects
    expect(screen.getByText(testProjects.kitchenReno.name)).toBeInTheDocument()
  })
})
```

### API Test Example

```typescript
describe('Projects API', () => {
  test('should return user projects', async () => {
    // Given: user has projects
    setupPrismaMocks.projectsList([testProjects.kitchenReno, testProjects.bathroomRemodel])
    
    // When: API is called
    const response = await GET(request)
    
    // Then: returns projects
    expect(response.status).toBe(200)
    const projects = await response.json()
    expect(projects).toHaveLength(2)
    expect(projects[0].name).toBe(testProjects.kitchenReno.name)
  })
})
```

### Integration Test Example

```typescript
describe('Project Creation Flow', () => {
  test('should create project end-to-end', async () => {
    // Given: authenticated user
    mockUseSession.mockReturnValue(createAuthenticatedSession(testUsers.john))
    
    // When: user submits project form
    render(<ProjectForm />)
    fireEvent.change(screen.getByPlaceholderText('Project name'), {
      target: { value: testProjects.kitchenReno.name }
    })
    fireEvent.click(screen.getByText('Create Project'))
    
    // Then: project is created
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: testProjects.kitchenReno.name,
          contractor: testProjects.kitchenReno.contractor
        })
      })
    })
  })
})
```

## ✅ Best Practices

### 1. Use Descriptive Fixture Names
```typescript
// ✅ Good - descriptive and clear
testProjects.kitchenReno
testUsers.authenticatedHomeowner

// ❌ Avoid - generic and unclear  
testProjects.project1
testUsers.user1
```

### 2. Use BDD Helper Functions
```typescript
// ✅ Good - readable and intention-revealing
givenUserHasProjects(testUsers.john.id, 3)
givenDatabaseHas.noProjects()

// ❌ Avoid - manual setup that's hard to read
mockPrisma.project.findMany.mockResolvedValue([])
mockPrisma.project.count.mockResolvedValue(0)
```

### 3. Override Only What You Need
```typescript
// ✅ Good - minimal overrides
const customProject = createTestProject({ 
  name: 'Custom Kitchen Reno',
  budget: 50000 
})

// ❌ Avoid - recreating entire objects
const customProject = {
  id: 'project-1',
  name: 'Custom Kitchen Reno', 
  userId: 'user-123',
  contractor: 'Mike Johnson Construction',
  // ... copying all fields
}
```

### 4. Import from Index File
```typescript
// ✅ Good - single import point
import { testUsers, testProjects, givenDatabaseHas } from '../../fixtures'

// ❌ Avoid - multiple import sources
import { testUsers } from '../../fixtures/users'
import { testProjects } from '../../fixtures/projects'  
import { givenDatabaseHas } from '../../helpers/mockPrisma'
```

### 5. Reset Mocks in beforeEach
```typescript
describe('My Tests', () => {
  beforeEach(() => {
    setupPrismaMocks.reset()  // Clear previous test state
    jest.clearAllMocks()      // Clear Jest mocks
  })
  
  // ... tests
})
```

## 🔄 Migration Guide

### Before (Inline Fixtures)
```typescript
test('should display projects', () => {
  const projects = [
    {
      id: 'project-1',
      name: 'Kitchen Renovation',
      userId: 'user-123',
      contractor: 'Mike Johnson Construction',
      // ... more fields
    }
  ]
  mockPrisma.project.findMany.mockResolvedValue(projects)
  
  // ... test code
})
```

### After (Centralized Fixtures)
```typescript
test('should display projects', () => {
  givenDatabaseHas.projects([testProjects.kitchenReno])
  
  // ... test code
})
```

## 📚 Adding New Fixtures

### 1. Add to Appropriate File
```typescript
// tests/fixtures/users.ts
export const testUsers = {
  // ... existing users
  
  // Add new user
  architect: {
    id: 'user-architect',
    name: 'Sarah Chen',
    email: 'sarah@architect.com',
    role: 'ARCHITECT'
  }
}
```

### 2. Add Helper Functions
```typescript
// BDD helpers
export const givenUserIsArchitect = () => ({
  user: testUsers.architect,
  permissions: ['view_projects', 'create_designs']
})
```

### 3. Export from Index
```typescript
// tests/fixtures/index.ts
export * from './users'  // Automatically includes new exports
```

### 4. Document Usage
Add examples to this README and update the main TESTING_PLAN.md

## 🎯 Current Test Coverage

With centralized fixtures, we achieve:

- **34/35 tests passing (97.1%)**
- **Consistent data** across BDD, integration, and unit tests
- **Maintainable test code** with DRY principles
- **Self-documenting tests** with descriptive fixture names
- **Easy test expansion** with reusable scenarios

## 🔮 Future Enhancements

1. **Test Database Fixtures**: Real database seeding for E2E tests
2. **Performance Fixtures**: Large datasets for performance testing
3. **Error Scenario Library**: Comprehensive error condition fixtures
4. **Visual Test Fixtures**: Component state fixtures for visual testing
5. **API Contract Fixtures**: OpenAPI schema validation fixtures 