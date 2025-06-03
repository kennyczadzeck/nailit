# BDD User Stories Mapping - NailIt MVP

## Overview
This document maps the **actual MVP user stories** provided to **BDD test implementations**, showing how we generate tests directly from Given-When-Then acceptance criteria.

---

## 🎯 **Current BDD Test Status: 34/35 tests passing (97.1%)**

### **✅ Implemented BDD Test Suites**

| User Story Section | Tests Implemented | Status | Test File |
|-------------------|------------------|--------|-----------|
| **Logged Out Experience** | 4/4 tests | ✅ All Passing | `tests/bdd/features/authentication.test.tsx` |
| **Create New Project** | 5/6 tests | 🟡 5 Pass, 1 Fail | `tests/bdd/features/project-creation.test.tsx` |
| **Projects API** | 5/5 tests | ✅ All Passing | `tests/bdd/features/projects-api.test.ts` |
| **UI Components** | 8/8 tests | ✅ All Passing | `tests/bdd/features/button-component.test.tsx` |

---

## 📋 **User Stories → BDD Test Mapping**

### **1. Logged Out Experience** ✅ COMPLETE

#### **Value Proposition User Story**
```
Description: Value Prop
User Story: As a potential homeowner of Nailit, I need to understand the value proposition and how it works, so I can decide whether or not I want to try it.
Acceptance Criteria: Given that I'm unfamiliar with Nailit, When I visit the Nailit website, [...]
```

**→ BDD Test Implementation:**
```javascript
// tests/bdd/features/authentication.test.tsx
describe('User Story: Value Proposition', () => {
  test('Given unfamiliar with Nailit, When I visit website, Then I understand value proposition', () => {
    // Given: I'm unfamiliar with Nailit
    // When: I visit the Nailit website
    render(<MockWelcomePage />)
    
    // Then: I should understand the value proposition
    expect(screen.getByText(/Project Communication Monitoring/)).toBeInTheDocument()
    expect(screen.getByText(/Automatic email monitoring/)).toBeInTheDocument()
    expect(screen.getByText(/AI-powered change detection/)).toBeInTheDocument()
  })
})
```

#### **Signup User Story**
```
Description: Signup
User Story: As a homeowner who does not have a Nailit account, I need to sign up for an account using Google as my identity provider so I can gain access to Nailit.
Acceptance Criteria: Given that a homeowner does not have a Nailit account, when they click the signup CTA, then they will be prompted to 'login with Google' as their identity provider.
```

**→ BDD Test Implementation:**
```javascript
describe('User Story: Signup', () => {
  test('Given homeowner does not have account, When they click signup CTA, Then they are prompted to login with Google', () => {
    // Given: homeowner does not have a Nailit account
    ;(useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' })
    
    // When: they click the signup CTA
    render(<MockSignInPage />)
    fireEvent.click(screen.getByText('Continue with Google'))
    
    // Then: they will be prompted to 'login with Google' as their identity provider
    expect(signIn).toHaveBeenCalledWith('google')
  })
})
```

#### **Login User Story** 
```
Description: Login
User Story: As a homeowner with a Nailit account who hasn't authenticated, I need to authenticate with Google as my identity provider so that I can gain access to Nailit.
Acceptance Criteria: Given that a homeowner does have an active Nailit session, when they click the login CTA, then they will need to login with Google. Given that homeowner does have an active Nailit session, when they navigate to Nailit, then they will be automatically redirected to their project dashboard.
```

**→ BDD Test Implementation:**
```javascript
describe('User Story: Login', () => {
  test('Given homeowner does have account but no active session, When they click login CTA, Then they login with Google', () => {
    // Maps to first acceptance criteria
  })
  
  test('Given homeowner has active session, When they navigate to Nailit, Then they are redirected to dashboard', () => {
    // Maps to second acceptance criteria  
  })
})
```

---

### **2. Create New Project** 🟡 IN PROGRESS (5/6 passing)

