# Nailit MVP Product Requirements Document

## 🏠 **Project Overview**

**Product**: Nailit - Email Processing & Project Management Platform  
**Vision**: Help homeowners track renovation project communications, detect changes, and maintain project timelines through AI-powered email analysis  
**Target Users**: Homeowners managing renovation projects  
**MVP Timeline**: 13 weeks (5 phases)  

---

## 📋 **MVP User Stories & Acceptance Criteria**

### **Epic 1: Authentication & Project Setup**

#### **US-01: Google OAuth Authentication**
**As a** homeowner  
**I want** to authenticate using my Google account  
**So that** I can securely access my renovation project data

**Acceptance Criteria:**
- ✅ **Scenario: Successful authentication**
  - Given I am not logged in
  - When I visit a protected page
  - Then I should be redirected to the sign-in page
  - And I should see a "Continue with Google" button
  - When I click "Continue with Google" and complete OAuth
  - Then I should be redirected to the dashboard
  - And I should see my user profile in the navigation

- ✅ **Scenario: Authentication failure**
  - Given I am not logged in
  - When I attempt OAuth authentication but it fails
  - Then I should be redirected to the error page
  - And I should see a meaningful error message
  - And I should have the option to try again

- ✅ **Scenario: Protected route access**
  - Given I am not logged in
  - When I try to access "/dashboard" directly
  - Then I should be redirected to "/auth/signin"
  - And I should not see any project data

**Test Status**: ✅ **4/4 tests passing**  
**Implementation**: ✅ **Complete**

#### **US-02: First-Time Project Creation**
**As a** first-time user  
**I want** to create my renovation project  
**So that** I can start monitoring project communications

**Acceptance Criteria:**
- 🟡 **Scenario: First-time user project creation**
  - Given I am logged in for the first time
  - And I have no projects in my account
  - When I visit any protected page
  - Then I should be redirected to "/projects/create"
  - And I should see a project creation form
  - When I fill in required project details
  - Then I should be redirected to the dashboard
  - And email monitoring should be enabled automatically

- ✅ **Scenario: Project validation**
  - Given I am on the project creation page
  - When I submit the form without required fields
  - Then I should see appropriate validation errors
  - And the form should not be submitted

**Sub-Stories:**
- **US-04**: Project name that reflects scope
- **US-05**: Add general contractor (required)
- **US-06**: Add architect/designer (optional)
- **US-07**: Add project manager (optional)

**Test Status**: 🟡 **5/6 tests passing** (1 failing test)  
**Implementation**: 🟡 **Mostly complete** (needs test fix)

---

### **Epic 2: Email Processing Pipeline**

#### **US-03: Enhanced Email Processing**
**As a** homeowner with a renovation project  
**I want** comprehensive email processing and AI analysis  
**So that** I never miss important project communications and changes

**Phase 1: Enhanced Email Connection & Ingestion (Weeks 1-3)**

**Acceptance Criteria:**
- 📋 **Scenario: Gmail Connection Setup**
  - Given I am setting up email monitoring for my project
  - When I click "Connect Gmail" in my project settings
  - Then I am redirected to Google OAuth consent screen
  - And I grant permissions for gmail.readonly and gmail.send scopes
  - And I am redirected back to NailIt with "Gmail Connected" confirmation
  - And my project settings show "Email Monitoring: Active"

- 📋 **Scenario: Real-time Email Capture**
  - Given my Gmail is connected to my renovation project
  - When I receive an email from my contractor, architect, or project manager
  - Then NailIt captures the email within 30 seconds
  - And stores the email content securely
  - And the email appears in my project's communication history
  - And I can see the processing status as "analyzing"

**Phase 2: Intelligent Email Analysis (Weeks 4-6)**

- 📋 **Scenario: Smart Project Relevance Detection**
  - Given an email is captured from my Gmail
  - When AI analysis processes the email
  - Then the email receives a relevance score for my renovation project
  - And emails about my project appear in my communications timeline
  - And irrelevant emails are filtered out automatically
  - And I can see why an email was included or excluded

- 📋 **Scenario: Enhanced Email Categorization**
  - Given a project-related email is being analyzed
  - When AI categorization runs
  - Then the email is assigned a category: Quote, Invoice, Schedule Update, Permit, Inspection, Material Delivery, Change Request, or General Communication
  - And I can see the category badge on each email in my timeline
  - And I can filter my communications by category
  - And important categories like "Change Request" are highlighted

