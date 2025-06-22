# 🎯 Feature Development Playbook

*Comprehensive guide for standardized feature development workflow*

## 🚀 **Automatic Workflow When You Say: "Let's work on \<FEATURE\>"**

When you mention starting work on a feature, I will **automatically** follow this workflow unless you specify otherwise:

---

## 🎯 **Phase 0: Requirements Validation (MANDATORY)**

### **🛑 STOP: User Stories Required**
**Before any development begins, I will verify:**

1. **User Stories Exist**: Check if the feature has defined user stories in `docs/development/USER_STORIES.md`
2. **Acceptance Criteria Defined**: Ensure each user story has clear, testable acceptance criteria
3. **Requirements Complete**: Verify we understand the "Definition of Done"

### **If User Stories Are Missing:**
**I will ask you to provide:**
```markdown
## User Story: [Feature Name]

**As a** [user type]
**I want** [functionality]
**So that** [benefit/value]

### Acceptance Criteria:
- [ ] **Given** [context], **When** [action], **Then** [expected outcome]
- [ ] **Given** [context], **When** [action], **Then** [expected outcome]
- [ ] **Given** [context], **When** [action], **Then** [expected outcome]

### Definition of Done:
- [ ] All acceptance criteria met
- [ ] [Any additional technical requirements]
- [ ] [Performance requirements]
- [ ] [Security requirements]
```

### **Requirements Review Process:**
1. **You provide user stories** with acceptance criteria
2. **I validate completeness** and ask clarifying questions if needed
3. **I map to existing stories** and identify dependencies
4. **I estimate complexity** and suggest implementation approach
5. **You approve** → We proceed to Phase 1
6. **You request changes** → We iterate on requirements

### **Example Required Format:**
```markdown
## User Story: Email Monitoring Dashboard

**As a** homeowner managing a construction project
**I want** to see a dashboard of flagged emails from my contractors
**So that** I can quickly identify issues that need my attention

### Acceptance Criteria:
- [ ] **Given** I'm logged in, **When** I visit the dashboard, **Then** I see a list of flagged emails
- [ ] **Given** there are flagged emails, **When** I view the dashboard, **Then** emails are sorted by urgency (high, medium, low)
- [ ] **Given** I click on a flagged email, **When** the detail view opens, **Then** I see the AI's reasoning for flagging
- [ ] **Given** I want to take action, **When** I click "Mark as Resolved", **Then** the email is removed from my active list
- [ ] **Given** there are no flagged emails, **When** I view the dashboard, **Then** I see an empty state with helpful guidance

### Definition of Done:
- [ ] All acceptance criteria passing in BDD tests
- [ ] Dashboard responsive on mobile/desktop
- [ ] Loading states for async operations
- [ ] Error handling for failed API calls
- [ ] Accessibility compliance (WCAG 2.1 AA)
```

**🚨 NO DEVELOPMENT WORK BEGINS WITHOUT APPROVED USER STORIES AND ACCEPTANCE CRITERIA**

---

## 📋 **Phase 1: Feature Setup (Automatic)**

### **1. User Story Validation ✅**
**After Phase 0 approval, I will automatically:**
1. Add the user stories to `docs/development/USER_STORIES.md`
2. Update `docs/development/BDD_USER_STORIES_MAPPING.md` with test mapping
3. Mark the feature as "🚧 In Development" in documentation

### **2. Branch Creation**
```bash
# Automatic git operations
git checkout develop
git pull origin develop
git checkout -b feature/<feature-name>
```

**Branch Naming Convention:**
- `feature/user-authentication` - User-facing features
- `feature/email-monitoring` - System functionality
- `feature/api-projects` - API enhancements
- `feature/ui-dashboard` - Frontend components
- `feature/db-schema-v2` - Database changes

### **3. Test Structure Creation**
**Automatic test file generation based on approved acceptance criteria:**
```
tests/
├── bdd/features/<feature-name>.test.ts          # User story tests
├── unit/components/<feature-name>.test.tsx      # Component tests  
├── integration/api/<feature-name>.test.ts       # API tests
└── fixtures/<feature-name>-data.ts              # Test data
```

---

