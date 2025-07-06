# Prompt Architecture Strategy: Construction Email Processing

## Executive Summary

This document outlines our modular prompt architecture for processing construction project emails using OpenAI's GPT-4o. Our approach uses structured, composable prompts that inject dynamic project context to achieve reliable email classification, summarization, and entity extraction for construction projects.

## MVP Requirements Recap

### Core Functionality
1. **Email Classification**: Categorize emails by type (invoice, change order, progress update, etc.)
2. **Content Summarization**: Extract key information and create concise summaries
3. **Entity Extraction**: Identify contractors, dates, amounts, materials, locations
4. **Project Context Integration**: Use project details to improve accuracy
5. **Structured Output**: Return consistent JSON format for database storage

### Success Criteria
- **Accuracy**: 85%+ correct classification and key information extraction
- **Consistency**: Standardized output format across all email types
- **Context Awareness**: Leverage project details for better understanding
- **Extensibility**: Easy to add new email types and analysis features

## Prompt Architecture Overview

### 1. Modular Prompt System

Our architecture uses a **three-layer prompt structure**:

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM PROMPT                            │
│  • Role definition (construction project analyst)          │
│  • Output format requirements (JSON schema)                │
│  • General guidelines and constraints                      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  CONTEXT INJECTION                         │
│  • Project details (name, address, team members)           │
│  • Construction type and phase                             │
│  • Known contractors and vendors                           │
│  • Budget and timeline context                             │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  EMAIL ANALYSIS PROMPT                     │
│  • Email content and metadata                              │
│  • Specific analysis instructions                          │
│  • Classification categories                               │
│  • Key information extraction targets                      │
└─────────────────────────────────────────────────────────────┘
```

### 2. Why This Architecture Works

**Modularity**: Each layer has a specific responsibility, making the system maintainable and testable.

**Context Awareness**: Dynamic project context injection ensures the AI understands the specific project environment.

**Consistency**: Standardized system prompt ensures uniform output format across all emails.

**Extensibility**: New email types or analysis features can be added by modifying specific prompt components.

**Reliability**: Structured approach reduces hallucination and improves accuracy through clear constraints.

## Detailed Prompt Components

### Layer 1: System Prompt (Static)

```typescript
const SYSTEM_PROMPT = `You are a construction project analyst specializing in email processing for residential and commercial construction projects. Your role is to analyze construction-related emails and extract key information in a structured format.

CRITICAL REQUIREMENTS:
- Always respond with valid JSON matching the specified schema
- Focus on construction-specific terminology and context
- Identify key stakeholders, timelines, costs, and materials
- Classify emails by their primary purpose in the construction workflow
- Extract actionable items and important dates
- Maintain professional objectivity in summaries

OUTPUT FORMAT:
You must respond with a JSON object matching this exact schema:
{
  "classification": {
    "primary_type": "string", // invoice, change_order, progress_update, etc.
    "confidence": "number",   // 0-1 confidence score
    "sub_categories": ["string"] // additional relevant categories
  },
  "summary": {
    "key_points": ["string"],     // 3-5 most important points
    "action_items": ["string"],   // specific tasks or requests
    "timeline_mentions": ["string"] // dates, deadlines, schedules
  },
  "entities": {
    "contractors": ["string"],    // company names and individuals
    "materials": ["string"],      // building materials mentioned
    "locations": ["string"],      // specific areas/rooms/addresses
    "amounts": ["string"],        // costs, quantities, measurements
    "dates": ["string"]          // formatted dates (YYYY-MM-DD)
  },
  "priority": "string",          // high, medium, low
  "requires_response": "boolean", // does this email need a reply?
  "attachments_mentioned": "boolean" // are attachments referenced?
}`;
```

### Layer 2: Context Injection (Dynamic)

```typescript
const buildProjectContext = (project: Project): string => {
  return `PROJECT CONTEXT:
Name: ${project.name}
Type: ${project.type} (${project.phase})
Address: ${project.address}
Budget: ${project.budget}
Timeline: ${project.start_date} to ${project.estimated_completion}

TEAM MEMBERS:
${project.team_members.map(member => 
  `- ${member.name} (${member.role}) - ${member.email}`
).join('\n')}

KNOWN CONTRACTORS:
${project.contractors.map(contractor => 
  `- ${contractor.company} - ${contractor.specialty}`
).join('\n')}

CURRENT PHASE: ${project.current_phase}
Key activities: ${project.phase_activities.join(', ')}

This context should inform your analysis of the email content.`;
};
```

### Layer 3: Email Analysis Prompt (Dynamic)

```typescript
const buildEmailAnalysisPrompt = (email: EmailMessage): string => {
  return `ANALYZE THIS EMAIL:

FROM: ${email.from}
TO: ${email.to}
SUBJECT: ${email.subject}
DATE: ${email.date}

CONTENT:
${email.body}

ANALYSIS INSTRUCTIONS:
1. Classify this email based on its primary purpose in the construction workflow
2. Extract key information relevant to project management
3. Identify any action items or deadlines
4. Note any mentions of costs, materials, or schedule changes
5. Assess the priority level based on content urgency
6. Determine if this email requires a response from the project team

Consider the project context provided above when making your analysis.`;
};
```

## Email Classification Framework

### Primary Categories

| Category | Description | Key Indicators |
|----------|-------------|----------------|
| **invoice** | Bills, payment requests, receipts | Amount, "invoice", "payment due", "bill" |
| **change_order** | Scope changes, additional work | "change order", "additional", "scope", cost increase |
| **progress_update** | Work status, completion reports | "progress", "completed", "status", photos |
| **schedule_update** | Timeline changes, delays | "schedule", "delay", "timeline", dates |
| **material_delivery** | Supply arrivals, shortages | "delivery", "materials", "supplies", "shortage" |
| **inspection** | Code compliance, quality checks | "inspection", "permit", "code", "compliance" |
| **communication** | General project coordination | Meeting requests, clarifications, updates |
| **issue_report** | Problems, concerns, defects | "problem", "issue", "concern", "defect" |

### Sub-Categories (Multi-label)

- `urgent` - Requires immediate attention
- `financial` - Involves money/payments
- `regulatory` - Permits, inspections, compliance
- `safety` - Safety concerns or protocols
- `quality` - Quality control issues
- `vendor` - Vendor/supplier communications

## Context Integration Strategy

### 1. Team Member Recognition
```typescript
// Enhanced accuracy by knowing who's who
const recognizeTeamMembers = (email: EmailMessage, project: Project) => {
  const fromMember = project.team_members.find(m => m.email === email.from);
  const role = fromMember ? fromMember.role : 'external';
  
  return {
    sender_role: role,
    is_team_member: !!fromMember,
    relationship: determineRelationship(email.from, project)
  };
};
```

### 2. Project Phase Awareness
```typescript
// Tailor analysis based on construction phase
const getPhaseContext = (project: Project): string => {
  const phasePrompts = {
    'planning': 'Focus on permits, designs, contractor selection',
    'foundation': 'Emphasize excavation, concrete, inspections',
    'framing': 'Look for structural elements, lumber, inspections',
    'systems': 'Electrical, plumbing, HVAC installations',
    'finishing': 'Interior work, fixtures, final inspections',
    'completion': 'Punch lists, final payments, warranties'
  };
  
  return phasePrompts[project.phase] || 'General construction activities';
};
```

### 3. Budget and Timeline Awareness
```typescript
// Highlight financial and schedule implications
const getBudgetContext = (project: Project): string => {
  return `Budget awareness: Total budget $${project.budget}, 
    spent $${project.spent_to_date}, 
    remaining $${project.budget - project.spent_to_date}.
    Timeline: ${project.days_remaining} days remaining.
    Flag any mentions of costs over $${project.change_order_threshold}.`;
};
```

## Quality Assurance Strategy

### 1. Prompt Validation
- **Schema Validation**: Ensure all prompts produce valid JSON
- **Content Validation**: Verify extracted information accuracy
- **Context Validation**: Confirm project context is properly utilized

### 2. Confidence Scoring
```typescript
const assessConfidence = (analysis: EmailAnalysis): number => {
  let confidence = 0.5; // baseline
  
  // Increase confidence for clear indicators
  if (analysis.classification.primary_type === 'invoice' && 
      analysis.entities.amounts.length > 0) {
    confidence += 0.3;
  }
  
  // Decrease confidence for ambiguous content
  if (analysis.summary.key_points.length < 2) {
    confidence -= 0.2;
  }
  
  return Math.max(0, Math.min(1, confidence));
};
```

### 3. Fallback Strategies
- **Low Confidence**: Flag for manual review
- **Parse Errors**: Retry with simplified prompt
- **Missing Context**: Use generic construction prompt

## Implementation Roadmap

### Phase 1: Core Classification (Week 1-2)
- Implement basic system prompt
- Build project context injection
- Create email analysis prompt
- Test with sample emails

### Phase 2: Enhanced Extraction (Week 3-4)
- Refine entity extraction
- Add confidence scoring
- Implement fallback strategies
- Performance optimization

### Phase 3: Context Intelligence (Week 5-6)
- Advanced project phase awareness
- Team member relationship mapping
- Budget/timeline integration
- Quality assurance framework

### Phase 4: Production Readiness (Week 7-8)
- Error handling and monitoring
- Performance metrics
- Documentation and testing
- Deployment preparation

## Success Metrics

### Accuracy Targets
- **Classification Accuracy**: 85%+ correct primary category
- **Entity Extraction**: 90%+ for key entities (amounts, dates, contractors)
- **Summary Quality**: 80%+ of key points captured
- **Context Utilization**: 75%+ of project context references utilized

### Performance Targets
- **Response Time**: <3 seconds per email
- **Cost Efficiency**: <$0.01 per email processed
- **Reliability**: 99.5% uptime, graceful error handling

## Risk Mitigation

### Technical Risks
- **Prompt Injection**: Sanitize email content, validate outputs
- **Context Overflow**: Implement context truncation strategies
- **API Failures**: Implement retry logic and fallback processing

### Business Risks
- **Accuracy Degradation**: Continuous monitoring and prompt refinement
- **Cost Overruns**: Usage monitoring and budget alerts
- **Data Privacy**: Ensure no sensitive data in prompts/logs

## Conclusion

This modular prompt architecture provides a robust foundation for construction email processing that:

1. **Meets MVP Requirements**: Delivers accurate classification, summarization, and extraction
2. **Scales Effectively**: Modular design supports future enhancements
3. **Maintains Quality**: Built-in validation and confidence scoring
4. **Integrates Context**: Leverages project information for better accuracy
5. **Handles Edge Cases**: Fallback strategies and error handling

The architecture balances sophistication with maintainability, ensuring we can deliver a reliable MVP while building toward advanced features. 