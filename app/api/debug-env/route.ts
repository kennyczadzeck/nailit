import { NextResponse } from 'next/server'

export async function GET() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'Loaded' : 'Not Loaded',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Loaded' : 'Not Loaded',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Loaded' : 'Not Loaded',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      ? 'Loaded'
      : 'Not Loaded',
  }
  return NextResponse.json(envVars)
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