**Phase 3: Change Detection & Flagging (Weeks 7-8)**

- 📋 **Scenario: Enhanced Change Detection**
  - Given I receive an email from a contractor or team member
  - When AI processes the email and detects a significant change
  - Then a flagged item is automatically created with the change details
  - And the flagged item references the original email
  - And I receive a notification about the new flagged item
  - And the email is marked as "Contains Changes" in my timeline

**Test Status**: 📋 **Pending implementation**  
**Implementation**: 🔄 **In development**

---

### **Epic 3: Project Timeline & Dashboard**

#### **US-04: Project Timeline & Dashboard Integration**
**As a** homeowner  
**I want** to see a unified timeline of my project communications and changes  
**So that** I can understand the complete evolution of my renovation project

**Acceptance Criteria:**
- 📋 **Scenario: Unified Communication Timeline**
  - Given I view my project dashboard
  - When I navigate to the "Communications" section
  - Then I see emails, flagged items, and timeline entries integrated in chronological order
  - And each item shows its type (email, change, update) with appropriate icons
  - And I can expand emails to see AI analysis and extracted information
  - And I can jump from emails to related flagged items

- 📋 **Scenario: Smart Communication Search**
  - Given I have a project with email history and flagged items
  - When I search for terms like "kitchen cabinets" or "$5000"
  - Then I see results from both emails and flagged items
  - And search results are ranked by relevance and recency
  - And I can filter results by type (emails, changes, updates)
  - And search terms are highlighted in the results

**Test Status**: 📋 **Pending implementation**  
**Implementation**: 🔄 **Basic timeline exists, needs email integration**

---

### **Epic 4: Infrastructure & Monitoring**

#### **US-05: Logging Infrastructure & Monitoring**
**As a** development team  
**I want** comprehensive logging infrastructure with CloudWatch integration  
**So that** I can monitor, debug, and maintain the application effectively in production

**Acceptance Criteria:**
- 📋 **Scenario: Structured Logging System**
  - Given I am implementing application functionality
  - When I use the logging system
  - Then logs should be output in structured JSON format
  - And logs should include metadata like timestamps, environment, service info
  - And logs should support different severity levels

- 📋 **Scenario: Request Tracing**
  - Given a user makes an API request
  - When the request is processed
  - Then a unique request ID should be generated
  - And the request ID should be included in all related log entries
  - And the request ID should be returned in response headers

**Test Status**: 📋 **Pending implementation**  
**Implementation**: 🔄 **Basic logging exists, needs standardization**

---

## 🧪 **Test Coverage Analysis**

### **Current Status: 34/35 tests passing (97.1%)**

| Feature | Test File | Status | Coverage |
|---------|-----------|--------|----------|
| **Authentication** | `authentication.test.tsx` | ✅ 4/4 passing | Complete |
| **Project Creation** | `project-creation.test.tsx` | 🟡 5/6 passing | Mostly complete |
| **Projects API** | `projects.test.ts` | ✅ 5/5 passing | Complete |
| **UI Components** | `button-component.test.tsx` | ✅ 8/8 passing | Complete |
| **Email Processing** | `email-ingestion.test.tsx` | 📋 Pending | Not implemented |
| **Timeline Integration** | `timeline-integration.test.tsx` | 📋 Pending | Not implemented |
| **Logging Infrastructure** | `logging-infrastructure.test.ts` | 📋 Pending | Not implemented |

### **Test Implementation Strategy**

**BDD Framework**: Jest + React Testing Library  
**Test Structure**: Given-When-Then scenarios  
**Fixtures**: Centralized test data in `tests/fixtures/`  
**Mocking**: Comprehensive mocks for external services  

---

## 🏗️ **Technical Architecture**

### **Frontend Stack**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js with Google OAuth
- **State Management**: React Context + useState

### **Backend Stack**
- **Runtime**: Node.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **API**: Next.js API Routes
- **Email Processing**: Gmail API + OpenAI GPT-4

