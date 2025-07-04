# Enhanced OAuth Session Management Schema

## Current Limitation
NextAuth's default Account model allows only ONE OAuth account per provider per user:
```prisma
@@unique([provider, providerAccountId])  // This prevents multiple sessions
```

## Proposed Enhancement

### Option A: Add Session Context to Account Model
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  
  // NEW: Session context for multiple OAuth sessions
  sessionContext    String?  // "app_auth", "email_api", "calendar_api", etc.
  sessionPurpose    String?  // Human-readable description
  deviceInfo        String?  // "web", "mobile", "desktop", "api"
  
  // OAuth tokens
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  
  // Session management
  isActive          Boolean  @default(true)
  lastUsedAt        DateTime @default(now())
  createdAt         DateTime @default(now())
  revokedAt         DateTime?
  revokedReason     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // CHANGED: Allow multiple sessions per provider
  @@unique([provider, providerAccountId, sessionContext])
  @@map("accounts")
}
```

### Option B: Separate OAuth Sessions Table
```prisma
model Account {
  // Keep existing NextAuth structure for app authentication
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// NEW: Separate table for API OAuth sessions
model OAuthSession {
  id                String   @id @default(cuid())
  userId            String
  provider          String   // "google", "microsoft", etc.
  sessionContext    String   // "email_api", "calendar_api", etc.
  sessionPurpose    String   // "Email ingestion", "Calendar sync", etc.
  
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

## Implementation Benefits

### Multi-Session Support
```typescript
// User can have multiple active OAuth sessions
const userSessions = await prisma.oAuthSession.findMany({
  where: {
    userId: user.id,
    provider: "google",
    isActive: true
  }
});

// Results:
// 1. { sessionContext: "app_auth", scopes: ["openid", "email", "profile"] }
// 2. { sessionContext: "email_api", scopes: ["gmail.readonly"] }
// 3. { sessionContext: "calendar_api", scopes: ["calendar.events"] }
```

### Granular Access Control
```typescript
// Get specific session for email processing
const emailSession = await prisma.oAuthSession.findUnique({
  where: {
    userId_provider_sessionContext: {
      userId: user.id,
      provider: "google",
      sessionContext: "email_api"
    }
  }
});
```

### Session Lifecycle Management
```typescript
// Revoke specific session without affecting others
await prisma.oAuthSession.update({
  where: { id: sessionId },
  data: {
    isActive: false,
    revokedAt: new Date(),
    revokedReason: "user_request"
  }
});
```

## Real-World Use Cases

### Multi-Device Scenario
```
User: john@example.com
├── Web App Session (Chrome, MacBook)
├── Mobile App Session (iPhone)
├── Desktop App Session (Windows)
└── API Integration Session (Server-side)
```

### Multi-Service Integration
```
User: contractor@company.com
├── App Authentication (NextAuth)
├── Gmail API (Email monitoring)
├── Google Calendar API (Project scheduling)
├── Google Drive API (Document storage)
└── Google Sheets API (Cost tracking)
```

### Your Current Email Testing Scenario
```
nailit.test.homeowner@gmail.com:
├── App Authentication Session
│   ├── Provider: google
│   ├── Context: "app_auth"
│   └── Scopes: ["openid", "email", "profile"]
└── Email API Session
    ├── Provider: google
    ├── Context: "email_api"
    └── Scopes: ["gmail.readonly", "gmail.send"]
```

## Migration Strategy

### Phase 1: Add sessionContext to existing Account model
```sql
ALTER TABLE accounts ADD COLUMN session_context TEXT;
ALTER TABLE accounts ADD COLUMN session_purpose TEXT;
ALTER TABLE accounts ADD COLUMN device_info TEXT;
ALTER TABLE accounts ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE accounts ADD COLUMN last_used_at TIMESTAMP DEFAULT NOW();
ALTER TABLE accounts ADD COLUMN revoked_at TIMESTAMP;

-- Update existing records
UPDATE accounts SET session_context = 'app_auth' WHERE session_context IS NULL;

-- Drop old unique constraint
ALTER TABLE accounts DROP CONSTRAINT accounts_provider_providerAccountId_key;

-- Add new unique constraint
ALTER TABLE accounts ADD CONSTRAINT accounts_provider_providerAccountId_sessionContext_key 
  UNIQUE (provider, provider_account_id, session_context);
```

### Phase 2: Update OAuth flow to specify session context
```typescript
// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          // Add session context parameter
          state: JSON.stringify({ sessionContext: "app_auth" })
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        // Extract session context from state
        const state = JSON.parse(account.state || '{}');
        account.sessionContext = state.sessionContext || "app_auth";
        account.sessionPurpose = "User authentication";
        account.deviceInfo = "web";
      }
      return true;
    }
  }
}
```

### Phase 3: Create separate OAuth flow for email API
```typescript
// Email OAuth endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/oauth/gmail/callback`);
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', JSON.stringify({ 
    userId, 
    sessionContext: 'email_api',
    sessionPurpose: 'Email monitoring and analysis'
  }));
  
  return NextResponse.redirect(authUrl.toString());
}
```

## Recommended Approach

**Option B (Separate OAuthSession table)** is recommended because:

1. **Preserves NextAuth compatibility** - No breaking changes to existing auth
2. **Clear separation of concerns** - App auth vs API access
3. **Enhanced session management** - Better tracking and lifecycle control
4. **Easier to extend** - Can add new session types without affecting core auth
5. **Better security** - Granular scope and session control

This approach solves your current OAuth conflict and provides a foundation for future multi-device and multi-service scenarios. 