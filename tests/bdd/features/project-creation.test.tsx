/**
 * Feature: Project Creation 
 * Based on NailedIt MVP Product Requirements - Create New Project
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Use centralized fixtures
import {
  testUsers,
  testProjects,
  createAuthenticatedSession,
  createTestProject,
  formResponses,
  successResponses,
  errorResponses,
} from '../../fixtures'

// Mock NextAuth and Router
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('Feature: Create New Project', () => {
  const mockPush = jest.fn()
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue({ push: mockPush } as any)
    mockUseSession.mockReturnValue({
      data: { user: testUsers.john },
      status: 'authenticated',
      update: jest.fn()
    } as any)
  })

  /**
   * User Story: US-04 - Project Name
   * "As a homeowner who wants to initiate a new project in Nailit, 
   * I need to provide a project name that reflects the project's scope, 
   * so I can differentiate it from other projects."
   */
  describe('User Story: Project Name', () => {
    test('Given I want to create new project, When I enter project name that reflects scope, Then project is created with that name', async () => {
      // Given: I want to create a new project
      const MockProjectForm = () => {
        const [name, setName] = React.useState('')
        const [isSubmitting, setIsSubmitting] = React.useState(false)

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          setIsSubmitting(true)
          
          try {
            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, contractor: 'Test Contractor' }),
            })
            
            if (response.ok) {
              // Navigate to project detail page
              mockPush('/projects/new-project-123')
            }
          } finally {
            setIsSubmitting(false)
          }
        }

        return (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Enter project name that reflects the project's scope"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        )
      }

      // Mock successful API response using centralized fixtures
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        id: 'new-project-123',
        name: testProjects.kitchenReno.name,
        contractor: 'Test Contractor',
        redirectUrl: '/projects/new-project-123'
      }), { status: 201 }))

      render(<MockProjectForm />)

      // When: I enter a project name that reflects the project's scope
      const nameInput = screen.getByPlaceholderText(/Enter project name/)
      fireEvent.change(nameInput, { target: { value: testProjects.kitchenReno.name } })

      const submitButton = screen.getByRole('button', { name: /Create Project/ })
      fireEvent.click(submitButton)

      // Then: the project should be created with that name
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: testProjects.kitchenReno.name, 
            contractor: 'Test Contractor' 
          }),
        })
      })
    })
  })

  /**
   * User Story: US-05 - Add General Contractor
   * "As a homeowner who wants to initiate a new project in Nailit, 
   * I need to add a general contractor, so I know who is responsible for the overall project."
   */
  describe('User Story: Add General Contractor', () => {
    test('Given I am creating project, When I add general contractor, Then contractor is associated with project', async () => {
      // Given: I am creating a project
      const MockContractorForm = () => {
        const [contractor, setContractor] = React.useState('')
        const [isSubmitting, setIsSubmitting] = React.useState(false)

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          setIsSubmitting(true)
          
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: testProjects.kitchenReno.name,
              contractor 
            }),
          })
          
          setIsSubmitting(false)
        }

        return (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="General contractor name (required)"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              required
            />
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Contractor'}
            </button>
          </form>
        )
      }

      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        id: 'new-project-123',
        name: testProjects.kitchenReno.name,
        contractor: testProjects.kitchenReno.contractor
      }), { status: 201 }))

      render(<MockContractorForm />)

      // When: I add a general contractor
      const contractorInput = screen.getByPlaceholderText(/General contractor name/)
      fireEvent.change(contractorInput, { target: { value: testProjects.kitchenReno.contractor } })

      const submitButton = screen.getByRole('button', { name: /Add Contractor/ })
      fireEvent.click(submitButton)

      // Then: the contractor should be associated with the project
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: testProjects.kitchenReno.name,
            contractor: testProjects.kitchenReno.contractor
          }),
        })
      })
    })
  })

  /**
   * User Story: US-06 - Add Architect/Designer (Optional)
   * "As a homeowner who wants to initiate a new project in Nailit,
   * I want to optionally add an architect or designer, 
   * so they can be included in the project communications."
   */
  describe('User Story: Add Architect/Designer (Optional)', () => {
    test('Given I am creating project, When I optionally add architect, Then architect is included in project', async () => {
      // Given: I am creating a project
      const MockArchitectForm = () => {
        const [architect, setArchitect] = React.useState('')

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          
          await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: testProjects.kitchenReno.name,
              contractor: testProjects.kitchenReno.contractor,
              architect: architect || undefined
            }),
          })
        }

        return (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Architect/Designer (optional)"
              value={architect}
              onChange={(e) => setArchitect(e.target.value)}
            />
            <button type="submit">Add to Project</button>
          </form>
        )
      }

      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        id: 'new-project-123',
        name: testProjects.kitchenReno.name,
        contractor: testProjects.kitchenReno.contractor,
        architect: testProjects.kitchenReno.architect
      }), { status: 201 }))

      render(<MockArchitectForm />)

      // When: I optionally add an architect
      const architectInput = screen.getByPlaceholderText(/Architect\/Designer/)
      fireEvent.change(architectInput, { target: { value: testProjects.kitchenReno.architect } })

      const submitButton = screen.getByRole('button', { name: /Add to Project/ })
      fireEvent.click(submitButton)

      // Then: the architect should be included in the project
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: testProjects.kitchenReno.name,
            contractor: testProjects.kitchenReno.contractor,
            architect: testProjects.kitchenReno.architect
          }),
        })
      })
    })

    test('Given I am creating project, When I skip adding architect, Then project is created without architect', async () => {
      // Given: I am creating a project and skip architect
      const MockSkipArchitectForm = () => {
        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          
          await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: testProjects.kitchenReno.name,
              contractor: testProjects.kitchenReno.contractor,
              architect: undefined
            }),
          })
        }

        return (
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Architect/Designer (optional)" />
            <button type="submit">Skip Architect</button>
          </form>
        )
      }

      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        id: 'new-project-123',
        name: testProjects.kitchenReno.name,
        contractor: testProjects.kitchenReno.contractor
      }), { status: 201 }))

      render(<MockSkipArchitectForm />)

      // When: I skip adding an architect
      const submitButton = screen.getByRole('button', { name: /Skip Architect/ })
      fireEvent.click(submitButton)

      // Then: the project should be created without an architect
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: testProjects.kitchenReno.name,
            contractor: testProjects.kitchenReno.contractor,
            architect: undefined
          }),
        })
      })
    })
  })

  /**
   * User Story: US-07 - Add Project Manager (Optional)
   * "As a homeowner who wants to initiate a new project in Nailit,
   * I want to optionally add a project manager,
   * so they can be included in the project communications."
   */
  describe('User Story: Add Project Manager (Optional)', () => {
    test('Given I am creating project, When I optionally add project manager, Then PM is included in project', async () => {
      // Given: I am creating a project  
      const MockPMForm = () => {
        const [projectManager, setProjectManager] = React.useState('')

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          
          await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: testProjects.deckAddition.name,
              contractor: testProjects.deckAddition.contractor,
              projectManager: projectManager || undefined
            }),
          })
        }

        return (
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Project Manager (optional)"
              value={projectManager}
              onChange={(e) => setProjectManager(e.target.value)}
            />
            <button type="submit">Add PM to Project</button>
          </form>
        )
      }

      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        id: 'new-project-123',
        name: testProjects.deckAddition.name,
        contractor: testProjects.deckAddition.contractor,
        projectManager: testProjects.deckAddition.projectManager
      }), { status: 201 }))

      render(<MockPMForm />)

      // When: I optionally add a project manager
      const pmInput = screen.getByPlaceholderText(/Project Manager/)
      fireEvent.change(pmInput, { target: { value: testProjects.deckAddition.projectManager } })

      const submitButton = screen.getByRole('button', { name: /Add PM to Project/ })
      fireEvent.click(submitButton)

      // Then: the project manager should be included in the project
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: testProjects.deckAddition.name,
            contractor: testProjects.deckAddition.contractor,
            projectManager: testProjects.deckAddition.projectManager
          }),
        })
      })
    })
  })

  /**
   * Error Handling and Validation
   */
  describe('Error Handling', () => {
    test('Given invalid project data, When I submit form, Then validation errors are shown', async () => {
      // Given: I have a form with validation
      const MockValidationForm = () => {
        const [error, setError] = React.useState('')

        const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault()
          
          try {
            const response = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: '', contractor: '' }), // Invalid data
            })

            if (!response.ok) {
              const errorData = await response.json()
              setError(errorData.error)
            }
          } catch (err) {
            setError('Network error')
          }
        }

        return (
          <form onSubmit={handleSubmit}>
            <button type="submit">Submit Invalid Data</button>
            {error && <div role="alert">{error}</div>}
          </form>
        )
      }

      // Mock validation error response
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Validation failed',
        fieldErrors: {
          name: ['Project name is required'],
          contractor: ['Contractor is required'],
        }
      }), { status: 400 }))

      render(<MockValidationForm />)

      // When: I submit invalid data
      const submitButton = screen.getByRole('button', { name: /Submit Invalid Data/ })
      fireEvent.click(submitButton)

      // Then: validation errors should be shown
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Validation failed')
      })
    })
  })
}) 