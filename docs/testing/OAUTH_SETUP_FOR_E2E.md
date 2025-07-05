# 🔐 OAuth Setup for E2E Testing

*Complete guide to setting up Gmail OAuth for end-to-end email testing*

## 📋 **Prerequisites**

- Google Cloud Console account
- Access to test Gmail accounts:
  - `nailit.test.homeowner@gmail.com`
  - `nailit.test.contractor@gmail.com`

## 🔧 **Step 1: Google Cloud Console Setup**

### **1.1 Create OAuth Credentials**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Choose **Web application**
6. Configure:
   - **Name**: `Nailit Email Testing`
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`
7. Save and download the credentials

### **1.2 Enable Gmail API**

1. Navigate to **APIs & Services > Library**
2. Search for "Gmail API"
3. Click **Enable**

## 🔑 **Step 2: Environment Variables**

Add the OAuth credentials to your `.env.local` file:

```bash
# Gmail OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# Alternative names (for compatibility)
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
```

## 🚀 **Step 3: Automated OAuth Setup**

### **3.1 Quick Setup (Recommended)**

```bash
# Complete OAuth setup for E2E testing
npm run test:oauth:setup-e2e
```

This command will:
- Check current OAuth status
- Guide you through setting up both accounts
- Validate token scopes and permissions
- Ensure E2E testing readiness

### **3.2 Manual Setup (If needed)**

```bash
# Set up homeowner account (primary ingestion)
npm run test:oauth-setup homeowner

# Set up contractor account (send-only)
npm run test:oauth-setup contractor

# Check status
npm run test:oauth:status
```

## 📱 **Step 4: Account Authorization**

### **4.1 Homeowner Account Setup**

1. Run: `npm run test:oauth-setup homeowner`
2. Open the authorization URL in your browser
3. **Important**: Make sure you're logged into `nailit.test.homeowner@gmail.com`
4. Grant permissions:
   - ✅ Read your email messages and settings
   - ✅ Manage your email (for cleanup)
   - ✅ Send email on your behalf
5. Copy the authorization code and paste it in the terminal

### **4.2 Contractor Account Setup**

1. Run: `npm run test:oauth-setup contractor`
2. Open the authorization URL in your browser
3. **Important**: Make sure you're logged into `nailit.test.contractor@gmail.com`
4. Grant permissions:
   - ✅ Send email on your behalf (send-only)
5. Copy the authorization code and paste it in the terminal

## ✅ **Step 5: Verification**

### **5.1 Check OAuth Status**

```bash
# Check if both accounts are properly configured
npm run test:oauth:status
```

Expected output:
```
📊 OAuth Status Check (HOMEOWNER-ONLY Validation)

🔍 Checking Homeowner (Primary Ingestion Account)...
✅ Homeowner (Primary Ingestion Account) - Connected as: nailit.test.homeowner@gmail.com
   Purpose: Email ingestion and processing (FULL Gmail access)
   Scopes: gmail.readonly, gmail.modify

🔍 Checking Contractor (Send-Only Account)...
✅ Contractor (Send-Only Account) - Connected as: nailit.test.contractor@gmail.com
   Purpose: Send test emails TO homeowner (LIMITED Gmail access)
   Scopes: gmail.send
```

### **5.2 Test E2E Readiness**

```bash
# Ensure OAuth is ready for E2E testing
npm run test:oauth:ensure-ready
```

## 🔄 **Token Management**

### **Automatic Token Refresh**

The system automatically handles token refresh:

```bash
# Check and refresh expired tokens
npm run test:oauth:refresh

# Ensure tokens are ready (refresh if needed)
npm run test:oauth:ensure-ready
```

### **Token Expiration**

- **Access tokens**: Expire after 1 hour (auto-refreshed)
- **Refresh tokens**: Long-lived (used to get new access tokens)
- **System**: Automatically detects and refreshes expired tokens

## 🎯 **Step 6: Run E2E Tests**

Once OAuth is configured:

```bash
# Run complete E2E test (includes OAuth checks)
npm run test:e2e:complete

# Run with verbose output for debugging
npm run test:e2e:complete:verbose
```

## 🔧 **Troubleshooting**

### **Common Issues**

**"Missing Google OAuth credentials"**
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in `.env.local`
- Check that the values don't have extra spaces or quotes

**"No refresh token received"**
- The OAuth flow uses `prompt=consent` to force refresh token generation
- If you previously authorized the app, revoke access and re-authorize

**"Account mismatch"**
- Ensure you're logged into the correct Gmail account during authorization
- Check that the authorized email matches the expected test account

**"Invalid scopes"**
- Homeowner account needs: `gmail.readonly`, `gmail.modify`
- Contractor account needs: `gmail.send`
- Re-run OAuth setup if scopes are incorrect

### **Reset OAuth**

To completely reset OAuth setup:

```bash
# Remove stored credentials
rm -rf scripts/email-testing/credentials/

# Re-run setup
npm run test:oauth:setup-e2e
```

### **Debug Commands**

```bash
# Check OAuth status with detailed info
npm run test:oauth:status

# Test specific account credentials
npm run test:oauth-setup test homeowner
npm run test:oauth-setup test contractor

# Verify Gmail API connectivity
npm run test:gmail:auth
```

## 🏆 **Success Criteria**

OAuth setup is complete when:

- ✅ Both test accounts have valid tokens
- ✅ Homeowner has ingestion permissions (readonly, modify)
- ✅ Contractor has send-only permissions
- ✅ Tokens automatically refresh when expired
- ✅ E2E test can run without OAuth errors

## 📚 **Security Notes**

- OAuth credentials are stored locally in `scripts/email-testing/credentials/`
- Credentials are gitignored and never committed to version control
- Refresh tokens are long-lived but can be revoked from Google Account settings
- Test accounts should only be used for development/testing purposes

---

**Ready for E2E Testing!** 🎯

Once OAuth is configured, you can run the complete end-to-end test suite with confidence that the email workflow will work from Gmail ingestion through timeline display. 