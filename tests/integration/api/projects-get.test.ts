import { GET } from '../../../app/api/projects/route'

// Mock the auth module
jest.mock('../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('../../../app/lib/prisma', () => ({
  prisma: {
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '../../../app/lib/prisma'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('GET /api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return empty array when user has no projects', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as any)

    ;(mockPrisma.project.count as jest.Mock).mockResolvedValue(0)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
    expect(mockPrisma.project.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' }
    })
  })

  it('should return projects with correct includes when user has projects', async () => {
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Test Project',
        userId: 'user-1',
        user: { id: 'user-1', name: 'Test User' },
        emailSettings: null,
        _count: {
          flaggedItems: 2,
          timelineEntries: 5,
        },
      },
    ]

    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as any)

    ;(mockPrisma.project.count as jest.Mock).mockResolvedValue(1)
    ;(mockPrisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockProjects)
    expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: expect.objectContaining({
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
      }),
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    })
  })

  it('should handle database errors gracefully', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1' },
    } as any)

    ;(mockPrisma.project.count as jest.Mock).mockRejectedValue(new Error('Database error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch projects')
  })
}) 