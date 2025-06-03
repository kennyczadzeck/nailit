# NailIt Database Setup

## Overview
NailIt uses Prisma ORM with SQLite for development. This provides a simple, file-based database that's perfect for development and testing.

## Database Schema

### Core Models
- **User** - System users (homeowners)
- **Project** - Renovation projects 
- **FlaggedItem** - AI-detected project impacts from emails
- **TimelineEntry** - Confirmed project milestones and changes
- **EmailSettings** - Gmail integration and notification preferences
- **MLFeedback** - Machine learning training data from user actions

### Key Relationships
- User → Projects (1:many)
- Project → FlaggedItems (1:many)
- Project → TimelineEntries (1:many)
- FlaggedItem → TimelineEntry (1:1, when confirmed)

## Available Commands

### Database Management
```bash
# Reset database and reload seed data
npm run db:reset

# Seed database with test data only
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes to database
npx prisma db push
```

### Development Workflow
1. **Make schema changes** in `prisma/schema.prisma`
2. **Push changes** with `npx prisma db push`
3. **Reset with fresh data** using `npm run db:reset`

## Test Data
The seed script creates:
- 1 user: john.homeowner@example.com
- 1 project: Kitchen Renovation 
- 4 flagged items (various categories and confidence levels)
- 3 timeline entries (existing milestones)
- Sample ML feedback entries

## API Endpoints

### Flagged Items
- `GET /api/flagged-items?projectId=<id>` - Get pending flagged items
- `PATCH /api/flagged-items/[id]` - Update item status or category

### Projects  
- `GET /api/projects` - Get all projects

### Actions Supported
- `confirm` - Mark as valid, create timeline entry
- `ignore` - Mark as false positive
- `email_sent` - Email response sent
- `reclassify` - Change category (requires `category` field)

## Database File
The SQLite database is stored as `dev.db` in the project root. This file is git-ignored and can be safely deleted to start fresh.

## Production Considerations
For production, consider:
- PostgreSQL or MySQL for better concurrent access
- Proper user authentication
- Database connection pooling
- Backup strategies 