### **Infrastructure**
- **Hosting**: AWS App Runner
- **Storage**: AWS S3 (email content)
- **Monitoring**: AWS CloudWatch
- **CI/CD**: GitHub Actions
- **Environments**: Development, Staging, Production

### **External Integrations**
- **Google OAuth**: User authentication
- **Gmail API**: Email ingestion and monitoring
- **OpenAI GPT-4**: Email analysis and categorization
- **AWS Services**: Infrastructure and monitoring

---

## 📊 **Success Metrics**

### **Performance Targets**
- **Email Processing**: Within 30 seconds of receipt
- **AI Relevance Scoring**: >90% accuracy for project emails
- **Email Categorization**: >85% accuracy
- **System Uptime**: 99.9% availability
- **Zero Data Loss**: 100% email capture reliability

### **User Adoption Goals**
- **Onboarding**: 80% of users complete project setup within 10 minutes
- **Engagement**: 80% of users actively use email monitoring within 30 days
- **Retention**: 70% of users continue using the platform after 3 months

### **Quality Metrics**
- **Test Coverage**: 100% BDD test coverage for all user stories
- **Code Quality**: Zero critical security vulnerabilities
- **Documentation**: Complete API documentation and user guides

---

## 🗓️ **Development Roadmap**

### **Phase 1: Foundation (Weeks 1-3)**
- ✅ Google OAuth authentication
- ✅ Project creation and management
- ✅ Basic UI components and navigation
- 🔄 Enhanced Gmail OAuth integration
- 📋 Real-time email capture system

### **Phase 2: Email Processing (Weeks 4-6)**
- 📋 AI-powered email analysis
- 📋 Relevance scoring and categorization
- 📋 Project assignment algorithms
- 📋 Email content storage and retrieval

### **Phase 3: Change Detection (Weeks 7-8)**
- 📋 AI change detection system
- 📋 Flagged items integration
- 📋 Notification system
- 📋 Email-to-change linking

### **Phase 4: Dashboard Integration (Weeks 9-10)**
- 📋 Unified communication timeline
- 📋 Advanced search and filtering
- 📋 Performance optimization
- 📋 Mobile responsiveness

### **Phase 5: Production Readiness (Weeks 11-13)**
- 📋 Comprehensive logging system
- 📋 Monitoring and alerting
- 📋 Security hardening
- 📋 Performance optimization
- 📋 User documentation

---

## 🎯 **MVP Definition of Done**

### **Core Functionality**
- [x] User authentication with Google OAuth
- [x] Project creation and team management
- [ ] Gmail integration with real-time email capture
- [ ] AI-powered email analysis and categorization
- [ ] Change detection and flagged items system
- [ ] Unified project timeline and dashboard
- [ ] Search and filtering capabilities

### **Quality Assurance**
- [x] 97.1% BDD test coverage (34/35 tests passing)
- [ ] 100% test coverage for all implemented features
- [ ] Zero critical security vulnerabilities
- [ ] Performance targets met for all core features
- [ ] Comprehensive error handling and logging

### **Production Readiness**
- [x] Multi-environment deployment (dev/staging/prod)
- [x] CI/CD pipeline with automated testing
- [ ] Monitoring and alerting system
- [ ] Data backup and recovery procedures
- [ ] User documentation and onboarding guides

---

## 📚 **Related Documentation**

### **Development Guides**
- [Feature Development Playbook](../development/FEATURE_DEVELOPMENT_PLAYBOOK.md)
- [BDD User Stories Mapping](../development/BDD_USER_STORIES_MAPPING.md)
- [Testing Strategy](../testing/TESTING_PLAN.md)

### **Architecture Documentation**
- [System Architecture](../architecture/SERVERLESS_ARCHITECTURE.md)
- [Email Processing Architecture](../architecture/email-ingestion-architecture.md)
- [Infrastructure Overview](../architecture/CURRENT_INFRASTRUCTURE.md)

### **Deployment & Operations**
- [Environment Strategy](../deployment/ENVIRONMENT_STRATEGY.md)
- [CI/CD Implementation](../deployment/CICD_IMPLEMENTATION_SUMMARY.md)
- [Logging Implementation](../deployment/LOGGING_IMPLEMENTATION_GUIDE.md)

---

*Last Updated: January 2025*  
*Status: MVP Development Phase*  
*Next Review: Weekly sprint planning* 