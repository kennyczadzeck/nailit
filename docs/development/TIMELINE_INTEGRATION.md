# Timeline Integration Documentation

## Overview

NailIt's timeline feature provides a chronological view of all confirmed project impacts that originated from email detection. The timeline strictly follows the MVP user story workflow: emails are detected → flagged for review → confirmed by users → added to timeline.

## Core Workflow

### 1. Email Detection → Flagged Items
- AI monitors project emails for potential impacts
- Detected impacts are flagged with categories: COST, SCHEDULE, SCOPE, or UNCLASSIFIED
- Each flagged item includes email details and AI confidence score

### 2. User Review → Timeline Creation
- Users review flagged items in the `/flagged` page
- When confirmed, flagged items automatically generate timeline entries
- Only confirmed flagged items appear in the timeline (no standalone entries)

### 3. Timeline Display
- Timeline shows chronological order of confirmed impacts
- Each entry shows its source email information
- Visual indicators distinguish between cost, schedule, and scope impacts

## Database Schema

### TimelineEntry Model
```prisma
model TimelineEntry {
  id          String   @id @default(cuid())
  title       String
  description String
  category    TimelineCategory  // COST, SCHEDULE, SCOPE, ISSUE, UPDATE
  date        DateTime
  impact      String?
  
  // Entry details
  cost        Float?
  scheduleImpact String?
  scopeDetails String?
  
  // Relations
  projectId     String
  project       Project @relation(fields: [projectId], references: [id])
  flaggedItemId String? @unique
  flaggedItem   FlaggedItem? @relation(fields: [flaggedItemId], references: [id])
}
```

### Key Design Decisions
- **No Manual Milestones**: Timeline entries are only created from confirmed flagged items
- **Email-Centric**: All timeline entries trace back to original email sources
- **Category Alignment**: Timeline categories match flagged item categories for consistency

## API Endpoints

### GET /api/timeline
Retrieves timeline entries for a project, ordered chronologically.

**Parameters:**
- `projectId` (required): Project identifier

**Response:**
```json
[
  {
    "id": "entry_id",
    "title": "Entry Title",
    "description": "Detailed description",
    "category": "cost",
    "date": "2024-01-25",
    "time": "2 weeks ago",
    "impact": "Impact description",
    "cost": 1500,
    "verified": true,
    "fromFlaggedItem": true,
    "emailFrom": "contractor@example.com"
  }
]
```

## Frontend Components

### Timeline Component (`/app/components/Timeline.tsx`)
- Displays chronological timeline of confirmed impacts
- Supports filtering by category (cost, schedule, scope)
- Shows email source information for each entry
- Includes export functionality for reporting

### Integration with Flagged Items
- Timeline automatically updates when flagged items are confirmed
- Visual connection between flagged item review and timeline population
- Real-time refresh capabilities

## Usage Examples

### Typical User Flow
1. Contractor sends email about budget change
2. AI detects cost impact → creates flagged item
3. User reviews flagged item → confirms it
4. Timeline entry automatically created with email source
5. Timeline shows chronological project impact history

### Timeline Filtering
```javascript
// Filter by category
const costImpacts = timelineEntries.filter(entry => entry.category === 'cost')
const scheduleChanges = timelineEntries.filter(entry => entry.category === 'schedule')
```

## Future Considerations

The current implementation focuses on the MVP workflow. Future enhancements might include:
- Manual timeline entries for non-email events
- Timeline entry editing capabilities
- Advanced filtering and search
- Integration with project management tools

However, the core principle remains: timeline entries should primarily come from validated email-detected impacts to maintain data integrity and traceability. 