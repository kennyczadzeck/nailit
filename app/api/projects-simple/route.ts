import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'

/**
 * @swagger
 * /api/projects-simple:
 *   get:
 *     summary: Get simplified project list
 *     description: Get a simplified list of projects with basic information only
 *     tags:
 *       - Projects
 *     responses:
 *       200:
 *         description: Successfully retrieved simplified project list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [ACTIVE, ARCHIVED]
 *       401:
 *         description: Unauthorized
 */
export async function GET() {
  try {
    console.log('=== Simple Projects Endpoint ===');
    
    const session = await getServerSession(authOptions)
    console.log('Session:', session);
    
    if (!session?.user?.id) {
      console.log('No session or user ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Fetching projects for user:', session.user.id);
    
    // Try simple query first
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id
      }
    });
    
    console.log('Found projects:', projects.length);

    return NextResponse.json({
      success: true,
      projectCount: projects.length,
      projects: projects,
      userId: session.user.id
    });
    
  } catch (error: unknown) {
    console.error('Error creating simple project:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 