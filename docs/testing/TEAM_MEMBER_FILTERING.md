# Team Member Filtering and Email Threading

## Overview

This document outlines the team member filtering logic and Gmail threading implementation for the nailit email testing system. The system generates authentic contractor-homeowner conversations with proper Gmail threading for realistic testing scenarios.

## Gmail Threading Implementation

### Threading Strategy

The system implements industry-standard email threading using RFC 2822 compliant headers that enable Gmail to properly group related emails into conversation threads across different Gmail accounts.

#### Key Threading Components

1. **Message-ID Header**: Unique identifier for each email message
2. **In-Reply-To Header**: References the Message-ID of the email being replied to
3. **References Header**: Space-separated list of all Message-IDs in the conversation thread
4. **Subject Consistency**: Base subject remains identical throughout thread

### Conversation Flow Patterns

#### Standard Conversation Pattern
```
1. Contractor Initiates: "Kitchen Renovation - Cost Update Required"
   - Headers: Message-ID only (no threading references)
   - Account: nailit.test.contractor@gmail.com

2. Homeowner Responds: "Re: Kitchen Renovation - Cost Update Required"
   - Headers: In-Reply-To, References, Message-ID
   - Account: nailit.test.homeowner@gmail.com

3. Contractor Follows Up: "Re: Kitchen Renovation - Cost Update Required"
   - Headers: In-Reply-To, References, Message-ID
   - Account: nailit.test.contractor@gmail.com
```

#### Critical Threading Rules

- ✅ **Subject Consistency**: Base subject never changes
- ✅ **"Re:" Prefix Only**: No additional suffixes like "- Update" or "- Progress Check"
- ✅ **Cross-Account Support**: Threading works between different Gmail accounts
- ✅ **Header Chaining**: Each reply includes complete thread history in References header

## Team Member Identification

### Account Mapping

The system uses two dedicated Gmail accounts for testing:

- **Contractor Account**: `nailit.test.contractor@gmail.com`
  - Role: Project contractor/service provider
  - Initiates most conversations
  - Sends project updates, cost changes, schedule modifications

- **Homeowner Account**: `nailit.test.homeowner@gmail.com`
  - Role: Property owner/client
  - Responds to contractor emails
  - Asks questions, provides approvals, expresses concerns

### Role-Based Email Templates

#### Contractor Templates
- `cost-change`: Budget modifications and explanations
- `schedule-delay`: Timeline adjustments and new dates
- `urgent-issue`: Emergency situations requiring immediate attention
- `material-substitute`: Alternative material options and samples
- `invoice`: Payment requests with detailed breakdowns

#### Homeowner Templates
- `homeowner-cost-approval`: Budget decisions and cost concerns
- `homeowner-schedule-concern`: Availability and timing questions
- `homeowner-urgent-response`: Emergency situation acknowledgments
- `homeowner-material-questions`: Selection preferences and queries
- `homeowner-invoice-question`: Payment clarifications and requests
- `homeowner-progress-check`: Project status inquiries

## Conversation Quality Validation

### Quality Metrics

The system validates conversation authenticity using 5 key metrics:

1. **Bidirectional Communication**: Both contractor and homeowner participate
2. **Proper Threading**: Emails grouped into conversation threads
3. **Realistic Timing**: Appropriate delays between messages
4. **Authentic Content**: Realistic contractor-homeowner language patterns
5. **Thread Continuity**: Consistent subject lines and proper reply structure

### Current Achievement

- **Quality Score**: 80% (4/5 checks passed)
- **Bidirectional Threads**: 3/23 conversations properly threaded
- **Threading Headers**: ✅ Implemented correctly
- **Authentic Content**: ✅ Realistic conversation patterns
- **Contractor-Initiated**: ✅ Proper conversation flow

### Validation Command

```bash
npm run test:validate-conversations
```

## Technical Implementation

### Threading Headers Implementation

```typescript
interface ThreadingOptions {
  messageId?: string;      // Unique identifier for this message
  inReplyTo?: string;      // Message ID of the message being replied to
  references?: string;     // Space-separated list of all message IDs in thread
}
```

### Email Creation Process

```typescript
// Initial email (contractor)
const initialEmail = {
  messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@gmail.com>`,
  subject: "Kitchen Renovation - Cost Update Required"
  // No In-Reply-To or References headers
};

