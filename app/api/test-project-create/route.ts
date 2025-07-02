import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../lib/prisma';
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware';

async function handleTestProjectCreate(request: NextRequest) {
  try {
    console.log('=== Test Project Creation Debug ===');
    
    // Test 1: Session validation
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'No session',
        session: session
      }, { 
        status: 401,
        headers: debugSecurityHeaders
      });
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
      }, { 
        status: 400,
        headers: debugSecurityHeaders
      });
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
      }, {
        headers: debugSecurityHeaders
      });
      
    } catch (createError: unknown) {
      console.error('Project creation error:', createError);
      return NextResponse.json({
        error: 'Project creation failed',
        message: createError instanceof Error ? createError.message : 'Unknown error',
        code: createError instanceof Error && 'code' in createError ? String((createError as Record<string, unknown>).code) : undefined,
        stack: createError instanceof Error ? createError.stack : undefined
      }, { 
        status: 500,
        headers: debugSecurityHeaders
      });
    }
    
  } catch (error: unknown) {
    console.error('Test project creation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      code: error instanceof Error && 'code' in error ? String((error as Record<string, unknown>).code) : undefined,
      stack: error instanceof Error ? error.stack : undefined
    }, { 
      status: 500,
      headers: debugSecurityHeaders
    });
  }
}

export const POST = withDebugSecurity(handleTestProjectCreate) 