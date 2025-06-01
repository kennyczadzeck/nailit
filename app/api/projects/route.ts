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
        // Use dynamic access to bypass TypeScript issues
        ...(prisma as any).teamMembers && { teamMembers: true },
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
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Received project creation request:', body)
    
    const {
      name,
      description,
      teamMembers,
      address,
      addressLat,
      addressLng,
      budget,
      startDate,
      endDate,
    } = body

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

    // Create project first without nested creates
    const project = await prisma.project.create({
      data: {
        name: String(name),
        description: String(description),
        contractor: generalContractor?.name || null,
        address: String(address),
        budget: parsedBudget,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        userId: session.user.id
      }
    });

    console.log('Project created successfully:', project.id);

    // For now, let's just return the project without creating team members or email settings
    // to isolate where the failure is happening
    console.log('Returning project without creating related records for debugging...');
    return NextResponse.json(project, { status: 201 })

    /* TEMPORARILY COMMENTED OUT FOR DEBUGGING
    // Create team members separately using correct model name
    for (const member of teamMembers) {
      console.log('Creating team member:', member);
      try {
        await (prisma as any).teamMember.create({
          data: {
            name: String(member.name),
            email: String(member.email),
            role: member.role,
            projectId: project.id
          }
        });
        console.log('Team member created successfully:', member.name);
      } catch (error) {
        console.error('Team member creation failed:', error);
        throw new Error(`Failed to create team member ${member.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create email settings separately
    console.log('Creating email settings...');
    try {
      await prisma.emailSettings.create({
        data: {
          projectId: project.id,
          monitoringEnabled: true,
          gmailConnected: true,
          emailFilters: {
            contractorEmail: generalContractor?.email,
            teamEmails: teamMembers.map(member => member.email),
          },
          notificationsEnabled: true,
          weeklyReports: true,
          highPriorityAlerts: true,
        }
      });
      console.log('Email settings created successfully');
    } catch (error) {
      console.error('Email settings creation failed:', error);
      throw new Error(`Failed to create email settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('Project creation completed successfully');

    return NextResponse.json(project, { status: 201 })
    */
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
} 