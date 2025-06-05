import { NextRequest } from 'next/server';

export async function GET() {
  // Function to show secret info safely
  const secretInfo = (secret: string | undefined) => {
    if (!secret) return { status: 'NOT_SET', length: 0, preview: 'NOT_SET' };
    return {
      status: 'SET',
      length: secret.length,
      preview: `${secret.slice(0, 4)}...${secret.slice(-4)}`,
      firstChar: secret.charAt(0),
      lastChar: secret.charAt(secret.length - 1),
    };
  };

  // Use the same environment detection logic as the logger
  function detectEnvironment(): string {
    // Primary: Use our custom environment variable
    const nailItEnv = process.env.NAILIT_ENVIRONMENT;
    
    if (nailItEnv) {
      switch (nailItEnv.toLowerCase()) {
        case 'development':
        case 'dev':
          return 'development';
        case 'staging':
        case 'stage':
          return 'staging';
        case 'production':
        case 'prod':
          return 'production';
        default:
          console.warn(`Unknown NAILIT_ENVIRONMENT: ${nailItEnv}, defaulting to development`);
          return 'development';
      }
    }
    
    // Fallback: Try AWS_BRANCH (in case Amplify ever provides it)
    const awsBranch = process.env.AWS_BRANCH;
    if (awsBranch) {
      switch (awsBranch) {
        case 'develop':
          return 'development';
        case 'staging':
          return 'staging';
        case 'main':
          return 'production';
        default:
          return 'development';
      }
    }
    
    // Fallback: DATABASE_URL analysis (legacy method)
    const dbUrl = process.env.DATABASE_URL || 'NOT_SET';
    if (dbUrl.includes('misty-frog')) {
      return 'production';
    } else if (dbUrl.includes('raspy-sound')) {
      return 'staging';
    } else if (dbUrl.includes('still-paper')) {
      return 'development';
    }
    
    // Fallback: NODE_ENV for local development
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      return 'development';
    }
    
    // Default fallback
    return 'development';
  }

  const detectedEnvironment = detectEnvironment();

  const envConfig = {
    // Environment Detection
    detectedEnvironment,
    nodeEnv: process.env.NODE_ENV,
    nailItEnvironment: process.env.NAILIT_ENVIRONMENT || 'NOT_SET',
    awsBranch: process.env.AWS_BRANCH || 'NOT_SET',
    
    // NextAuth Configuration
    nextauth: {
      url: process.env.NEXTAUTH_URL || 'NOT_SET',
      secret: secretInfo(process.env.NEXTAUTH_SECRET),
      urlMatches: checkUrlMatch(process.env.NEXTAUTH_URL, detectedEnvironment),
      expectedUrl: getExpectedUrl(detectedEnvironment),
    },
    
    // Database Configuration
    database: {
      url: secretInfo(process.env.DATABASE_URL || 'NOT_SET'),
      migrationUrl: secretInfo(process.env.DATABASE_MIGRATION_URL),
      bothSet: !!(process.env.DATABASE_URL && process.env.DATABASE_MIGRATION_URL),
    },
    
    // Google OAuth (when you set it up)
    google: {
      clientId: secretInfo(process.env.GOOGLE_CLIENT_ID),
      clientSecret: secretInfo(process.env.GOOGLE_CLIENT_SECRET),
      bothSet: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    
    // AWS Services (New serverless infrastructure)
    aws: {
      region: process.env.NAILIT_AWS_REGION || 'NOT_SET',
      s3Bucket: process.env.NAILIT_S3_BUCKET || 'NOT_SET',
      sqsEmailQueue: process.env.NAILIT_SQS_EMAIL_QUEUE || 'NOT_SET',
      snsTopic: process.env.NAILIT_SNS_TOPIC || 'NOT_SET',
      allSet: !!(process.env.NAILIT_AWS_REGION && process.env.NAILIT_S3_BUCKET && process.env.NAILIT_SQS_EMAIL_QUEUE && process.env.NAILIT_SNS_TOPIC),
    },
    
    // Logging Configuration
    logging: {
      region: process.env.NAILIT_AWS_REGION || 'NOT_SET',
      logLevel: process.env.LOG_LEVEL || 'environment-default',
      cloudWatchDisabled: process.env.DISABLE_CLOUDWATCH_LOGS === 'true',
      nodeEnv: process.env.NODE_ENV || 'NOT_SET',
      cloudWatchConfigured: !!(process.env.NAILIT_AWS_REGION && process.env.NODE_ENV !== 'development'),
      willLogToCloudWatch: !!(process.env.NAILIT_AWS_REGION && process.env.NODE_ENV !== 'development' && process.env.DISABLE_CLOUDWATCH_LOGS !== 'true'),
    },
    
    // Quick Health Check
    healthCheck: {
      allNextAuthVarsSet: !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET),
      allDatabaseVarsSet: !!(process.env.DATABASE_URL && process.env.DATABASE_MIGRATION_URL),
      allAWSVarsSet: !!(process.env.NAILIT_AWS_REGION && process.env.NAILIT_S3_BUCKET && process.env.NAILIT_SQS_EMAIL_QUEUE && process.env.NAILIT_SNS_TOPIC),
      urlConfigCorrect: checkUrlMatch(process.env.NEXTAUTH_URL, detectedEnvironment),
      readyForAuth: !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET && checkUrlMatch(process.env.NEXTAUTH_URL, detectedEnvironment)),
      infrastructureReady: !!(process.env.NAILIT_AWS_REGION && process.env.NAILIT_S3_BUCKET && process.env.NAILIT_SQS_EMAIL_QUEUE && process.env.NAILIT_SNS_TOPIC),
    },
    
    timestamp: new Date().toISOString(),
  };

  return Response.json(envConfig, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function checkUrlMatch(nextauthUrl: string | undefined, environment: string): boolean {
  if (!nextauthUrl) return false;
  
  const expectedUrl = getExpectedUrl(environment);
  return nextauthUrl === expectedUrl;
}

function getExpectedUrl(environment: string): string {
  switch (environment) {
    case 'production':
      return 'https://main.d1rq0k9js5lwg3.amplifyapp.com';
    case 'staging':
      return 'https://staging.d1rq0k9js5lwg3.amplifyapp.com';
    case 'development':
      return 'https://develop.d1rq0k9js5lwg3.amplifyapp.com';
    default:
      return 'http://localhost:3000'; // Local development
  }
} 