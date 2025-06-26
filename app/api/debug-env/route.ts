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