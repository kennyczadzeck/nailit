# Environment Variables Management

## Required Environment Variables

### Database Configuration
```bash
# Primary database connection (with connection pooling)
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require&pgbouncer=true&connection_limit=1"

# Direct database connection (for migrations)
DIRECT_URL="postgresql://username:password@host:5432/database?sslmode=require"
```

### NextAuth.js Configuration
```bash
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key-here"
```

### Google OAuth Configuration
```bash
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
```

### Optional Configuration
```bash
# Google Maps API (for address autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# Application Environment
NODE_ENV="production"
```

## Environment Variable Management Strategy

### 1. AWS Amplify Auto-Injection
Current setup requires manual configuration in AWS Amplify console. To improve:
- Environment variables must be added to AWS Amplify console for each deployment
- Consider using AWS Parameter Store or Secrets Manager for sensitive values
- Document all new environment variables in this file

### 2. Local Development
- Use `.env.local` for local development (gitignored)
- Never commit actual environment values to git
- Use this documentation to set up new development environments

### 3. Production Deployment
- All environment variables must be configured in AWS Amplify before deployment
- Use strong, unique values for NEXTAUTH_SECRET in production
- Ensure DATABASE_URL uses connection pooling for serverless performance

## Deployment Checklist

Before deploying to production:
- [ ] All environment variables configured in AWS Amplify
- [ ] Database connection URLs properly formatted with pooling
- [ ] Google OAuth credentials match the deployment domain
- [ ] NEXTAUTH_URL matches the actual deployment URL
- [ ] Strong NEXTAUTH_SECRET generated and configured

## Troubleshooting

### Common Issues:
1. **"Invalid database URL"**: Check connection string format and credentials
2. **OAuth errors**: Verify client ID/secret and authorized domains
3. **Prisma connection errors**: Ensure both DATABASE_URL and DIRECT_URL are configured
4. **Build failures**: Check that all required env vars are set in Amplify console 