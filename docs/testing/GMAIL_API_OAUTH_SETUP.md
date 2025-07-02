# Gmail API OAuth Setup Guide for Automated Email Testing

## Overview

This guide walks you through setting up Gmail API OAuth 2.0 authentication to enable automated email sending from the contractor test account (`nailit.test.contractor@gmail.com`) to the homeowner account (`nailit.test.homeowner@gmail.com`).

## Prerequisites

- Access to the existing Google Cloud Console project
- `nailit.test.contractor@gmail.com` Gmail account
- Node.js development environment

## Step 1: Google Cloud Console Configuration

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to your existing NailIt project
3. Go to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**

### 1.2 Configure OAuth Client

**Application type:** Desktop application
**Name:** `NailIt Email Testing - Contractor Sender`

**Authorized redirect URIs:** 
- `http://localhost`

Click **CREATE** and download the JSON credentials file.

### 1.3 Enable Required APIs

Go to **APIs & Services** → **Library** and enable:
- ✅ Gmail API (should already be enabled)

### 1.4 Required OAuth Scopes

The application will request these scopes:
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.compose` - Create drafts (optional)

## Step 2: Local Environment Setup

### 2.1 Save OAuth Credentials

Save the downloaded JSON file as `gmail-contractor-credentials.json` in your project root (add to `.gitignore`):

```json
{
  "installed": {
    "client_id": "YOUR_CONTRACTOR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CONTRACTOR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost"]
  }
}
```

### 2.2 Update Environment Variables

Add to your `.env.local`:

```bash
# Gmail API for automated email sending (contractor account)
GMAIL_CONTRACTOR_CLIENT_ID="YOUR_CONTRACTOR_CLIENT_ID.apps.googleusercontent.com"
GMAIL_CONTRACTOR_CLIENT_SECRET="YOUR_CONTRACTOR_CLIENT_SECRET"
GMAIL_CONTRACTOR_REFRESH_TOKEN=""  # Will be generated in next step
GMAIL_CONTRACTOR_EMAIL="nailit.test.contractor@gmail.com"
```

### 2.3 Install Dependencies

```bash
npm install googleapis nodemailer
```

## Step 3: OAuth Authorization Flow

### 3.1 Create Authorization Script

Create `scripts/gmail-oauth-setup.ts`:

```typescript
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Load credentials from JSON file
const credentialsPath = path.join(__dirname, '../gmail-contractor-credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose'
];

// Generate authorization URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('🔐 Gmail API OAuth Setup for Contractor Account');
console.log('=============================================');
console.log('');
console.log('1. Open this URL in your browser:');
console.log(authUrl);
console.log('');
console.log('2. Sign in with: nailit.test.contractor@gmail.com');
console.log('3. Grant permissions to the application');
console.log('4. Copy the authorization code from the redirect URL');
console.log('5. Run: npm run test:gmail:token <AUTHORIZATION_CODE>');

// Function to exchange authorization code for tokens
export async function getTokens(code: string) {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    
    console.log('✅ Successfully obtained tokens!');
    console.log('');
    console.log('Add this to your .env.local:');
    console.log(`GMAIL_CONTRACTOR_REFRESH_TOKEN="${tokens.refresh_token}"`);
    
    // Save tokens to file for backup
    const tokenPath = path.join(__dirname, '../gmail-contractor-tokens.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
    console.log('');
    console.log(`💾 Tokens saved to: ${tokenPath}`);
    
    return tokens;
  } catch (error) {
    console.error('❌ Error obtaining tokens:', error);
    throw error;
  }
}

// If authorization code is provided as command line argument
const authCode = process.argv[2];
if (authCode) {
  getTokens(authCode);
}
```

### 3.2 Add NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:gmail:setup": "tsx scripts/gmail-oauth-setup.ts",
    "test:gmail:token": "tsx scripts/gmail-oauth-setup.ts"
  }
}
```

## Step 4: Run OAuth Authorization

### 4.1 Generate Authorization URL

```bash
npm run test:gmail:setup
```

This will output an authorization URL. Copy and open it in your browser.

### 4.2 Complete OAuth Flow

1. **Sign in** with `nailit.test.contractor@gmail.com`
2. **Grant permissions** when prompted
3. **Copy the authorization code** from the redirect URL (after `code=`)
4. **Exchange for tokens**:

```bash
npm run test:gmail:token "PASTE_AUTHORIZATION_CODE_HERE"
```

### 4.3 Update Environment Variables

Copy the refresh token from the output and add it to `.env.local`:

```bash
GMAIL_CONTRACTOR_REFRESH_TOKEN="1//0gXXXXXXXXXXXXXXXXXXXXXXXXX"
```

## Security Notes

### Files to Add to `.gitignore`

```gitignore
# Gmail OAuth credentials and tokens
gmail-contractor-credentials.json
gmail-contractor-tokens.json
.env.local
```

### Environment Variables Security

- ✅ Store credentials in `.env.local` (not committed to git)
- ✅ Use GitHub Secrets for CI/CD environments  
- ✅ Rotate refresh tokens periodically
- ✅ Monitor OAuth consent screen for unauthorized access

## Next Steps

Once OAuth is configured, you can proceed to:
1. Implement the `GmailTestSender` class from the main testing strategy
2. Create automated email sending scripts
3. Integrate with the existing email testing infrastructure
4. Set up CI/CD pipeline with GitHub Secrets

For implementation details, refer to the main [Email Testing Strategy](./EMAIL_TESTING_STRATEGY.md#gmail-api-oauth-setup-for-automated-email-sending).
