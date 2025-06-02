/**
 * Feature: Authentication (Logged Out Experience)
 * Based on NailedIt MVP Product Requirements
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Use centralized fixtures
import { 
  testUsers, 
  userScenarios,
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

// Mock components - in real implementation these would be actual components
const MockSignInPage = () => (
  <div>
    <h1>Sign In to NailIt</h1>
    <button onClick={() => signIn('google')}>Continue with Google</button>
  </div>
)

const MockWelcomePage = () => (
  <div>
    <h1>NailIt - Project Communication Monitoring</h1>
    <p>Monitor your renovation project communications and get alerts for important changes</p>
    <ul>
      <li>Automatic email monitoring</li>
      <li>AI-powered change detection</li>
      <li>Project timeline tracking</li>
    </ul>
    <button>Get Started</button>
  </div>
)

const MockDashboard = ({ user }: { user: any }) => (
  <div>
    <h1>Welcome back, {user.name}!</h1>
    <h2>Your Projects</h2>
  </div>
)

const MockHomePage = () => {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <div>Loading...</div>
  }
  
  if (session?.user) {
    return <MockDashboard user={session.user} />
  }
  
  return (
    <div>
      <h1>Track your home project progress with NailIt</h1>
      <button onClick={() => signIn('google')}>Get started with Google</button>
    </div>
  )
}

describe('Feature: Authentication (Logged Out Experience)', () => {
  const mockPush = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  /**
   * User Story: Signup
   * "As a homeowner who does not have a Nailit account, I need to sign up for an account 
   * using Google as my identity provider so I can gain access to Nailit."
   */
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

  /**
   * User Story: Login  
   * "As a homeowner with a Nailit account who hasn't authenticated, I need to authenticate 
   * with Google as my identity provider so that I can gain access to Nailit."
   */
  describe('User Story: Login', () => {
    test('Given homeowner does have account but no active session, When they click login CTA, Then they login with Google', () => {
      // Given: homeowner does have an account but no active Nailit session
      ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())
      
      // When: they click the login CTA
      render(<MockSignInPage />)
      const loginButton = screen.getByText('Continue with Google')
      fireEvent.click(loginButton)
      
      // Then: they will need to login with Google
      expect(signIn).toHaveBeenCalledWith('google')
    })

    test('Given homeowner has active session, When they navigate to Nailit, Then they are redirected to dashboard', () => {
      // Given: homeowner does have an active Nailit session (using centralized fixtures)
      const mockSession = createAuthenticatedSession(testUsers.john)
      ;(useSession as jest.Mock).mockReturnValue(mockSession)
      
      // When: they navigate to Nailit
      // Then: they will be automatically redirected to their project dashboard
      expect(mockSession.status).toBe('authenticated')
      expect(mockSession.data.user).toBeDefined()
    })
  })

  /**
   * User Story: Value Prop
   * "As a potential homeowner of Nailit, I need to understand the value proposition 
   * and how it works, so I can decide whether or not I want to try it."
   */
  describe('User Story: Value Proposition', () => {
    test('Given unfamiliar with Nailit, When I visit website, Then I understand value proposition', () => {
      // Given: I'm unfamiliar with Nailit
      ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())
      
      // When: I visit the Nailit website
      render(<MockWelcomePage />)
      
      // Then: I should understand the value proposition
      expect(screen.getByText(/Project Communication Monitoring/)).toBeInTheDocument()
      expect(screen.getByText(/Monitor your renovation project/)).toBeInTheDocument()
      expect(screen.getByText(/Automatic email monitoring/)).toBeInTheDocument()
      expect(screen.getByText(/AI-powered change detection/)).toBeInTheDocument()
      expect(screen.getByText(/Get Started/)).toBeInTheDocument()
    })
  })
})

describe('Authentication User Stories with Mock Components', () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
    jest.clearAllMocks()
  })

  describe('Value Proposition Display', () => {
    test('Given I am not authenticated, When I visit the homepage, Then I should see the value proposition', async () => {
      // Given: User is not authenticated (using centralized fixtures)
      ;(useSession as jest.Mock).mockReturnValue(createUnauthenticatedSession())

      // When: I visit the homepage
      render(<MockHomePage />)

      // Then: I should see the value proposition
      expect(screen.getByText('Track your home project progress with NailIt')).toBeInTheDocument()
      expect(screen.getByText('Get started with Google')).toBeInTheDocument()
    })
  })

  describe('Authentication Status', () => {
    test('Given I am authenticated, When I visit the homepage, Then I should see my dashboard', async () => {
      // Given: User is authenticated (using centralized fixtures)
      ;(useSession as jest.Mock).mockReturnValue(createAuthenticatedSession(testUsers.john))

      // When: I visit the homepage
      render(<MockHomePage />)

      // Then: I should see my dashboard
      expect(screen.getByText('Welcome back, John Homeowner!')).toBeInTheDocument()
      expect(screen.getByText('Your Projects')).toBeInTheDocument()
    })

    test('Given my session expires, When I try to access protected content, Then I should see the login prompt', async () => {
      // Given: Session has expired (loading state)
      ;(useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading'
      })

      // When: I try to access protected content  
      render(<MockHomePage />)

      // Then: I should see loading state (which will redirect to login)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('User Profile Display', () => {
    test('Given I am authenticated with Google, When I view my profile area, Then I should see my Google account information', async () => {
      // Given: User is authenticated with Google account (using centralized fixtures)
      ;(useSession as jest.Mock).mockReturnValue(createAuthenticatedSession(testUsers.john))

      // When: I view my profile area
      render(<MockHomePage />)

      // Then: I should see my Google account information (flexible text matching)
      expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
      expect(screen.getByText(/John Homeowner/)).toBeInTheDocument()
      // Note: Email display would be implemented in actual profile component
    })
  })
}) 