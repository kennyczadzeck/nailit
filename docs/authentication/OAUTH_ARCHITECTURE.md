# OAuth Architecture - Separate Authentication and Gmail API Access

## Overview

Our application requires **two distinct OAuth flows** that serve different purposes and must be kept separate:

1. **Authentication OAuth** - User signs in to web/mobile app
2. **Gmail API OAuth** - User grants permission to access their Gmail

## Why Separate OAuth Flows?

### Different Use Cases
- **Authentication**: User identity verification for app access
- **Gmail API**: Permission to read/process user's emails

### Different Redirect URIs
- **Authentication**: `http://localhost:3000/api/auth/callback/google`
- **Gmail API**: `http://localhost:3000/api/email/oauth/gmail/callback`

### Different Scopes
- **Authentication**: `openid email profile`
- **Gmail API**: `https://www.googleapis.com/auth/gmail.readonly`

### Different Lifecycles
- **Authentication**: Session-based, renewed on login
- **Gmail API**: Long-lived, stored for continuous email access

## Architecture

```
User Account
├── Authentication OAuth (NextAuth)
│   ├── Provider: Google
│   ├── Purpose: Web/Mobile App Login
│   ├── Scopes: openid email profile
│   ├── Redirect: /api/auth/callback/google
│   └── Storage: Account + Session tables
│
└── Gmail API OAuth (Custom)
    ├── Provider: Google
    ├── Purpose: Email Access
    ├── Scopes: gmail.readonly
    ├── Redirect: /api/email/oauth/gmail/callback
    └── Storage: OAuthSession table
```

## Database Schema

### Authentication OAuth (NextAuth)
```sql
-- Standard NextAuth tables
Account {
  provider: 'google'
  type: 'oauth'
  scope: 'openid email profile'
  -- Used for web app authentication
}

Session {
  sessionToken: string
  expires: DateTime
  -- Web app session
}
```

### Gmail API OAuth (Custom)
```sql
-- Custom OAuth session tracking
OAuthSession {
  provider: 'google'
  sessionPurpose: 'gmail_api'
  scopes: ['gmail.readonly']
  accessToken: string
  refreshToken: string
  expiresAt: DateTime
  -- Used for Gmail API access
}
```

## Implementation

### 1. Google Cloud Console Setup

#### Authentication OAuth App
```
Name: Nailit Authentication
Redirect URIs:
  - http://localhost:3000/api/auth/callback/google
  - https://your-domain.com/api/auth/callback/google
Scopes: openid email profile
```

#### Gmail API OAuth App
```
Name: Nailit Gmail API
Redirect URIs:
  - http://localhost:3000/api/email/oauth/gmail/callback
  - https://your-domain.com/api/email/oauth/gmail/callback
Scopes: https://www.googleapis.com/auth/gmail.readonly
```

### 2. Environment Variables

```bash
# Authentication OAuth (NextAuth)
GOOGLE_AUTH_CLIENT_ID=your-auth-client-id
GOOGLE_AUTH_CLIENT_SECRET=your-auth-client-secret

# Gmail API OAuth
GOOGLE_GMAIL_CLIENT_ID=your-gmail-client-id
GOOGLE_GMAIL_CLIENT_SECRET=your-gmail-client-secret
```

### 3. User Flow

#### Authentication Flow
1. User clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth
3. User grants authentication permissions
4. Google redirects to `/api/auth/callback/google`
5. NextAuth creates Account + Session records
6. User is signed in to web app

#### Gmail API Flow
1. User clicks "Connect Gmail"
2. App redirects to Google OAuth (Gmail API app)
3. User grants Gmail access permissions
4. Google redirects to `/api/email/oauth/gmail/callback`
5. App stores OAuth tokens in OAuthSession table
6. App can now access user's Gmail

## Benefits

### Clean Separation
- Authentication and Gmail access are independent
- Different OAuth apps = different permission sets
- Clear audit trail for each type of access

### Flexible Email Providers
- User can authenticate with Google but use Microsoft email
- User can authenticate with Microsoft but use Gmail
- Each OAuth flow is purpose-specific

### Security
- Principle of least privilege
- Authentication tokens can't access Gmail
- Gmail tokens can't be used for authentication

### Scalability
- Easy to add more email providers (Office 365, etc.)
- Easy to add more authentication providers
- Each OAuth flow is independently manageable

## Migration Plan

1. **Create separate OAuth apps** in Google Cloud Console
2. **Update environment variables** with separate credentials
3. **Update NextAuth configuration** to use auth-specific credentials
4. **Keep Gmail API OAuth** using existing custom implementation
5. **Test both flows** independently

This architecture ensures clean separation of concerns while maintaining the flexibility to handle different user authentication and email provider combinations. 