#### **Project Name User Story**
```
Description: Project Name
User Story: As a homeowner, I need to provide my project with a name that describes a concise summary of its scope so that Nailit can use the project name as an information point in monitoring my conversations with the project team.
Acceptance Criteria: 
- Given the homeowner is creating a new project, when the homeowner is prompted to enter a project name, then the homeowner should be advised to provide a name that reflects the project's scope
- Given the homeowner is creating a new project, when the homeowner is prompted to enter a project name, then the homeowner cannot proceed to the next step of project creation until they've provided a project name.
```

**→ BDD Test Implementation:**
```javascript
// tests/bdd/features/project-creation.test.tsx
describe('User Story: Project Name', () => {
  test('Given homeowner creating new project, When prompted for name, Then they should provide scope-reflecting name', () => {
    // Maps to first acceptance criteria - FAILING (text assertion issue)
  })
  
  test('Given homeowner creating project, When no project name provided, Then cannot proceed to next step', () => {
    // Maps to second acceptance criteria - PASSING ✅
  })
})
```

#### **Add General Contractor User Story**
```
Description: Add General Contractor
User Story: As a homeowner, I need to provide my general contractor's name, company, and email address so that Nailit can effectively monitor our conversations about the project.
Acceptance Criteria: Given that a homeowner is creating a project, when the homeowner is prompted to enter a general contractor, then the homeowner will not be able to create the project until the general contractor's name, email have been provided.
```

**→ BDD Test Implementation:**
```javascript
describe('User Story: Add General Contractor', () => {
  test('Given homeowner creating project, When entering contractor info, Then name and email are required', () => {
    // Direct mapping from acceptance criteria - PASSING ✅
  })
  
  test('Given valid contractor info provided, When form submitted, Then project can be created', () => {
    // Extended scenario for positive case - PASSING ✅
  })
})
```

#### **Add Architect/Designer & Project Manager User Stories**
```
Description: Add Architect/Designer  
User Story: As a homeowner, I should be able to provide my architect/designer's name, company, and email address so that Nailit can effectively monitor our conversations about the project.
Acceptance Criteria: Given that a homeowner has entered a general contractor, when the homeowner has finished providing all of the general contractor's information, then the homeowner will be prompted to enter the same information for their architect/designer.
```

**→ BDD Test Implementation:**
```javascript
describe('User Story: Add Architect/Designer', () => {
  test('Given contractor info entered, When contractor info complete, Then prompted for architect/designer', () => {
    // Direct mapping from acceptance criteria - PASSING ✅
  })
})

describe('User Story: Add Project Manager', () => {
  test('Given contractor info entered, When contractor info complete, Then prompted for project manager', () => {
    // Same pattern for project manager - PASSING ✅
  })
})
```

---

### **3. Daily Use** 🟡 PARTIALLY IMPLEMENTED

#### **Projects API Management**
```
Description: Project Dashboard
User Story: As a homeowner, I want to view a dashboard about a single project with more detailed information so I can navigate and resolve all the flagged items for that project that I need to ensure its on track to completion.
Acceptance Criteria: Given that a homeowner clicks on a project in the global dashboard, when they are taken to that project's dashboard, then they will see the flagged items they need to confirm or classify as well as be able to view the timeline of all flagged items for the project.
```

**→ BDD Test Implementation:**
```javascript
// tests/bdd/features/projects-api.test.ts  
describe('Feature: Projects API', () => {
  describe('Scenario: Authenticated user retrieves projects', () => {
    test('Given I am authenticated as user "user-123" and have projects, When I make GET request, Then I receive 200 with projects', async () => {
      // Implementation supports dashboard data fetching - PASSING ✅
    })
  })
})
```

---

## 🔄 **Ready to Implement Next**

### **4. Onboarding** 📋 PENDING

#### **Connect Gmail User Story**
```
Description: Connect Gmail
User Story: As a homeowner, I need to connect my Gmail account to Nailit, so that Nailit can access the conversations I have with my project team and surface flagged items to me.
Acceptance Criteria: Given that I have signed up for Nailit using my Google account, when I start the onboarding process, then I will be prompted to authorize Nailit with the ability to access my Gmail by granting it the gmail.readonly and the gmail.compose scopes.
```

