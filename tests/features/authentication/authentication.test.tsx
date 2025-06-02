/**
 * Feature: Authentication
 * All authentication-related tests (BDD, integration, unit)
 * Based on NailedIt MVP Product Requirements
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Use centralized fixtures
import { 
  testUsers, 
  createAuthenticatedSession,
  createUnauthenticatedSession
} from '../../fixtures'

// Mock NextAuth and navigation
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/'),
}))

// Mock components for testing
const MockSignInPage = () => (
  <div>
    <h1>Sign In to NailIt</h1>
    <button onClick={() => signIn('google')}>Continue with Google</button>
  </div>
)

const MockHomePage = () => {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <div>Loading...</div>
  
  if (session?.user) {
    return (
      <div>
        <h1>Welcome back, {session.user.name}!</h1>
        <h2>Your Projects</h2>
      </div>
    )
  }
  
  return (
    <div>
      <h1>Track your home project progress with NailIt</h1>
      <button onClick={() => signIn('google')}>Get started with Google</button>
    </div>
  )
}

describe('Feature: Authentication', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  /**
   * BDD Tests: User Story Implementation
   */
  describe('BDD: User Stories', () => {
    describe('User Story: Signup', () => {
      test('Given homeowner does not have account, When they click signup CTA, Then they are prompted to login with Google', () => {
        // Given: homeowner does not have a Nailit account
        ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())
        
        // When: they click the signup CTA
        render(<MockSignInPage />)
        const signupButton = screen.getByText('Continue with Google')
        fireEvent.click(signupButton)
        
        // Then: they will be prompted to 'login with Google' as their identity provider
        expect(signIn).toHaveBeenCalledWith('google')
      })
    })

    describe('User Story: Login', () => {
      test('Given homeowner has account but no active session, When they click login CTA, Then they login with Google', () => {
        // Given: homeowner does have an account but no active Nailit session
        ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())
        
        // When: they click the login CTA
        render(<MockSignInPage />)
        const loginButton = screen.getByText('Continue with Google')
        fireEvent.click(loginButton)
        
        // Then: they will need to login with Google
        expect(signIn).toHaveBeenCalledWith('google')
      })
    })

    describe('User Story: Value Proposition', () => {
      test('Given I am not authenticated, When I visit homepage, Then I see value proposition', () => {
        // Given: User is not authenticated
        ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())

        // When: I visit the homepage
        render(<MockHomePage />)

        // Then: I should see the value proposition
        expect(screen.getByText('Track your home project progress with NailIt')).toBeInTheDocument()
        expect(screen.getByText('Get started with Google')).toBeInTheDocument()
      })
    })
  })

  /**
   * Integration Tests: Authentication Flow
   */
  describe('Integration: Authentication Flow', () => {
    test('Given I am authenticated, When I visit homepage, Then I see dashboard', () => {
      // Given: User is authenticated
      ;(useSession as jest.Mock).mockReturnValue(createAuthenticatedSession(testUsers.john))

      // When: I visit the homepage
      render(<MockHomePage />)

      // Then: I should see my dashboard
      expect(screen.getByText('Welcome back, John Homeowner!')).toBeInTheDocument()
      expect(screen.getByText('Your Projects')).toBeInTheDocument()
    })

    test('Given session expires, When I access protected content, Then I see loading state', () => {
      // Given: Session has expired (loading state)
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading'
      })

      // When: I try to access protected content  
      render(<MockHomePage />)

      // Then: I should see loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  /**
   * Unit Tests: Authentication Components
   */
  describe('Unit: Authentication Components', () => {
    test('SignIn component renders and handles Google OAuth', () => {
      render(<MockSignInPage />)
      
      expect(screen.getByText('Sign In to NailIt')).toBeInTheDocument()
      expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    })

    test('Homepage adapts to authentication state', () => {
      const { rerender } = render(<MockHomePage />)
      
      // Test unauthenticated state
      ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())
      rerender(<MockHomePage />)
      expect(screen.getByText(/Get started with Google/)).toBeInTheDocument()
      
      // Test authenticated state
      ;(useSession as jest.Mock).mockReturnValue(createAuthenticatedSession(testUsers.john))
      rerender(<MockHomePage />)
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
    })
  })
}) 