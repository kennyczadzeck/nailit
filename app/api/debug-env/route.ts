import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'Environment check',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
    hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL, // Safe to show URL
    // Don't show secrets, just presence
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...', 
  });
} 