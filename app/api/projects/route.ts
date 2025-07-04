// This file handles project API requests.
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'
import { Prisma, TeamMemberRole, TimelineCategory } from '@prisma/client'

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: Get all projects for authenticated user
 *     description: Returns a list of all projects belonging to the authenticated user
 *     tags:
 *       - Projects
 *     responses:
 *       200:
 *         description: Successfully retrieved projects
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
 *                   description:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [ACTIVE, ARCHIVED]
 *       401:
 *         description: Unauthorized - user not authenticated
 */
// GET /api/projects - Get all projects for authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if user has any projects
    const projectCount = await prisma.project.count({
      where: {
        userId: session.user.id
      }
    });

    // If no projects, return empty array immediately
    if (projectCount === 0) {
      return NextResponse.json([]);
    }

    // If projects exist, fetch with includes
    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        user: true,
        emailSettings: true,
        _count: {
          select: {
            flaggedItems: {
              where: { status: 'PENDING' }
            },
            timelineEntries: true
          }
        }
      },
      orderBy: [
        {
          status: 'asc' // ACTIVE comes before ARCHIVED alphabetically
        },
        {
          createdAt: 'desc'
        }
      ]
    })

    return NextResponse.json(projects)
  } catch (error: unknown) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Create a new project
 *     description: Create a new renovation project with team members and settings
 *     tags:
 *       - Projects
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - address
 *               - budget
 *               - startDate
 *               - endDate
 *               - teamMembers
 *             properties:
 *               name:
 *                 type: string
 *                 description: Project name
 *               description:
 *                 type: string
 *                 description: Project description
 *               address:
 *                 type: string
 *                 description: Project address
 *               budget:
 *                 type: number
 *                 description: Project budget
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               teamMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [GENERAL_CONTRACTOR, ARCHITECT_DESIGNER, PROJECT_MANAGER]
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 */
// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    const {
      name,
      description,
      teamMembers,
      address,
      budget,
      startDate,
      endDate,
    } = body

    // Validate required fields
    if (!name || !startDate || !address || !endDate || !budget || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, address, endDate, budget, description' },
        { status: 400 }
      )
    }

    // Validate team members
    if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
      return NextResponse.json(
        { error: 'At least one team member is required' },
        { status: 400 }
      )
    }

    const hasGeneralContractor = teamMembers.some(member => 
      member.role === 'GENERAL_CONTRACTOR'
    );

    if (!hasGeneralContractor) {
      return NextResponse.json(
        { error: 'A General Contractor is required' },
        { status: 400 }
      )
    }

    for (const member of teamMembers) {
      if (!member.name || !member.email || !member.role) {
        return NextResponse.json(
          { error: 'All team members must have name, email, and role' },
          { status: 400 }
        )
      }
    }

    let parsedBudget: number;
    try {
      parsedBudget = typeof budget === 'string' ? parseFloat(budget.replace(/[,$]/g, '')) : Number(budget);
      if (isNaN(parsedBudget)) {
        throw new Error('Invalid budget value');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid budget format' },
        { status: 400 }
      )
    }

    let parsedStartDate: Date, parsedEndDate: Date;
    try {
      parsedStartDate = new Date(startDate);
      parsedEndDate = new Date(endDate);
      
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        throw new Error('Invalid date values');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const validRoles = ['GENERAL_CONTRACTOR', 'ARCHITECT_DESIGNER', 'PROJECT_MANAGER'];
    for (const member of teamMembers) {
      if (!validRoles.includes(member.role)) {
        return NextResponse.json(
          { error: `Invalid role: ${member.role}` },
          { status: 400 }
        )
      }
    }

    const newProject = await prisma.$transaction(async (tx) => {
      // Defensive upsert: ensure user exists
      await tx.user.upsert({
        where: { id: session.user.id },
        update: {},
        create: {
          id: session.user.id,
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          image: session.user.image ?? '',
        },
      });

      const project = await tx.project.create({
        data: {
          name: String(name),
          description: String(description),
          address: String(address),
          budget: parsedBudget,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          userId: session.user.id,
        },
      });

      await tx.teamMember.createMany({
        data: teamMembers.map(member => ({
          name: String(member.name),
          email: String(member.email),
          role: member.role as TeamMemberRole,
          projectId: project.id,
        })),
      });

      await tx.emailSettings.create({
        data: {
          projectId: project.id,
          monitoringEnabled: true,
          notificationsEnabled: true,
          weeklyReports: true,
          highPriorityAlerts: true,
        },
      });
      
      await tx.timelineEntry.create({
        data: {
          title: 'Project Created',
          description: `The project "${project.name}" was successfully created.`,
          category: TimelineCategory.UPDATE,
          date: new Date(),
          impact: 'Project kickoff',
          projectId: project.id,
          verified: true
        }
      });
      
      return tx.project.findUnique({
        where: { id: project.id },
        include: {
          teamMembers: true,
          emailSettings: true,
        },
      });
    });

    return NextResponse.json(newProject, { status: 201 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Project creation failed:', errorMessage, error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'A project with this name already exists.' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to create project', details: errorMessage },
      { status: 500 }
    )
  }
} 