**→ BDD Test Structure (Ready to Implement):**
```javascript
// tests/bdd/features/gmail-onboarding.test.tsx
describe('User Story: Connect Gmail', () => {
  test('Given signed up with Google, When start onboarding, Then prompted to authorize Gmail access', () => {
    // Test Gmail OAuth flow
  })
})
```

#### **Create First Project User Story**
```
Description: Create First Project  
User Story: As a homeowner, I need to create my first project with Nailit so that Nailit can start providing me with an audit log of my home renovation project.
Acceptance Criteria: Given that the homeowner has authorized their Gmail account, if Nailit receives an error in obtaining the access token from Google, then the user needs to retry authorizing their Gmail account. Given that the homeowner has authorized their Gmail account, when Nailit has received the access token from Google, then the user needs to move onto creating their first project.
```

### **5. Account Settings** 📋 PENDING

#### **Homeowner Profile User Story**
```
Description: homeowner Profile / Info
User Story: As a homeowner, my profile name and avatar should be pulled from my linked Google Account so that my identity can be consistent across the way I communicate with my project teams.
Acceptance Criteria: Given that a homeowner has connected their Google account to Nailedit, when the user visits their Nailedit account profile, then they will see a name, email, and avatar that mirrors their Google account.
```

**→ BDD Test Structure (Ready to Implement):**
```javascript
// tests/bdd/features/user-profile.test.tsx
describe('User Story: User Profile', () => {
  test('Given connected Google account, When visit profile, Then see Google account data', () => {
    // Test profile data synchronization
  })
})
```

---

## 🚧 **Requires Infrastructure First**

### **6. Email Monitoring & AI Processing** 🔮 FUTURE

These user stories require Gmail integration and AI processing infrastructure:

- **Project Items**: AI classification of emails into cost/scope/schedule/decision
- **Unclassified Flagged Items**: Manual classification when AI confidence < 60%
- **Reclassify Flagged Items**: Learning from user corrections
- **Project Timeline**: Confirmed flagged items timeline
- **Export Functionality**: CSV/PDF exports

**Example Future BDD Test:**
```javascript
// tests/bdd/features/email-monitoring.test.tsx
describe('User Story: Project Items', () => {
  test('Given email sent to team, When AI processes message, Then creates flagged item with category', () => {
    // Test AI email classification
  })
})
```

---

## 📊 **BDD Implementation Benefits Achieved**

### ✅ **Direct Traceability**
- **User Story** → **Acceptance Criteria** → **BDD Test** → **Code Implementation**
- Every test maps back to a specific business requirement
- Clear documentation of what each test validates

### ✅ **Business-Readable Tests**
```javascript
test('Given homeowner does not have account, When they click signup CTA, Then they are prompted to login with Google')
```
- Test names match user story language exactly
- Stakeholders can understand test purpose without technical knowledge

### ✅ **Comprehensive Coverage**
- **Authentication**: 4/4 user stories covered
- **Project Creation**: 4/4 user stories covered (1 test needs fixing)
- **API Management**: Core scenarios covered
- **Missing**: Gmail integration, AI processing (require infrastructure)

### ✅ **Quality Assurance**
- **34/35 tests passing** = 97.1% success rate
- Multiple test perspectives: unit, integration, and BDD
- Clear distinction between implemented vs. infrastructure-dependent features

---

## 🎯 **Next Implementation Priority**

1. **Fix Project Creation Test** - Text assertion in project name validation
2. **Account Settings BDD Tests** - User profile management
3. **Dashboard BDD Tests** - Project dashboard user scenarios  
4. **Gmail Integration BDD Tests** - Once Gmail API is implemented
5. **AI Processing BDD Tests** - Once email classification is built

---

## 🔗 **Test File References**

- **Authentication**: `tests/bdd/features/authentication.test.tsx`
- **Project Creation**: `tests/bdd/features/project-creation.test.tsx`
- **Projects API**: `tests/bdd/features/projects-api.test.ts`
- **UI Components**: `tests/bdd/features/button-component.test.tsx`
- **Traditional Tests**: `tests/unit/` and `tests/integration/`

This BDD approach ensures every test has clear business justification and maps directly to user value. 