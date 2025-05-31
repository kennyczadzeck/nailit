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
        teamMembers: true,
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
    if (!name || !startDate) {
      console.log('Missing required fields:', { name: !!name, startDate: !!startDate })
      return NextResponse.json(
        { error: 'Missing required fields: name, startDate' },
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

    // Create the project with team members and enhanced address data
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        contractor: generalContractor?.name || null, // Keep for backward compatibility
        address: address || null,
        addressLat: addressLat || null,
        addressLng: addressLng || null,
        budget: budget || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        userId: session.user.id,
        // Create team members
        teamMembers: {
          create: teamMembers.map(member => ({
            name: member.name,
            email: member.email,
            role: member.role
          }))
        },
        // Auto-create email settings with monitoring enabled
        emailSettings: {
          create: {
            monitoringEnabled: true,
            gmailConnected: true, // Assume connected since we have Google OAuth
            emailFilters: {
              // Store emails to monitor from all team members
              contractorEmail: generalContractor?.email,
              teamEmails: teamMembers.map(member => member.email),
            },
            notificationsEnabled: true,
            weeklyReports: true,
            highPriorityAlerts: true,
          }
        }
      },
      include: {
        emailSettings: true,
        teamMembers: true,
        user: true,
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
} 