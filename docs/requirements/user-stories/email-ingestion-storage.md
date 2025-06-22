# User Stories: Email Ingestion and Storage

## 📧 **Epic: Enhanced Email Processing for Homeowners**

**Vision**: Building on the existing email monitoring foundation, enhance the system to provide homeowners with comprehensive email ingestion, intelligent analysis, and seamless project communication tracking for their renovation projects.

---

## 🎯 **Phase 1: Enhanced Email Connection & Ingestion (Weeks 1-3)**

### **Story 1.1: Gmail Connection Setup**
**As a** homeowner  
**I want to** connect my Gmail account with enhanced permissions  
**So that** NailIt can automatically monitor all my renovation project communications in real-time  

**Acceptance Criteria:**
- **Given** I am setting up email monitoring for my project  
- **When** I click "Connect Gmail" in my project settings  
- **Then** I am redirected to Google OAuth consent screen  
- **And** I grant permissions for gmail.readonly and gmail.send scopes  
- **And** I am redirected back to NailIt with "Gmail Connected" confirmation  
- **And** my project settings show "Email Monitoring: Active"  

**Technical Requirements:**
- Extend existing OAuth implementation with enhanced scopes
- Store encrypted refresh tokens securely in database  
- Set up Gmail push notifications for real-time processing
- Handle token refresh automatically

### **Story 1.2: Real-time Email Capture**  
**As a** homeowner with Gmail connected  
**I want** my renovation-related emails captured automatically  
**So that** I don't miss any important communications from my project team  

**Acceptance Criteria:**
- **Given** my Gmail is connected to my renovation project  
- **When** I receive an email from my contractor, architect, or project manager  
- **Then** NailIt captures the email within 30 seconds  
- **And** stores the email content securely  
- **And** the email appears in my project's communication history  
- **And** I can see the processing status as "analyzing"  

**Technical Requirements:**
- Gmail webhook handler for real-time notifications
- Secure email content storage in S3
- Integration with existing project team contact list
- Database schema for email metadata storage

### **Story 1.3: Email History Organization**
**As a** homeowner  
**I want** all my project emails organized in one place  
**So that** I can easily reference past communications with my project team  

**Acceptance Criteria:**
- **Given** I have connected my Gmail and received project emails  
- **When** I visit my project's "Communications" tab  
- **Then** I see all project-related emails in chronological order  
- **And** each email shows sender, subject, date, and importance level  
- **And** I can click on any email to view the full content  
- **And** I can search emails by content, sender, or date range  

**Technical Requirements:**
- Email timeline component integrated with project dashboard
- Full-text search functionality
- Email content storage and retrieval system
- Integration with existing project structure

---

## 🤖 **Phase 2: Intelligent Email Analysis (Weeks 4-6)**

### **Story 2.1: Smart Project Relevance Detection**
**As a** homeowner  
**I want** AI to identify which emails are about my renovation project  
**So that** I only see communications that matter for my project tracking  

**Acceptance Criteria:**
- **Given** an email is captured from my Gmail  
- **When** AI analysis processes the email  
- **Then** the email receives a relevance score for my renovation project  
- **And** emails about my project appear in my communications timeline  
- **And** irrelevant emails (marketing, personal) are filtered out automatically  
- **And** I can see why an email was included or excluded  

**Technical Requirements:**
- Integration with existing AI flagging system
- Relevance scoring algorithm using project context
- Participant matching with contractor/team member contacts
- Confidence scoring and explanation system

### **Story 2.2: Enhanced Email Categorization**
**As a** homeowner  
**I want** my project emails automatically categorized by type  
**So that** I can quickly understand what each communication is about  

**Acceptance Criteria:**
- **Given** a project-related email is being analyzed  
- **When** AI categorization runs  
- **Then** the email is assigned a category: Quote, Invoice, Schedule Update, Permit, Inspection, Material Delivery, Change Request, or General Communication  
- **And** I can see the category badge on each email in my timeline  
- **And** I can filter my communications by category  
- **And** important categories like "Change Request" are highlighted  

**Technical Requirements:**
- Extension of existing email classification system
- Construction-specific category definitions
- Integration with flagged items system for changes
- Category-based filtering in email timeline

### **Story 2.3: Important Information Extraction**
**As a** homeowner  
**I want** key information extracted from my project emails  
**So that** I can quickly see costs, dates, and important details without reading every email  

**Acceptance Criteria:**
- **Given** an email contains project information like costs or dates  
- **When** AI processes the email  
- **Then** important data is extracted and highlighted: amounts, dates, deadlines, contact information  
- **And** extracted information appears as badges or tags on the email  
- **And** cost changes automatically trigger the existing flagged items system  
- **And** deadline dates are highlighted if they're approaching  

