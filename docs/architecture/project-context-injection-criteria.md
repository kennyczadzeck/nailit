# Project Context Injection Criteria

## Overview

This document defines the comprehensive criteria for injecting project context into AI email analysis. The goal is to utilize ALL available project data to provide the most accurate and contextually-aware analysis possible.

## Available Project Fields

### Core Project Data (from Project model)
- **id**: Unique project identifier
- **name**: Project name/title
- **description**: Project description
- **status**: Project status (ACTIVE, ARCHIVED)
- **startDate**: Project start date
- **endDate**: Project end date (estimated completion)
- **createdAt**: Project creation timestamp
- **updatedAt**: Project last update timestamp

### Project Details
- **contractor**: Primary contractor name (legacy field)
- **budget**: Total project budget (Float)
- **address**: Project address
- **addressPlaceId**: Google Places ID for location
- **addressLat**: Latitude coordinate
- **addressLng**: Longitude coordinate

### Related Data (via relations)
- **userId**: Owner/homeowner ID
- **user**: User object with name, email, image
- **teamMembers**: Array of team members with:
  - name, email, role (GENERAL_CONTRACTOR, ARCHITECT_DESIGNER, PROJECT_MANAGER)
- **emailSettings**: Email monitoring configuration
- **flaggedItems**: Historical flagged items and issues
- **timelineEntries**: Project timeline and milestones
- **emailMessages**: All project-related emails
- **emailAnalyses**: Historical AI analysis results

## Context Injection Strategy

### 1. Basic Project Information
**Purpose**: Provide fundamental project understanding
**Fields Used**:
- `name` - Project identification
- `description` - Project scope and type
- `address` - Location context for building codes, weather, regulations
- `status` - Current project state
- `createdAt` - Project age and maturity

**AI Analysis Impact**:
- Helps classify email relevance to project
- Provides context for location-specific considerations
- Informs about project maturity and expected communication patterns

### 2. Timeline Context
**Purpose**: Enable schedule-aware analysis
**Fields Used**:
- `startDate` - Project timeline beginning
- `endDate` - Estimated completion (NOT contractual deadline)
- `createdAt` - Project setup timeline
- `timelineEntries` - Historical milestones and events

**Derived Metrics**:
- Days elapsed since start
- Days remaining until estimated completion
- Time-based progress percentage (NOT work completion)
- Schedule status (estimated, not actual)

**⚠️ Current Limitations**:
- No actual work progress tracking
- No contractual deadline data
- No milestone completion tracking
- Progress is time-based only, not work-based

**AI Analysis Impact**:
- Identifies schedule-sensitive communications
- Provides timeline context for urgency assessment
- Contextualizes time-related requests and issues

**📋 Backlog Items**:
- Add actual work progress tracking
- Add contractual deadline support
- Add milestone completion tracking
- Add contract terms integration for real deadlines

### 3. Budget Context
**Purpose**: Enable cost-aware analysis
**Fields Used**:
- `budget` - Total project budget
- `flaggedItems` - Historical cost-related issues
- `timelineEntries` - Budget-impacting events

**Derived Metrics**:
- Budget utilization estimates
- Change order patterns
- Cost escalation trends

**AI Analysis Impact**:
- Identifies cost-impacting communications
- Flags potential budget overruns
- Recognizes change order requests and approvals

### 4. Team Context
**Purpose**: Enable role-aware communication analysis
**Fields Used**:
- `teamMembers` - Complete team roster with roles
- `user` - Project owner information
- `emailMessages` - Communication patterns

**Derived Insights**:
- Communication frequency by role
- Decision-making authority levels
- Escalation patterns

**AI Analysis Impact**:
- Filters emails by team member relevance
- Identifies communication gaps or conflicts
- Recognizes authority levels for approvals

### 5. Location Context
**Purpose**: Enable location-aware analysis
**Fields Used**:
- `address` - Full project address
- `addressPlaceId` - Google Places reference
- `addressLat`/`addressLng` - Precise coordinates

**Derived Insights**:
- General location awareness for context
- Seasonal considerations based on current date
- Basic geographic context

**⚠️ Current Limitations**:
- No actual building code integration
- No permit tracking system
- No weather data integration
- No inspection schedule tracking

**AI Analysis Impact**:
- Provides basic location context
- Identifies seasonal considerations
- Enables location-aware communication analysis

**📋 Backlog Items**:
- Add building code database integration
- Add permit tracking system
- Add weather data integration
- Add inspection schedule management

### 6. Historical Context
**Purpose**: Enable pattern-aware analysis
**Fields Used**:
- `flaggedItems` - Past issues and resolutions
- `timelineEntries` - Project history
- `emailAnalyses` - Previous AI analysis results
- `emailMessages` - Communication history

**Derived Insights**:
- Recurring issue patterns
- Communication trend analysis
- Vendor/contractor performance patterns

