# NailIt User Stories & Acceptance Criteria

## Epic 1: Project Management & Authentication

### US-01: User Authentication
**As a** homeowner  
**I want** to authenticate using my Google account  
**So that** I can securely access my renovation project data

#### Acceptance Criteria:
```gherkin
Feature: Google OAuth Authentication

Scenario: Successful authentication
  Given I am not logged in
  When I visit a protected page
  Then I should be redirected to the sign-in page
  And I should see a "Continue with Google" button
  When I click "Continue with Google" 
  And I complete the OAuth flow successfully
  Then I should be redirected to the dashboard
  And I should see my user profile in the navigation

Scenario: Authentication failure
  Given I am not logged in
  When I visit the sign-in page
  And I attempt OAuth authentication but it fails
  Then I should be redirected to the error page
  And I should see a meaningful error message
  And I should have the option to try again

Scenario: Accessing protected routes without authentication
  Given I am not logged in
  When I try to access "/dashboard" directly
  Then I should be redirected to "/auth/signin"
  And I should not see any project data
```

### US-02: Project Creation (First-Time Setup)
**As a** first-time user  
**I want** to create my renovation project  
**So that** I can start monitoring project communications

#### Acceptance Criteria:
```gherkin
Feature: Project Creation

Scenario: First-time user project creation
  Given I am logged in for the first time
  And I have no projects in my account
  When I visit any protected page
  Then I should be redirected to "/projects/create"
  And I should see a project creation form
  When I fill in the project name "Kitchen Renovation"
  And I add contractor email "contractor@example.com"
  And I add team member "John Doe" with email "john@example.com"
  And I click "Create Project"
  Then I should be redirected to the dashboard
  And I should see "Kitchen Renovation" in my projects list
  And email monitoring should be enabled automatically

Scenario: Invalid project creation
  Given I am on the project creation page
  When I submit the form without a project name
  Then I should see a validation error "Project name is required"
  And the form should not be submitted
  When I enter a project name but no contractor email
  Then I should see a validation error "At least one contractor email is required"
```

### US-03: Projects API Management
**As a** user with existing projects  
**I want** to retrieve my projects via API  
**So that** the dashboard can display my project information

#### Acceptance Criteria:
```gherkin
Feature: Projects API

Scenario: Authenticated user retrieves projects
  Given I am authenticated as user "user-123"
  And I have projects in my account
  When I make a GET request to "/api/projects"
  Then I should receive a 200 status code
  And the response should contain my projects
  And each project should include:
    | field | type |
    | id | string |
    | name | string |
    | user | object |
    | emailSettings | object or null |
    | _count.flaggedItems | number |
    | _count.timelineEntries | number |

Scenario: Unauthenticated user attempts to access projects
  Given I am not authenticated
  When I make a GET request to "/api/projects"
  Then I should receive a 401 status code
  And the response should contain an error message "Unauthorized"

Scenario: Empty projects list
  Given I am authenticated as user "user-456"
  And I have no projects in my account
  When I make a GET request to "/api/projects"
  Then I should receive a 200 status code
  And the response should be an empty array
```

## Epic 2: Email Monitoring & Flagging

### US-04: Email Detection & Flagging
**As a** project owner  
**I want** AI to automatically detect important changes in project emails  
**So that** I don't miss critical updates about cost, schedule, or scope

#### Acceptance Criteria:
```gherkin
Feature: Email Monitoring and Flagging

Scenario: Cost change detected in email
  Given I have email monitoring enabled for my project
  And my contractor sends an email with content "The kitchen cabinets will cost an additional $5,000"
  When the AI processes this email
  Then a flagged item should be created
  And the category should be "COST"
  And the estimated impact should be "$5,000"
  And the status should be "PENDING"
  And I should receive a notification

Scenario: Schedule change detected
  Given I have email monitoring enabled
  And my contractor sends "Due to permit delays, we're pushing back the start date by 2 weeks"
  When the AI processes this email
  Then a flagged item should be created with category "SCHEDULE"
  And the impact should reference "2 weeks delay"

Scenario: Irrelevant email ignored
  Given I have email monitoring enabled
  And I receive a marketing email from Home Depot
  When the AI processes this email
  Then no flagged item should be created
  And the email should be marked as irrelevant
```

### US-05: Flagged Items Review
**As a** project owner  
**I want** to review and confirm/dismiss flagged email impacts  
**So that** only verified changes appear in my project timeline

