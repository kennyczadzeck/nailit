import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'

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

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  console.log('=== PROJECT ENDPOINT HIT ===');
  
  try {
    console.log('Step 1: Getting session...');
    const session = await getServerSession(authOptions)
    console.log('Session result:', session ? 'Found' : 'Not found', session?.user?.id);
    
    if (!session?.user?.id) {
      console.log('Session validation failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Step 2: Parsing request body...');
    let body;
    try {
      body = await request.json()
      console.log('Body parsed successfully');
    } catch (parseError) {
      console.error('Body parsing failed:', parseError);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    
    console.log('Step 3: Extracting fields...');
    const {
      name,
      description,
      teamMembers,
      address,
      budget,
      startDate,
      endDate,
    } = body

    console.log('Received project creation request:', body)
    
    // Validate required fields
    if (!name || !startDate || !address || !endDate || !budget || !description) {
      console.log('Missing required fields:', { 
        name: !!name, 
        startDate: !!startDate, 
        address: !!address,
        endDate: !!endDate,
        budget: !!budget,
        description: !!description
      })
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate, address, endDate, budget, description' },
        { status: 400 }
      )
    }

    // Validate team members
    if (!teamMembers || !Array.isArray(teamMembers) || teamMembers.length === 0) {
      console.log('Team members validation failed:', { teamMembers })
      return NextResponse.json(
        { error: 'At least one team member is required' },
        { status: 400 }
      )
    }

    // Check for general contractor
    const hasGeneralContractor = teamMembers.some(member => 
      member.role === 'GENERAL_CONTRACTOR'
    );

    if (!hasGeneralContractor) {
      console.log('No general contractor found in team members:', teamMembers)
      return NextResponse.json(
        { error: 'A General Contractor is required' },
        { status: 400 }
      )
    }

    // Validate team member structure
    for (const member of teamMembers) {
      if (!member.name || !member.email || !member.role) {
        console.log('Team member validation failed:', member)
        return NextResponse.json(
          { error: 'All team members must have name, email, and role' },
          { status: 400 }
        )
      }
    }

    // Get the general contractor info for backward compatibility
    const generalContractor = teamMembers.find(member => member.role === 'GENERAL_CONTRACTOR');

    console.log('=== PROJECT CREATION DEBUG ===');
    console.log('Raw form data received:', {
      name: typeof name + ': ' + name,
      description: typeof description + ': ' + description,
      address: typeof address + ': ' + address,
      budget: typeof budget + ': ' + budget,
      startDate: typeof startDate + ': ' + startDate,
      endDate: typeof endDate + ': ' + endDate,
      teamMembers: teamMembers.map(m => ({
        name: typeof m.name + ': ' + m.name,
        email: typeof m.email + ': ' + m.email,
        role: typeof m.role + ': ' + m.role
      }))
    });

    // Parse and validate budget
    let parsedBudget: number;
    try {
      parsedBudget = typeof budget === 'string' ? parseFloat(budget.replace(/[,$]/g, '')) : Number(budget);
      if (isNaN(parsedBudget)) {
        throw new Error('Invalid budget value');
      }
      console.log('Parsed budget:', parsedBudget);
    } catch (error) {
      console.error('Budget parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid budget format' },
        { status: 400 }
      )
    }

    // Parse and validate dates
    let parsedStartDate: Date, parsedEndDate: Date;
    try {
      parsedStartDate = new Date(startDate);
      parsedEndDate = new Date(endDate);
      
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        throw new Error('Invalid date values');
      }
      console.log('Parsed dates:', { startDate: parsedStartDate, endDate: parsedEndDate });
    } catch (error) {
      console.error('Date parsing error:', error);
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Validate team member roles
    const validRoles = ['GENERAL_CONTRACTOR', 'ARCHITECT_DESIGNER', 'PROJECT_MANAGER'];
    for (const member of teamMembers) {
      if (!validRoles.includes(member.role)) {
        console.error('Invalid role:', member.role);
        return NextResponse.json(
          { error: `Invalid role: ${member.role}` },
          { status: 400 }
        )
      }
    }

    console.log('All validations passed, creating project...');

    // Use a transaction to ensure all or nothing is created
    const newProject = await prisma.$transaction(async (tx) => {
      // 1. Create the project
      const project = await tx.project.create({
        data: {
          name: String(name),
          description: String(description),
          contractor: generalContractor?.name || null,
          address: String(address),
          budget: parsedBudget,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          userId: session.user.id,
        },
      });

      console.log('Project created within transaction:', project.id);

      // 2. Create team members
      await tx.teamMember.createMany({
        data: teamMembers.map(member => ({
          name: String(member.name),
          email: String(member.email),
          role: member.role,
          projectId: project.id,
        })),
      });

      console.log('Team members created for project:', project.id);

      // 3. Create email settings
      await tx.emailSettings.create({
        data: {
          projectId: project.id,
          // Set sensible defaults
          monitoringEnabled: true,
          notificationsEnabled: true,
          weeklyReports: false,
          highPriorityAlerts: true,
        },
      });

      console.log('Email settings created for project:', project.id);
      
      // 4. Create initial timeline entry
      await tx.timelineEntry.create({
        data: {
          title: 'Project Created',
          description: `The project "${project.name}" was successfully created.`,
          category: 'CREATE',
          date: new Date(),
          impact: 'Project kickoff',
          projectId: project.id,
          verified: true
        }
      });
      
      console.log('Initial timeline entry created for project:', project.id);

      // Return the full project data
      return tx.project.findUnique({
        where: { id: project.id },
        include: {
          teamMembers: true,
          emailSettings: true,
        },
      });
    });

    console.log('Transaction successful, returning new project:', newProject?.id);
    return NextResponse.json(newProject, { status: 201 });

  } catch (error: unknown) {
    console.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to create project', details: errorMessage },
      { status: 500 }
    );
  }
} 