**AI Analysis Impact**:
- Identifies recurring problems
- Recognizes communication patterns
- Provides context for vendor relationships

### 7. Phase Context (⚠️ ESTIMATED DATA)
**Purpose**: Enable phase-appropriate analysis
**Fields Used**:
- Timeline-based phase estimation (no actual phase data)
- Project duration and elapsed time

**Derived Insights**:
- Estimated construction phase based on timeline
- Generic phase-appropriate activities
- Standard construction phase risks

**⚠️ Current Limitations**:
- No actual phase tracking in database
- Phases are estimated based on time elapsed only
- No project-specific phase definitions
- No actual work completion tracking
- Phase activities are generic construction assumptions

**AI Analysis Impact**:
- Provides estimated phase context for analysis
- Suggests phase-appropriate considerations
- Helps identify phase-relevant communications

**📋 Backlog Items**:
- Add actual phase tracking to Project model
- Add customizable phase definitions per project
- Add work completion tracking by phase
- Add phase-specific milestone management
- Add phase transition criteria and approvals

### 8. Risk Context (⚠️ GENERIC ASSUMPTIONS)
**Purpose**: Enable proactive risk identification
**Fields Used**:
- All above fields combined
- `emailSettings` - Monitoring preferences

**Derived Risk Factors**:
- Generic budget risk assumptions
- Time-based schedule risk estimates
- Standard construction safety considerations
- Basic location risk assumptions

**⚠️ Current Limitations**:
- No actual risk tracking in database
- Risks are generic construction assumptions
- No project-specific risk assessment
- No risk mitigation tracking
- No historical risk data

**AI Analysis Impact**:
- Provides general construction risk awareness
- Identifies potentially risky communications
- Suggests standard risk considerations

**📋 Backlog Items**:
- Add risk tracking and assessment system
- Add project-specific risk identification
- Add risk mitigation planning and tracking
- Add historical risk analysis
- Add risk-based communication prioritization

## Implementation Approach

### Phase 1: Core Context (Current Implementation)
- Basic project information
- Timeline context
- Team context
- Simple budget context

### Phase 2: Enhanced Context (Next Implementation)
- Historical pattern analysis
- Location-specific considerations
- Advanced risk assessment
- Communication trend analysis

### Phase 3: Intelligent Context (Future)
- Machine learning-based pattern recognition
- Predictive risk modeling
- Dynamic context weighting
- Industry-specific knowledge integration

## Context Adaptation Rules

### 1. Project Phase Adaptation
- **Planning Phase**: Focus on scope, budget, timeline establishment
- **Execution Phase**: Focus on progress, issues, change orders
- **Completion Phase**: Focus on quality, final approvals, closeout

### 2. Communication Type Adaptation
- **Invoices**: Emphasize budget context and payment tracking
- **Schedule Updates**: Emphasize timeline context and dependencies
- **Change Orders**: Emphasize budget and scope impact analysis
- **Quality Issues**: Emphasize risk context and resolution tracking

### 3. Sender Role Adaptation
- **General Contractor**: Full project context
- **Architect/Designer**: Design and compliance context
- **Project Manager**: Timeline and coordination context
- **Vendors**: Specific trade context and performance history

## Quality Assurance

### Context Completeness Checks
- Verify all available project fields are considered
- Ensure context is appropriate for email type
- Validate context freshness and accuracy

### Performance Monitoring
- Track context utilization in AI analysis
- Monitor analysis accuracy improvements
- Measure context processing performance

### Continuous Improvement
- Regular review of context effectiveness
- Updates based on analysis feedback
- Enhancement based on user needs

## Technical Implementation Notes

### Data Fetching Strategy
- Eager load related data for context building
- Cache frequently accessed context data
- Optimize database queries for performance

### Context Serialization
- Structured prompt format for AI consumption
- Efficient context compression for token limits
- Versioned context format for compatibility

### Error Handling
- Graceful degradation when context is incomplete
- Fallback to basic context when enhanced context fails
- Logging for context building issues

## Success Metrics

### Quantitative Metrics
- Analysis accuracy improvement percentage
- Context utilization rate
- Processing time impact
- Token usage efficiency

### Qualitative Metrics
- User satisfaction with analysis relevance
- Reduction in false positives/negatives
- Improvement in actionable insights
- Enhanced user trust in AI analysis

## Future Enhancements

### Planned Improvements
1. **Dynamic Context Weighting**: Adjust context importance based on email type
2. **Industry Knowledge Integration**: Add construction-specific knowledge bases
3. **Seasonal Adaptation**: Adjust context for seasonal construction patterns
4. **Regulatory Integration**: Real-time building code and permit data
5. **Predictive Context**: Use ML to predict relevant context elements

### Research Areas
- Natural language processing for context extraction
- Graph neural networks for relationship modeling
- Time series analysis for pattern recognition
- Multi-modal context integration (images, documents)

---

*This document should be updated as new project fields are added or context injection strategies evolve.* 