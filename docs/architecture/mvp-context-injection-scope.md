# MVP Context Injection Scope

## MVP Goal Alignment

**Primary Goal**: Support structured email analysis with high confidence for construction project communications

**Secondary Goal**: Enable team member-based email filtering and relevance assessment

## Required Context (MVP Scope Only)

### 1. Project Identification Context
**Purpose**: Help AI understand what project emails relate to
**Fields Used**:
- `name` - Project identification
- `description` - Project scope understanding
- `address` - Location context for email relevance

**AI Impact**: Improves email relevance classification and project-specific entity extraction

### 2. Team Member Context
**Purpose**: Enable team member recognition and role-based analysis
**Fields Used**:
- `teamMembers` - Complete team roster with roles and emails

**AI Impact**: 
- Identifies team member communications vs. external parties
- Provides role context for communication importance
- Supports email filtering by team member relevance

### 3. Basic Timeline Context
**Purpose**: Provide temporal context for urgency assessment
**Fields Used**:
- `startDate` - Project start for context
- `endDate` - Estimated completion for urgency context

**AI Impact**: Helps assess time-sensitive communications and urgency levels

### 4. Budget Context
**Purpose**: Enable cost-related communication identification
**Fields Used**:
- `budget` - Total budget for cost impact assessment

**AI Impact**: Helps identify significant cost discussions and change orders

## Removed Scope Creep

### ❌ Estimated Project Phases
- **Reason**: Not a requirement, no UI support, adds complexity without value
- **Impact**: Removed phase estimation logic and phase-specific guidance

### ❌ Generic Risk Assessments  
- **Reason**: Not project-specific, not actionable, not a requirement
- **Impact**: Removed generic risk context injection

### ❌ Complex Progress Calculations
- **Reason**: Time-based progress isn't meaningful without work tracking
- **Impact**: Simplified to basic timeline awareness only

### ❌ Multi-Layer Context Architecture
- **Reason**: Over-engineered for MVP needs
- **Impact**: Simplified to single context builder with essential fields only

## Simplified Implementation

### Basic Context Only
```typescript
interface MVPProjectContext {
  projectInfo: {
    name: string;
    description: string;
    address: string;
    budget: number;
  };
  timeline: {
    startDate: string;
    endDate: string;
  };
  team: TeamMember[];
}
```

### Context Prompt Format
```
PROJECT: {name}
DESCRIPTION: {description}
LOCATION: {address}
BUDGET: ${budget}
TIMELINE: {startDate} to {endDate}

TEAM MEMBERS:
- {name} ({role}) - {email}
[repeat for each team member]

ANALYSIS FOCUS:
- Identify communications from team members vs. external parties
- Assess cost implications relative to project budget
- Evaluate urgency based on project timeline
- Extract project-relevant entities and action items
```

## Historical AI Output Storage

### Question: Should we store complete AI analysis results?

**Arguments For**:
- Enables historical pattern analysis
- Supports audit trail for AI decisions
- Allows for future augmented analysis
- Provides training data for model improvements

**Arguments Against**:
- Significant storage costs (large JSON objects)
- Privacy concerns with detailed analysis storage
- May not be needed for MVP functionality

### Recommendation: Store Core Results Only

**Store**:
- Classification and confidence
- Key entities (amounts, dates, contractors)
- Priority level and requires_response flag
- Processing metadata (model, timestamp, processing time)

**Don't Store**:
- Full summary text (can be regenerated)
- Detailed reasoning (not needed for MVP)
- Complete entity lists (store only actionable items)

```sql
-- Simplified EmailAnalysis storage
CREATE TABLE email_analyses (
  id CUID PRIMARY KEY,
  email_message_id CUID REFERENCES email_messages(id),
  project_id CUID REFERENCES projects(id),
  
  -- Core classification
  primary_type VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  priority VARCHAR(10) NOT NULL,
  requires_response BOOLEAN DEFAULT FALSE,
  
  -- Key entities only
  key_amounts DECIMAL(10,2)[], -- Important cost figures
  key_dates DATE[], -- Critical dates mentioned
  key_contractors TEXT[], -- Mentioned team members/contractors
  
  -- Processing metadata
  model_used VARCHAR(50) NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  
  -- Full analysis (optional, for debugging)
  full_analysis_json JSONB, -- Can be null to save space
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Success Metrics (MVP Aligned)

### Primary Metrics
- **Classification Accuracy**: >90% correct email type identification
- **Team Member Recognition**: >95% accurate team member identification
- **Cost Extraction**: >85% accurate cost figure extraction
- **Processing Performance**: <5 seconds per email

### Secondary Metrics
- **User Satisfaction**: Users find AI analysis helpful for email triage
- **False Positive Rate**: <10% irrelevant emails flagged as important
- **Coverage**: AI can process >95% of construction-related emails

## Implementation Priority

### Phase 1 (Current Sprint)
1. ✅ Basic context injection with essential fields only
2. ✅ Team member recognition and role context
3. ✅ Structured JSON output with high confidence
4. ✅ Core entity extraction (costs, dates, contractors)

### Phase 2 (Future - Post MVP)
1. Historical analysis pattern recognition
2. Enhanced entity extraction
3. Confidence threshold tuning
4. Performance optimization

## Conclusion

By focusing on MVP requirements only, we:
- Reduce complexity and maintenance burden
- Improve system reliability and performance
- Deliver actual value for stated user needs
- Avoid premature optimization and scope creep

The simplified context provides exactly what's needed for high-confidence structured email analysis without unnecessary complexity.

---

*Scope Definition: July 5, 2025*  
*Status: MVP-Aligned Implementation* 