import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function GET() {
  try {
    // Test basic connection
    await prisma.$connect();
    
    // Test if we can query (this will fail if tables don't exist)
    const userCount = await prisma.user.count();
    
    return NextResponse.json({ 
      status: 'Connected', 
      userCount,
      timestamp: new Date().toISOString() 
    });
  } catch (error: unknown) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 