## 🧪 **Phase 2: BDD Test Generation (Automatic)**

### **BDD Test Generation Pattern**
**I will automatically create tests based on your provided acceptance criteria:**

```typescript
/**
 * Feature: <Feature Name>
 * User Story: <Exact story from approved requirements>
 * 
 * As a <user type>
 * I want <functionality>
 * So that <benefit>
 */
describe('Feature: <Feature Name>', () => {
  describe('User Story: <Story Title>', () => {
    // Test generated from each acceptance criteria
    test('Given <condition>, When <action>, Then <expected outcome>', async () => {
      // Given: Setup test conditions
      const testData = createTestData();
      
      // When: Execute user action
      const result = await executeUserAction(testData);
      
      // Then: Verify expected behavior
      expect(result).toBe(expectedOutcome);
    });
  });
});
```

### **Testing Workflow (TDD)**
**Automatic execution pattern:**
1. **Red**: Generate failing tests from acceptance criteria
2. **Green**: Implement minimal code to pass each test
3. **Refactor**: Improve code while keeping tests green
4. **Repeat**: For each acceptance criteria

```bash
# Continuous testing during development
npm run test:watch              # Auto-run tests on changes
npm run test:feature:<name>     # Run feature-specific tests
```

---

## 🔧 **Phase 3: Implementation Standards (Automatic)**

### **File Organization Pattern**
**I will automatically follow this structure:**

#### **Frontend Feature**
```
app/
├── <feature-name>/
│   ├── page.tsx                    # Main page component
│   ├── components/                 # Feature-specific components
│   ├── hooks/                      # Custom hooks
│   └── types.ts                    # TypeScript types
├── api/<feature-name>/
│   └── route.ts                    # API endpoints
└── lib/<feature-name>/
    ├── actions.ts                  # Server actions
    ├── utils.ts                    # Utility functions
    └── validation.ts               # Zod schemas
```

#### **API Feature**
```
app/api/<feature-name>/
├── route.ts                        # Main API route
├── validation.ts                   # Input validation
└── service.ts                      # Business logic
```

### **Code Quality Standards**
**Automatic enforcement:**
- **TypeScript**: Strict typing, no `any` types
- **ESLint**: Max 20 warnings allowed (configured in CI)
- **Zod**: Input validation for all API endpoints
- **Prisma**: Type-safe database operations

---

## 🗄️ **Phase 4: Database Schema Management Protocol**

### **The Golden Rule: `prisma/schema.prisma` is the Single Source of Truth**
The root of all database health is treating our schema definition as the absolute, unquestionable source of truth. Schema drift, where the actual database differs from the schema history, is our primary enemy and must be avoided at all costs.

### **Schema Change Workflow**
**ALL** schema changes must follow this exact workflow:
1.  **Modify the Schema File**: Make all desired changes directly in `prisma/schema.prisma`.
2.  **Generate a Migration**: Run `npx prisma migrate dev --name <descriptive-migration-name>`.
    *   **Good Name:** `add-user-avatars`
    *   **Bad Name:** `migration` or `update`
3.  **Review the Migration File**: The generated `.sql` file in `prisma/migrations/` must be reviewed with the same care as application code. It becomes a permanent part of our history.
4.  **Commit Both Files**: Commit both the updated `prisma/schema.prisma` and the new migration directory to Git.

**⛔ Under no circumstances should developers manually alter the database schema** using a DB client like `psql` or TablePlus. Manual changes will cause schema drift and break the migration history for the entire team.

### **CI Guardrail: Automated Drift Detection**
To enforce this protocol, a new CI check will be added to all Pull Requests targeting `develop` and `staging`. This check runs `npx prisma migrate diff` to compare the live database schema against the migration history. If drift is detected, the CI check will fail, blocking the PR until the drift is resolved. This is our automated safety net.

---

## 🌎 **Phase 5: Environment Strategy & Reset Policies**

A clear environment strategy prevents confusion and ensures we can move quickly and safely.

*   **Development (`develop` branch):**
    *   **Role:** Active development and integration.
    *   **Status:** **DISPOSABLE**.
    *   **Rule:** Any developer can and should feel safe running `npx prisma migrate reset` to rebuild the database if it becomes unstable or to test the full migration history. The `prisma/seed.ts` script is the source of truth for test data.

