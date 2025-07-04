# Enhanced OAuth Session Management

## Problem Statement

Currently, NextAuth's Account model prevents multiple OAuth sessions per provider per user due to the unique constraint:
```prisma
@@unique([provider, providerAccountId])
```

This breaks scenarios like:
- **Your case**: Email testing OAuth + App authentication OAuth
- **Multi-device**: Web app + Mobile app sessions  
- **Multi-service**: Gmail API + Calendar API + Drive API

## Solution: Separate OAuth Sessions Table

### New Schema Addition
```prisma
model OAuthSession {
  id                String   @id @default(cuid())
  userId            String
  provider          String   // "google", "microsoft", etc.
  sessionContext    String   // "email_api", "calendar_api", "app_auth"
  sessionPurpose    String   // Human-readable description
  
  // OAuth credentials
  providerAccountId String
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?
  tokenType         String?  @default("Bearer")
  scopes            String[] // ["gmail.readonly", "calendar.events"]
  
  // Session management
  isActive          Boolean  @default(true)
  lastUsedAt        DateTime @default(now())
  createdAt         DateTime @default(now())
  revokedAt         DateTime?
  revokedReason     String?
  
  // Device/app context
  deviceInfo        String?  // "web", "mobile", "desktop", "server"
  userAgent         String?
  ipAddress         String?
  
  // Relations
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, provider, sessionContext])
  @@map("oauth_sessions")
}
```

### Benefits
1. **Preserves NextAuth** - No breaking changes to existing authentication
2. **Multiple Sessions** - Same user can have app auth + email API + calendar API
3. **Granular Control** - Revoke specific sessions without affecting others
4. **Better Security** - Session-specific scopes and tracking
5. **Multi-Device Ready** - Web + Mobile + Desktop sessions

### Your Specific Use Case
```typescript
// User has both app authentication and email API access
const sessions = await prisma.oAuthSession.findMany({
  where: { userId: "cmcno2zmb0000lvnwh6udokku", provider: "google" }
});

// Results:
// 1. { sessionContext: "app_auth", scopes: ["openid", "email", "profile"] }
// 2. { sessionContext: "email_api", scopes: ["gmail.readonly"] }
```

## Implementation Plan

### Phase 1: Add OAuthSession Model
```bash
# Add to schema.prisma, then:
npx prisma migrate dev --name add_oauth_sessions
```

### Phase 2: Update Email OAuth Flow
```typescript
// Instead of storing in EmailSettings, store in OAuthSession
await prisma.oAuthSession.create({
  data: {
    userId: user.id,
    provider: "google",
    sessionContext: "email_api",
    sessionPurpose: "Email monitoring and analysis",
    providerAccountId: googleAccount.id,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expires_at * 1000),
    scopes: ["gmail.readonly"],
    deviceInfo: "server"
  }
});
```

### Phase 3: Update Email Processing
```typescript
// Get email API session specifically
const emailSession = await prisma.oAuthSession.findUnique({
  where: {
    userId_provider_sessionContext: {
      userId: user.id,
      provider: "google", 
      sessionContext: "email_api"
    }
  }
});

if (emailSession?.isActive) {
  // Use emailSession.accessToken for Gmail API calls
}
```

This approach resolves your OAuth conflict and provides a scalable foundation for future multi-session scenarios. 