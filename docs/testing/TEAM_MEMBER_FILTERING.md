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