*   **Staging (`staging` branch):**
    *   **Role:** Pre-production replica for QA and user acceptance testing.
    *   **Status:** **PRECIOUS**.
    *   **Rule:** Data should be preserved as much as possible. Migrations are applied in a forward-only direction using `npx prisma migrate deploy`. **Database resets are strictly forbidden.**

*   **Production (`main` branch):**
    *   **Role:** Live user-facing application.
    *   **Status:** **SACRED**.
    *   **Rule:** Migrations are only applied via `npx prisma migrate deploy` as part of a formal, reviewed, and tagged deployment process. **Database resets are forbidden.**

---

## 📖 **Phase 6: Documentation (Automatic)**

### **Documentation Updates**
**I will automatically update:**

1. **User Stories**: Mark implemented features as ✅
2. **API Documentation**: Add new endpoints to relevant docs
3. **Architecture Docs**: Update if infrastructure changes
4. **Testing Docs**: Update test coverage information

### **README Updates**
**Update main README.md with:**
- New feature description
- Usage examples
- Environment variable requirements (if any)

---

## 🔍 **Phase 7: Quality Assurance (Automatic)**

### **Pre-Commit Checklist**
**I will automatically run:**
```bash
npm run type-check                  # TypeScript validation
npm run lint:ci                     # Linting with CI threshold
npm run test:feature:<name>         # Feature-specific tests
npm run test:integration            # Integration tests
npm run build                       # Production build test
```

### **Definition of Done Checklist**
**I will verify all acceptance criteria are met:**
- [ ] All acceptance criteria implemented ✅
- [ ] BDD tests passing (one per acceptance criteria)
- [ ] Unit tests covering edge cases
- [ ] Integration tests for API endpoints
- [ ] TypeScript compilation successful
- [ ] ESLint warnings under threshold
- [ ] Documentation updated
- [ ] No console.log statements in production code
- [ ] Performance requirements met
- [ ] Security requirements met
- [ ] Accessibility requirements met

---

## 🚀 **Phase 8: Pull Request Workflow (Automatic)**

### **PR Creation Pattern**
**I will automatically:**

1. **Push feature branch**: `git push origin feature/<name>`
2. **Generate PR description** with:
   - User story implementation summary
   - Acceptance criteria checklist (all checked)
   - Test coverage summary
   - Breaking changes (if any)
   - Screenshots/demos (for UI features)

### **PR Template**
```markdown
## 🎯 Feature: <Feature Name>

### User Story Implementation
**As a** <user type>
**I want** <functionality>
**So that** <benefit>

### Acceptance Criteria ✅
- [x] **Given** <condition>, **When** <action>, **Then** <outcome> ✅
- [x] **Given** <condition>, **When** <action>, **Then** <outcome> ✅
- [x] **Given** <condition>, **When** <action>, **Then** <outcome> ✅

### Changes Made
- [ ] Frontend components
- [ ] API endpoints  
- [ ] Database schema
- [ ] BDD tests (mapped to acceptance criteria)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation updated

### Test Coverage
- **BDD Tests**: X passing (1 per acceptance criteria)
- **Unit Tests**: X passing  
- **Integration Tests**: X passing
- **Total Coverage**: X%

### Quality Checks
- [x] All acceptance criteria met
- [x] TypeScript compilation
- [x] ESLint passing
- [x] All tests passing
- [x] Build successful
- [x] Performance requirements met
- [x] Security requirements met
```

---

## 🌍 **Phase 9: Environment Promotion (Automatic)**

### **Deployment Pipeline**
**I will follow this progression:**

1. **Merge to develop** → Auto-deploy to development environment
2. **Test in development** → Verify all acceptance criteria work end-to-end
3. **Merge to staging** → Auto-deploy to staging environment
4. **Staging validation** → Test with production-like data
5. **Merge to main** → Auto-deploy to production environment

### **Environment Testing**
**I will verify in each environment:**
- Health endpoints return 200 OK
- Database connectivity working
- **All acceptance criteria functioning** in live environment
- No breaking changes to existing features

---

