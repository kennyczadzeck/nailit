import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '../../../lib/prisma'
import { ProjectStatus } from '@prisma/client'

/**
 * @swagger
 * /api/projects/{id}:
 *   patch:
 *     summary: Update a project
 *     description: Update project details, team members, or status
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               budget:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, ARCHIVED]
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
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 */
// PATCH /api/projects/[id] - Update project (including archiving)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { action, ...updateData } = body

    // Verify project belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      },
      include: {
        emailSettings: true
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    let updatedProject

    if (action === 'archive') {
      // Archive the project and disable email monitoring
      updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          status: 'ARCHIVED' as ProjectStatus,
          updatedAt: new Date(),
          // Disable email monitoring when archiving
          emailSettings: {
            update: {
              monitoringEnabled: false,
              updatedAt: new Date()
            }
          }
        },
        include: {
          emailSettings: true,
          _count: {
            select: {
              flaggedItems: {
                where: { status: 'PENDING' }
              },
              timelineEntries: true
            }
          }
        }
      })

      // Log archiving activity in timeline
      await prisma.timelineEntry.create({
        data: {
          title: 'Project Archived',
          description: `Project "${existingProject.name}" has been archived. Email monitoring has been disabled.`,
          category: 'UPDATE',
          date: new Date(),
          impact: 'Project archived and monitoring stopped',
          projectId: projectId,
          verified: true
        }
      })

    } else {
      // Handle other project updates
      updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          emailSettings: true,
          _count: {
            select: {
              flaggedItems: {
                where: { status: 'PENDING' }
              },
              timelineEntries: true
            }
          }
        }
      })
    }

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     description: Permanently delete a project and all associated data
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // Verify project belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: projectId }
    })

    return NextResponse.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
} 