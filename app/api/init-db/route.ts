import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';

export async function POST() {
  try {
    // Test basic connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connection successful');

    // Check if tables exist by trying to query them
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
      console.log('Tables do not exist, attempting to create them...');
      console.log('Table error:', tableError.message);
      
      // Tables don't exist, try to create them using raw SQL
      try {
        console.log('Creating tables using Prisma schema...');
        
        // Use Prisma's $executeRaw to run the schema creation
        // For now, we'll provide instructions since we can't run migrations in serverless
        return NextResponse.json({ 
          status: 'Tables missing - setup required',
          error: 'Database tables do not exist',
          message: 'Tables need to be created',
          instructions: [
            '1. Run locally: npx prisma db push --accept-data-loss',
            '2. Or use Neon Console to run SQL schema',
            '3. Or create tables manually'
          ],
          neonConsole: 'Go to Neon Console → SQL Editor and run your schema',
          tableError: tableError.message,
          timestamp: new Date().toISOString()
        }, { status: 424 }); // 424 Failed Dependency
      } catch (creationError: any) {
        console.error('Failed to create tables:', creationError);
        return NextResponse.json({ 
          status: 'Table creation failed',
          error: creationError.message,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }
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
    
    try {
      const userCount = await prisma.user.count();
      return NextResponse.json({ 
        status: 'Connected and initialized',
        userCount,
        timestamp: new Date().toISOString() 
      });
    } catch (tableError: any) {
      return NextResponse.json({ 
        status: 'Connected but tables missing',
        error: 'Tables do not exist',
        code: tableError.code,
        message: 'Use POST /api/init-db to initialize',
        timestamp: new Date().toISOString()
      }, { status: 424 });
    }
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'Connection failed',
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 