## 🎯 **Common Feature Patterns**

### **Authentication Feature**
```bash
# Automatic setup for auth features
- User model updates in Prisma
- NextAuth configuration
- Protected route middleware
- Session management tests
```

### **API Feature**
```bash
# Automatic setup for API features  
- Route handler with validation
- Error handling middleware
- Rate limiting (if needed)
- API documentation updates
```

### **UI Feature**
```bash
# Automatic setup for UI features
- Component with TypeScript props
- Responsive design implementation
- Accessibility considerations
- Visual testing setup
```

### **Database Feature**
```bash
# Automatic setup for database features
- Schema migration
- Seed data updates
- Database tests
- Performance considerations
```

---

## 🚨 **Emergency Procedures**

### **If Requirements Change Mid-Development**
1. **STOP development immediately**
2. **Document the change request**
3. **Update user stories and acceptance criteria**
4. **Regenerate BDD tests** for new requirements
5. **Get approval** for updated requirements
6. **Resume development** with new tests

### **If Tests Fail**
```bash
# Automatic debugging steps
npm run test:ci:all --verbose      # Get detailed failure info
npm run db:reset                   # Reset test database
npm run db:seed                    # Reseed test data
```

### **If Build Fails**
```bash
# Automatic troubleshooting
npm run type-check                 # Check TypeScript errors
npx prisma generate                # Regenerate Prisma client
npm run lint:fix                   # Auto-fix lint issues
```

### **If CI/CD Fails**
1. Check GitHub Actions logs for specific errors
2. Verify environment secrets are configured
3. Check for branch protection rule conflicts
4. Validate workflow YAML syntax

---

## 📊 **Success Metrics**

### **Feature Completion Indicators**
- ✅ **All acceptance criteria met** (most important)
- ✅ All BDD tests passing (1:1 with acceptance criteria)
- ✅ 90%+ test coverage for feature code
- ✅ All environments deployed successfully
- ✅ Performance within acceptable limits
- ✅ Documentation completely updated
- ✅ User story marked as complete ✅

### **Quality Indicators**
- ✅ Zero TypeScript errors
- ✅ ESLint warnings under threshold
- ✅ No security vulnerabilities introduced
- ✅ Database queries optimized
- ✅ Accessibility standards met

---

## 🎯 **Customization Options**

### **When You Can Override Defaults**
- **"Skip tests for now"** → ❌ NOT ALLOWED (violates BDD principles)
- **"Focus on backend only"** → ✅ Skip frontend components (if user stories allow)
- **"Prototype quickly"** → ✅ Use rapid development mode (but tests still required)
- **"Production-ready"** → ✅ Full quality gates and documentation

### **Feature Complexity Levels**
- **Simple**: Single acceptance criteria, minimal implementation
- **Medium**: Multiple acceptance criteria, some database changes
- **Complex**: Many acceptance criteria, multi-service integration

---

## 🎉 **Benefits of This Playbook**

### **For You**
- **Clear requirements** → Never build the wrong thing
- **Predictable timeline** → Well-defined acceptance criteria = clear scope
- **Quality assurance** → BDD tests ensure features work as specified
- **Stakeholder alignment** → Everyone agrees on "done" before work starts

### **For the Project**
- **Maintainable codebase** → Every feature has comprehensive test coverage
- **Predictable releases** → Features are truly "done" when complete
- **Quality documentation** → Requirements and implementation always aligned
- **Reliable deployments** → Proven workflow with comprehensive validation

---

## 🚀 **Usage Examples**

### **❌ WRONG: "Let's work on user dashboard"**
**I will respond:**
"I need user stories and acceptance criteria before we can begin development. Please provide:
- What specific functionality should the dashboard have?
- Who is the user and what value does it provide?
- What are the testable acceptance criteria?"

### **✅ CORRECT: After providing user stories...**
**I will automatically:**
1. Validate user stories and acceptance criteria
2. Create `feature/user-dashboard` branch
3. Generate BDD tests from acceptance criteria
4. Set up dashboard component structure
5. Implement functionality to pass each test
6. Update documentation and create PR

**Bottom line: Requirements first, then I'll execute the entire development workflow automatically!** 🎯 