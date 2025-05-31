import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function POST() {
  try {
    // Test basic connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connection successful');

    // Try to create tables using Prisma migrate
    console.log('Checking if tables exist...');
    
    try {
      // Test if tables exist by trying to count users
      const userCount = await prisma.user.count();
      console.log(`Tables exist. Current user count: ${userCount}`);
      
      return NextResponse.json({ 
        status: 'Already initialized',
        userCount,
        message: 'Database tables already exist',
        timestamp: new Date().toISOString() 
      });
    } catch (tableError: any) {
      console.log('Tables do not exist, need to create them');
      console.log('Table error:', tableError.message);
      
      // Tables don't exist, we need to push the schema
      // Note: We can't run migrations in production, but we can describe what needs to be done
      return NextResponse.json({ 
        status: 'Tables missing',
        error: 'Database tables do not exist',
        message: 'You need to run: npx prisma db push --accept-data-loss',
        suggestion: 'Connect to your database locally and run Prisma migrations',
        tableError: tableError.message,
        timestamp: new Date().toISOString()
      }, { status: 424 }); // 424 Failed Dependency
    }
    
  } catch (connectionError: any) {
    console.error('Database connection error:', connectionError);
    
    return NextResponse.json({ 
      status: 'Connection failed',
      error: connectionError.message,
      code: connectionError.code,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  // Same as POST but read-only check
  try {
    await prisma.$connect();
    const userCount = await prisma.user.count();
    
    return NextResponse.json({ 
      status: 'Connected and initialized',
      userCount,
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'Error',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 