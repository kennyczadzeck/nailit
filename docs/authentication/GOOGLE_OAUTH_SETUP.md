# Google OAuth Setup for NailIt

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)
   - Copy the Client ID and Client Secret

## Required Google API Scopes

The application requests the following scopes:
- `openid` - Basic OpenID Connect
- `email` - User's email address
- `profile` - User's basic profile information
- `https://www.googleapis.com/auth/gmail.readonly` - Read Gmail messages
- `https://www.googleapis.com/auth/gmail.send` - Send Gmail messages

## Important Notes

- Personal Gmail accounts only (no Google Workspace in MVP)
- Gmail scopes are essential for core functionality
- Users must grant all permissions for the app to work properly
- Access tokens are automatically refreshed by NextAuth.js

## NEXTAUTH_SECRET Generation

Generate a secure secret key:

```bash
openssl rand -base64 32
```

## Next Steps

1. Add the environment variables to your `.env` file
2. Run the database migration: `npx prisma db push`
3. Start the development server: `npm run dev`
4. Test the OAuth flow at `/auth/signin` 