#### Acceptance Criteria:
```gherkin
Feature: Flagged Items Review

Scenario: User confirms a flagged cost impact
  Given I have a pending flagged item about a $3,000 cost increase
  When I visit the "/flagged" page
  Then I should see the flagged item listed
  And I should see the original email content
  And I should see "COST" category and "$3,000" impact
  When I click "Confirm"
  Then the flagged item status should change to "CONFIRMED"
  And a timeline entry should be created automatically
  And the timeline entry should reference the original email

Scenario: User dismisses an irrelevant flagged item
  Given I have a pending flagged item that was incorrectly categorized
  When I view the flagged item details
  And I click "Dismiss"
  Then the flagged item status should change to "DISMISSED"
  And no timeline entry should be created
  And the item should not appear in future flagged items lists

Scenario: Viewing flagged item details
  Given I have pending flagged items
  When I click on a flagged item
  Then I should see a detailed modal with:
    | field | description |
    | Email Subject | Original email subject line |
    | From | Sender information |
    | Date | When the email was received |
    | AI Analysis | Why this was flagged |
    | Extracted Impact | Cost/schedule/scope details |
    | Confidence Score | AI confidence level |
```

## Epic 3: Timeline & Project History

### US-06: Project Timeline
**As a** project owner  
**I want** to see a chronological timeline of confirmed project impacts  
**So that** I can understand how my project has evolved over time

#### Acceptance Criteria:
```gherkin
Feature: Project Timeline

Scenario: Timeline displays confirmed impacts
  Given I have confirmed several flagged items:
    | date | category | impact | description |
    | 2024-01-15 | COST | +$2,000 | Cabinet upgrade |
    | 2024-01-20 | SCHEDULE | +1 week | Permit delay |
    | 2024-01-25 | SCOPE | Addition | Extra electrical work |
  When I visit the "/timeline" page
  Then I should see all confirmed impacts in chronological order
  And each entry should show the date, category, and impact
  And each entry should link back to the original email

Scenario: Empty timeline for new project
  Given I have a new project with no confirmed impacts
  When I visit the "/timeline" page
  Then I should see an empty state message
  And I should see a link to the flagged items page

Scenario: Timeline filtering by category
  Given I have confirmed impacts in multiple categories
  When I filter the timeline by "COST"
  Then I should only see cost-related impacts
  When I filter by "SCHEDULE"
  Then I should only see schedule-related impacts
```

## Epic 4: UI Components & User Experience

### US-07: Button Component Accessibility
**As a** user (including those using assistive technologies)  
**I want** consistent, accessible button interactions  
**So that** I can navigate and use the application effectively

#### Acceptance Criteria:
```gherkin
Feature: Button Component

Scenario: Button renders with default styling
  Given I am viewing a page with a default button
  When the button is rendered
  Then it should have the primary green color (#34A853)
  And it should have medium padding (px-4 py-2)
  And it should have proper focus states for accessibility

Scenario: Button variants display correctly
  Given I have buttons with different variants
  When I view a "secondary" button
  Then it should have blue color (#1A73E8)
  When I view an "outline" button
  Then it should have a border with transparent background
  When I view a "ghost" button
  Then it should have transparent background with gray text

Scenario: Button accessibility features
  Given I am using a screen reader
  When I navigate to a button
  Then the button should have proper ARIA attributes
  And I should be able to activate it with Enter or Space keys
  When I tab to the button
  Then it should have a visible focus indicator

Scenario: Disabled button behavior
  Given I have a disabled button
  When I try to click it
  Then no action should be triggered
  And it should have visual indicators that it's disabled
  And it should not be focusable via keyboard navigation
```

## Test Implementation Guidelines

### BDD Test Structure
```javascript
// Example: tests/bdd/features/authentication.test.ts
describe('Feature: Google OAuth Authentication', () => {
  describe('Scenario: Successful authentication', () => {
    test('Given I am not logged in, When I visit a protected page, Then I should be redirected to sign-in', async () => {
      // Arrange (Given)
      mockUnauthenticatedUser()
      
      // Act (When)
      const response = await visitProtectedPage('/dashboard')
      
      // Assert (Then)
      expect(response).toRedirectTo('/auth/signin')
    })
  })
})
```

### Mapping User Stories to Tests
1. **Each User Story** → Test file in `tests/bdd/features/`
2. **Each Scenario** → Test suite (describe block)
3. **Each Given-When-Then** → Individual test case
4. **Cross-cutting concerns** → Shared fixtures and helpers

---

This structure ensures every test maps back to a user need and business requirement, making our testing strategy truly behavior-driven rather than just technically comprehensive. 