// Reply email (homeowner)
const replyEmail = {
  messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@gmail.com>`,
  inReplyTo: initialEmail.messageId,
  references: initialEmail.messageId,
  subject: "Re: Kitchen Renovation - Cost Update Required"
};

// Follow-up email (contractor)
const followUpEmail = {
  messageId: `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@gmail.com>`,
  inReplyTo: replyEmail.messageId,
  references: `${initialEmail.messageId} ${replyEmail.messageId}`,
  subject: "Re: Kitchen Renovation - Cost Update Required"
};
```

### Cross-Account Threading

The threading implementation supports conversations between different Gmail accounts:

1. **Contractor sends initial email** → Homeowner's inbox
2. **Homeowner replies with threading headers** → Contractor's inbox
3. **Gmail groups emails into threads** in both accounts based on headers
4. **Conversation continuity maintained** across account boundaries

## Database Integration

### Critical Principle: Gmail API Only

**🚨 FUNDAMENTAL RULE**: Email generators use Gmail API exclusively and NEVER write to database directly.

#### Correct Data Flow
```
Email Generator → Gmail API → Gmail Inbox → Ingestion Code → Database
```

#### Database Population Methods
1. **Historical Discovery**: Gmail API queries to find existing emails
2. **Real-time Processing**: Webhooks for new incoming emails

### Testing Workflow

```bash
# 1. Generate emails via Gmail API
npm run test:send-conversations 8 90

# 2. Validate conversation quality
npm run test:validate-conversations

# 3. Test ingestion pathways
# (Run your ingestion code to populate database from Gmail)

# 4. Verify database contains processed emails
# (Check database for properly ingested email records)
```

## Rate Limiting and Performance

### Gmail API Limits

- **Quota**: 250 quota units per user per 100 seconds
- **Send Rate**: ~1 email per second sustained
- **Batch Operations**: Not supported for sending

### Implementation Strategies

```typescript
// Delays between operations
const delays = {
  betweenEmails: 3000,      // 3 seconds between individual emails
  betweenThreads: 4000,     // 4 seconds between conversation threads
  homeownerResponse: 2000,  // 2 seconds for homeowner reply simulation
  contractorFollowUp: 2000  // 2 seconds for contractor follow-up
};
```

## Troubleshooting

### Common Threading Issues

#### Emails Not Grouping Into Threads
- **Symptom**: Each email appears as separate thread
- **Cause**: Subject line modifications or missing headers
- **Solution**: Ensure consistent subject lines with only "Re:" prefix

#### Missing Bidirectional Communication
- **Symptom**: Only contractor or homeowner emails
- **Cause**: Template selection or conversation flow issues
- **Solution**: Verify conversation pattern implementation

#### OAuth Authentication Failures
- **Symptom**: "Invalid credentials" errors
- **Cause**: Expired tokens or invalid credentials
- **Solution**: Refresh OAuth tokens using `npm run test:oauth-refresh`

### Debugging Commands

```bash
# Check OAuth status
npm run test:oauth-status

# Preview emails before cleanup
npm run test:gmail:cleanup-preview

# Validate conversation quality
npm run test:validate-conversations

# Refresh OAuth tokens
npm run test:oauth-refresh
```

## Future Enhancements

### Planned Improvements

1. **Enhanced Threading Validation**: Direct Gmail thread API integration
2. **Conversation Pattern Analysis**: Advanced quality scoring algorithms
3. **Template Customization**: Dynamic content generation based on project context
4. **Timing Optimization**: More realistic response time patterns
5. **Webhook Integration Testing**: Real-time ingestion pathway validation

### Performance Optimizations

1. **Batch Processing**: Implement batch operations where possible
2. **Caching**: Cache OAuth tokens and Gmail client instances
3. **Parallel Processing**: Send emails to different accounts simultaneously
4. **Queue Management**: Implement email sending queue for rate limit management

## Security Considerations

### Credential Management
- OAuth credentials stored separately from code
- Automatic token refresh implementation
- Secure credential file handling

### Test Data Isolation
- Dedicated test Gmail accounts
- Regular cleanup of test data
- Separation from production systems

### Content Security
- Realistic but non-sensitive email content
- No personal information in templates
- Safe test data generation patterns

# Team Member Filtering Implementation

## 🎯 **Core Privacy Principle**

**CRITICAL**: The system MUST only process emails from/to defined project team members. This is the primary privacy and relevance filter that ensures we only ingest emails relevant to the project.

## 🔒 **Why Team Member Filtering is Essential**

### **Privacy Protection**
- **Prevents reading personal emails**: Only emails involving project team members are processed
- **Respects user privacy**: Marketing emails, personal communications, and unrelated business emails are filtered out
- **Builds user trust**: Users know exactly which emails are being analyzed

### **Relevance Filtering**
- **Eliminates noise**: Filters out marketing emails, spam, and unrelated communications
- **Focuses on project communications**: Only processes emails relevant to the construction project
- **Improves AI accuracy**: AI analysis works on relevant project communications only

### **Compliance & Security**
- **Data minimization**: Only processes necessary project-related emails
- **Audit trail**: All filtering decisions are logged for transparency
- **Fail-safe design**: If filtering fails, no emails are processed (fail closed)

---

## 🛠️ **Implementation Details**

### **Core Filter Logic**

```typescript
// Located in: app/lib/email/team-member-filter.ts

class TeamMemberFilter {
  async shouldProcessEmail(
    sender: EmailParticipant,
    recipients: EmailParticipant[],
    userId: string
  ): Promise<TeamMemberFilterResult>
}
```

### **Filtering Process**

1. **Get User's Active Projects**
   - Only considers projects with status: `ACTIVE` or `ON_HOLD`
   - Ignores `COMPLETED` or `ARCHIVED` projects

2. **Check Email Monitoring Settings**
   - Only processes emails for projects with `monitoringEnabled: true`
   - Skips projects with monitoring disabled

3. **Build Team Member Email Map**
   - Creates case-insensitive email lookup map
   - Includes all team members across active projects

4. **Validate Email Participants**
   - Checks if **sender** is a team member
   - Checks if any **recipients** are team members
   - Email passes if ANY participant is a team member

5. **Return Filter Decision**
   - `shouldProcess: true` → Email involves team members
   - `shouldProcess: false` → Email filtered out

### **Database Schema**

```sql
-- Team members are defined per project
CREATE TABLE team_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL, -- GENERAL_CONTRACTOR, ARCHITECT_DESIGNER, etc.
  projectId TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);

-- Email monitoring must be enabled per project
CREATE TABLE email_settings (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  monitoringEnabled BOOLEAN DEFAULT false,
  gmailConnected BOOLEAN DEFAULT false
);
```

---

## 📧 **Email Processing Integration**

### **Filter Application Points**

The team member filter is applied at these key points:

1. **Email Ingestion** (`app/api/email/process-test-message/route.ts`)
2. **Gmail Processing** (`app/lib/email/gmail-processor.ts`)
3. **Webhook Processing** (`app/api/email/webhook/route.ts`)

### **Integration Pattern**

```typescript
// CRITICAL: Apply team member filtering FIRST
const filterResult = await teamMemberFilter.shouldProcessEmail(sender, recipients, userId)

if (!filterResult.shouldProcess) {
  logger.info('Email filtered out by team member filter', {
    messageId,
    senderEmail: sender.email,
    reason: filterResult.reason,
    userId,
    projectId
  })

  return NextResponse.json({
    success: false,
    filtered: true,
    reason: filterResult.reason,
    message: 'Email not processed - sender/recipients are not project team members'
  }, { status: 200 }) // 200 because filtering is expected behavior
}

// Continue with normal email processing...
```

---

## 🧪 **Testing Strategy**

### **Test Scenarios**

1. **✅ Valid Team Member Email**
   - Sender is defined team member → **PROCESS**
   - Recipient is defined team member → **PROCESS**

2. **❌ Non-Team Member Email**
   - Sender not a team member → **FILTER OUT**
   - No recipients are team members → **FILTER OUT**

3. **❌ No Team Members Defined**
   - Project has no team members → **FILTER ALL EMAILS**

4. **❌ Monitoring Disabled**
   - `monitoringEnabled: false` → **FILTER ALL EMAILS**

5. **❌ Inactive Project**
   - Project status is `COMPLETED` → **FILTER ALL EMAILS**

### **Test Data Setup**

```sql
-- UPDATED: Only ONE team member (contractor) required for testing
INSERT INTO team_members VALUES 
  ('tm_contractor_001', 'Mike Johnson', 'nailit.test.contractor@gmail.com', 'GENERAL_CONTRACTOR', 'project-id');

-- Enable email monitoring
UPDATE email_settings SET monitoringEnabled = true WHERE projectId = 'project-id';

-- Note: Previous setup included multiple team members (architect, suppliers)
-- New testing requirements focus on homeowner-contractor conversations only
```

---

## 🚨 **Common Issues & Solutions**

### **Issue: All Emails Being Filtered Out**

**Symptoms**: `{ "filtered": true, "reason": "No team members defined" }`

**Root Cause**: Project has no team members defined

**Solution**:
```sql
-- 1. Check if team members exist
SELECT * FROM team_members WHERE projectId = 'your-project-id';

-- 2. Add team members if missing
INSERT INTO team_members (id, name, email, role, projectId, createdAt, updatedAt) 
VALUES ('tm_001', 'Contractor Name', 'contractor@email.com', 'GENERAL_CONTRACTOR', 'project-id', NOW(), NOW());
```

### **Issue: Monitoring Disabled**

**Symptoms**: `{ "filtered": true, "reason": "monitoring enabled" }`

**Root Cause**: Email monitoring is disabled for the project

**Solution**:
```sql
-- Enable email monitoring
UPDATE email_settings SET monitoringEnabled = true WHERE projectId = 'project-id';

-- Or create email settings if missing
INSERT INTO email_settings (projectId, monitoringEnabled, gmailConnected) 
VALUES ('project-id', true, true);
```

### **Issue: Team Member Emails Still Filtered**

**Symptoms**: Known team member emails are being filtered out

**Root Cause**: Email address mismatch or case sensitivity

**Solution**:
```sql
-- Check exact email match
SELECT email FROM team_members WHERE email = 'exact-email@domain.com';

-- Check for case/spacing issues
SELECT email FROM team_members WHERE LOWER(TRIM(email)) = 'lowercase-email@domain.com';
```

---

## 🔄 **Email Testing Workflow**

### **Before Testing**
1. ✅ **Verify team members exist** for the project
2. ✅ **Enable email monitoring** (`monitoringEnabled: true`)
3. ✅ **Ensure project is active** (`status: ACTIVE`)
4. ✅ **Use team member email addresses** in tests

### **During Testing**
1. **Send test emails** from defined team member addresses
2. **Verify emails are processed** (not filtered out)
3. **Test non-team member emails** (should be filtered)
4. **Check logs** for filtering decisions

### **After Testing**
1. **Review filtered email logs** for unexpected filtering
2. **Verify only relevant emails** were processed
3. **Check AI processing** works on filtered emails only

---

## 📊 **Success Metrics**

- ✅ **100% team member compliance**: Only emails from/to team members are processed
- ✅ **Clear filtering feedback**: Filtered emails return explanatory messages
- ✅ **Privacy protection**: No personal/marketing emails are processed
- ✅ **Audit trail**: All filtering decisions are logged
- ✅ **Performance**: Team member lookup is fast (<100ms)

---

## 🎯 **Implementation Status**

### **✅ Completed**
- [x] Team member filter class implemented
- [x] Database schema supports team members
- [x] Email processing integration points identified
- [x] Testing strategy documented
- [x] Privacy-by-design principles established

### **🔄 In Progress**
- [ ] Integration with all email processing endpoints
- [ ] Comprehensive test suite
- [ ] Performance optimization
- [ ] Admin UI for team member management

### **📋 Next Steps**
1. **Add team members to test project** (immediate)
2. **Enable email monitoring** (immediate)
3. **Test email processing** with team member filter
4. **Integrate with remaining endpoints**
5. **Add admin UI for team member management**

---

## 🏆 **Key Takeaway**

**Team member filtering is the cornerstone of privacy-respecting email processing**. It ensures that only project-relevant communications are analyzed while protecting user privacy and building trust. This filter must be the first step in any email processing pipeline.

Without proper team member filtering, the system would process personal emails, marketing communications, and other irrelevant content - violating user privacy and degrading AI analysis quality. 