**Technical Requirements:**
- Named Entity Recognition for construction projects
- Integration with existing flagged items for cost/schedule changes
- Data extraction display in email timeline
- Automatic flagging of significant changes

---

## 📊 **Phase 3: Project Integration & Flagging Enhancement (Weeks 7-8)**

### **Story 3.1: Automatic Project Assignment**
**As a** homeowner with multiple renovation projects  
**I want** emails automatically assigned to the correct project  
**So that** each project's communication history is accurate and complete  

**Acceptance Criteria:**
- **Given** I have multiple renovation projects in NailIt  
- **When** I receive an email from a contractor or team member  
- **Then** the email is automatically assigned to the correct project based on participants and content  
- **And** I can see which project each email belongs to  
- **And** emails appear in the correct project's communication timeline  
- **And** I can manually reassign emails if needed  

**Technical Requirements:**
- Multi-project email association algorithm
- Participant matching across projects
- Content analysis for project references
- Manual override capability in UI

### **Story 3.2: Enhanced Change Detection**
**As a** homeowner  
**I want** email-based changes to automatically create flagged items  
**So that** I can review and confirm important project changes from email communications  

**Acceptance Criteria:**
- **Given** I receive an email from a contractor or team member  
- **When** AI processes the email and detects a significant change  
- **Then** a flagged item is automatically created with the change details  
- **And** the flagged item references the original email  
- **And** I receive a notification about the new flagged item  
- **And** the email is marked as "Contains Changes" in my timeline  

**Technical Requirements:**
- Enhanced integration with existing flagged items system
- Email-to-flagged-item linking
- Change detection improvements for email content
- Notification system for email-derived changes

---

## 📱 **Phase 4: Enhanced Communication Dashboard (Weeks 9-10)**

### **Story 4.1: Unified Communication Timeline**
**As a** homeowner  
**I want** to see all my project communications in one organized timeline  
**So that** I can understand the complete history of my renovation project  

**Acceptance Criteria:**
- **Given** I view my project dashboard  
- **When** I navigate to the "Communications" section  
- **Then** I see emails, flagged items, and timeline entries integrated in chronological order  
- **And** each item shows its type (email, change, update) with appropriate icons  
- **And** I can expand emails to see AI analysis and extracted information  
- **And** I can jump from emails to related flagged items  

**Technical Requirements:**
- Unified timeline component combining emails and flagged items
- Integrated view of communications and project changes
- Cross-linking between emails and flagged items
- Enhanced project dashboard layout

### **Story 4.2: Smart Communication Search**
**As a** homeowner  
**I want** to search across all my project communications  
**So that** I can quickly find specific information about costs, dates, or decisions  

**Acceptance Criteria:**
- **Given** I have a project with email history and flagged items  
- **When** I search for terms like "kitchen cabinets" or "$5000"  
- **Then** I see results from both emails and flagged items  
- **And** search results are ranked by relevance and recency  
- **And** I can filter results by type (emails, changes, updates)  
- **And** search terms are highlighted in the results  

**Technical Requirements:**
- Cross-communication search functionality
- Full-text search across emails and flagged items
- Search result ranking and filtering
- Integration with existing project search

---

## 🔧 **Phase 5: Multi-Provider & Advanced Features (Weeks 11-13)**

### **Story 5.1: Outlook Email Support**
**As a** homeowner who uses Outlook for business  
**I want** to connect my Outlook account for work-related renovation communications  
**So that** all my project emails are monitored regardless of which email service I use  

**Acceptance Criteria:**
- **Given** I want to monitor emails from my work Outlook account  
- **When** I go to email settings and click "Connect Outlook"  
- **Then** I complete Microsoft OAuth and grant Mail.Read permissions  
- **And** my Outlook emails are processed the same way as Gmail  
- **And** I can see emails from both accounts in my unified timeline  
- **And** I can manage both email connections independently  

**Technical Requirements:**
- Microsoft Graph API integration
- Unified email processing pipeline for multiple providers
- Multi-account management interface
- Provider-agnostic email storage and analysis

### **Story 5.2: Smart Email Notifications**
**As a** homeowner  
**I want** intelligent notifications about important email communications  
**So that** I'm alerted to urgent issues without being overwhelmed by every email  

**Acceptance Criteria:**
- **Given** I receive project emails throughout the day  
- **When** an email contains urgent information (cost overruns, schedule delays, permit issues)  
- **Then** I receive an immediate notification on my phone or browser  
- **And** routine emails don't trigger notifications  
- **And** I can customize notification preferences by email type  
- **And** notifications link directly to the email and any related flagged items  

