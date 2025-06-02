/**
 * Test Utilities & Helpers
 * Common patterns and utilities for test setup
 */

import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import { testUsers, createAuthenticatedSession } from '../fixtures'

// Types
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: typeof testUsers.john
  authenticated?: boolean
  session?: any
}

/**
 * Custom render with authentication context
 */
export const renderWithAuth = (
  ui: React.ReactElement,
  {
    user = testUsers.john,
    authenticated = true,
    session,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const mockSession = session || (authenticated ? createAuthenticatedSession(user) : null)
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <SessionProvider session={mockSession}>
        {children}
      </SessionProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

/**
 * BDD Test Helpers
 */
export const bddHelpers = {
  given: (description: string) => ({
    when: (action: string, fn: () => void | Promise<void>) => ({
      then: (expectation: string, assertion: () => void | Promise<void>) => {
        test(`Given ${description}, When ${action}, Then ${expectation}`, async () => {
          await fn()
          await assertion()
        })
      }
    })
  }),
  
  scenario: (name: string, fn: () => void) => {
    describe(`Scenario: ${name}`, fn)
  },

  userStory: (story: string, fn: () => void) => {
    describe(`User Story: ${story}`, fn)
  }
}

/**
 * API Test Helpers
 */
export const apiHelpers = {
  createMockResponse: (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  },

  createErrorResponse: (error: string, status = 400) => {
    return new Response(JSON.stringify({ error }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  },

  setupFetchMock: (responses: Array<{ url?: string; response: Response }>) => {
    const mockFetch = jest.fn()
    
    responses.forEach(({ url, response }, index) => {
      if (url) {
        mockFetch.mockImplementation((reqUrl) => {
          if (reqUrl.includes(url)) {
            return Promise.resolve(response)
          }
          return Promise.reject(new Error(`Unexpected request to ${reqUrl}`))
        })
      } else {
        mockFetch.mockResolvedValueOnce(response)
      }
    })

    global.fetch = mockFetch
    return mockFetch
  }
}

/**
 * Form Test Helpers
 */
export const formHelpers = {
  fillInput: (element: HTMLElement, value: string) => {
    const input = element as HTMLInputElement
    input.focus()
    input.value = value
    input.dispatchEvent(new Event('change', { bubbles: true }))
    input.blur()
  },

  submitForm: (form: HTMLElement) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  }
}

/**
 * Database Test Helpers  
 */
export const dbHelpers = {
  setupMockPrisma: (mockImplementations: Record<string, jest.Mock>) => {
    const mockPrisma = {
      project: {},
      user: {},
      ...mockImplementations
    }
    
    jest.doMock('../../../app/lib/prisma', () => ({
      prisma: mockPrisma
    }))
    
    return mockPrisma
  }
}

/**
 * Router Test Helpers
 */
export const routerHelpers = {
  createMockRouter: (overrides: Partial<any> = {}) => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    ...overrides
  })
}

/**
 * Performance Test Helpers
 */
export const performanceHelpers = {
  measureRenderTime: async (renderFn: () => void) => {
    const start = performance.now()
    await renderFn()
    const end = performance.now()
    return end - start
  },

  expectFastRender: (renderTime: number, maxMs = 100) => {
    expect(renderTime).toBeLessThan(maxMs)
  }
}

/**
 * Test Data Builders
 */
export const builders = {
  project: (overrides: Partial<any> = {}) => ({
    id: `project-${Date.now()}`,
    name: 'Test Project',
    contractor: 'Test Contractor',
    userId: testUsers.john.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }),

  user: (overrides: Partial<any> = {}) => ({
    id: `user-${Date.now()}`,
    name: 'Test User',
    email: 'test@example.com',
    ...overrides
  })
} 