import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test Project Creation Debug ===');
    
    // Test 1: Session validation
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'No session',
        session: session
      }, { status: 401 });
    }

    // Test 2: Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', body);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        parseError: (parseError as Error).message
      }, { status: 400 });
    }

    // Test 3: Simple project creation (minimal fields)
    console.log('Attempting simple project creation...');
    
    try {
      const simpleProject = await prisma.project.create({
        data: {
          name: 'Test Project',
          startDate: new Date(),
          userId: session.user.id,
          status: 'ACTIVE'
        }
      });
      
      console.log('Simple project created:', simpleProject);
      
      // Clean up test project
      await prisma.project.delete({
        where: { id: simpleProject.id }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Simple project creation works',
        sessionUserId: session.user.id,
        testProjectId: simpleProject.id
      });
      
    } catch (createError: any) {
      console.error('Project creation error:', createError);
      return NextResponse.json({
        error: 'Project creation failed',
        message: createError.message,
        code: createError.code,
        stack: createError.stack
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Test project creation error:', error);
    return NextResponse.json({
      error: error.message,
      code: error.code,
      stack: error.stack
    }, { status: 500 });
  }
} 