**Technical Requirements:**
- Urgency detection algorithm
- Push notification system
- Notification preference management
- Smart notification filtering

### **Story 5.3: Email Communication Analytics**
**As a** homeowner  
**I want** insights into my project communication patterns  
**So that** I can understand how well my project team is communicating and identify potential issues  

**Acceptance Criteria:**
- **Given** I have weeks of email history for my project  
- **When** I view my project analytics  
- **Then** I see communication frequency by team member  
- **And** I can see response time patterns  
- **And** I can identify communication gaps or delays  
- **And** I can see trends in email categories (more change requests lately, etc.)  

**Technical Requirements:**
- Communication analytics dashboard
- Response time calculation
- Communication pattern analysis
- Integration with project health metrics

---

## 🔗 **Integration with Existing Features**

### **Enhanced Flagged Items System**
- Emails automatically create flagged items for detected changes
- Flagged item details link back to originating emails
- Email content provides context for change decisions

### **Improved Timeline Experience**
- Timeline includes both emails and confirmed changes
- Email communications provide full context for project evolution
- Searchable history across all communication types

### **Project Team Management**
- Email participants automatically sync with project team contacts
- Team member communication patterns tracked and analyzed
- Email addresses validate against project team roster

---

## 📋 **Exit Criteria by Phase**

### **Phase 1 Complete When:**
- [ ] Gmail connection working with enhanced permissions
- [ ] Real-time email capture operational (within 30 seconds)
- [ ] Email content securely stored and accessible
- [ ] Basic email timeline integrated with project dashboard

### **Phase 2 Complete When:**
- [ ] AI relevance detection working (>90% accuracy for project emails)
- [ ] Email categorization functional (>85% accuracy)
- [ ] Key information extraction working for costs, dates, deadlines
- [ ] Integration with existing flagged items system

### **Phase 3 Complete When:**
- [ ] Multi-project email assignment working (>80% accuracy)
- [ ] Email-based change detection creating flagged items correctly
- [ ] Cross-linking between emails and flagged items functional
- [ ] Manual project assignment override working

### **Phase 4 Complete When:**
- [ ] Unified communication timeline fully functional
- [ ] Cross-communication search working effectively
- [ ] Email and flagged item integration seamless
- [ ] Performance optimized for high email volumes

### **Phase 5 Complete When:**
- [ ] Outlook integration fully functional alongside Gmail
- [ ] Smart notification system operational
- [ ] Communication analytics providing valuable insights
- [ ] Multi-account management working correctly

---

## 🧪 **Behavior-Driven Test Strategy**

### **Test Framework Structure**
```gherkin
Feature: Enhanced Email Processing for Homeowners
  As a homeowner managing my renovation project
  I want comprehensive email processing and analysis
  So that I never miss important project communications

Background:
  Given I am a homeowner with an active renovation project
  And I have team members with known email addresses

Scenario: Gmail Connection for Project Monitoring
  Given I want to monitor my renovation project emails
  When I click "Connect Gmail" in my project settings
  And I complete the Google OAuth flow
  Then my Gmail account is connected to my project
  And I see "Email Monitoring: Active" status
  And real-time email capture begins

Scenario: Automatic Project Email Detection
  Given my Gmail is connected to my kitchen renovation project
  When my contractor sends an email about cabinet installation
  Then the email is captured within 30 seconds
  And assigned to my kitchen renovation project
  And categorized as "General Communication"
  And appears in my project's communication timeline

Scenario: Change Detection from Email
  Given I receive an email from my contractor
  And the email contains "The flooring will cost an additional $2,000"
  When AI processes the email
  Then a flagged item is created with category "COST"
  And the impact is recorded as "+$2,000"
  And the flagged item links to the original email
  And I receive a notification about the change

Scenario: Unified Communication Timeline
  Given I have email history and confirmed flagged items
  When I view my project's communications timeline
  Then I see emails and changes integrated chronologically
  And can search across both emails and flagged items
  And can jump between related emails and changes
  And see the complete story of my project evolution
```

### **Integration Test Categories**
1. **Email Connection Tests** - OAuth flow, real-time capture, security
2. **AI Analysis Tests** - Relevance detection, categorization, extraction accuracy
3. **Project Integration Tests** - Assignment logic, flagged item creation, timeline integration
4. **Dashboard Integration Tests** - Timeline view, search functionality, performance
5. **Multi-Provider Tests** - Gmail + Outlook integration, unified processing
6. **User Experience Tests** - End-to-end homeowner workflows, notification system

This revised plan maintains focus on the homeowner persona while building on your existing email monitoring and flagged items foundation, creating a comprehensive communication tracking system for renovation projects. 