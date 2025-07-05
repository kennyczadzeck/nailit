require('@testing-library/jest-dom')
require('whatwg-fetch')

// Polyfill for Next.js API routes
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Add setImmediate polyfill for Node.js compatibility
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args))
global.clearImmediate = global.clearImmediate || ((id) => clearTimeout(id))

// Mock AWS SDK modules to prevent ESM parsing issues
jest.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({}),
  })),
  PutLogEventsCommand: jest.fn(),
  CreateLogGroupCommand: jest.fn(),
  CreateLogStreamCommand: jest.fn(),
}))

// Mock logger to prevent winston issues in tests
jest.mock('./app/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    security: jest.fn(),
    performance: jest.fn(),
    audit: jest.fn(),
    apiRequest: jest.fn(),
    databaseQuery: jest.fn(),
    emailProcessing: jest.fn(),
    aiAnalysis: jest.fn(),
    createRequestContext: jest.fn(() => ({})),
    logRequestStart: jest.fn(),
    logRequestEnd: jest.fn(),
    sanitizeMetadata: jest.fn((metadata) => metadata),
  },
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}))

// Mock Next.js image
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => {
    return 'NextImageMock'
  },
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Global test utilities
global.fetch = jest.fn()

// Mock environment variables for consistent testing
process.env.NODE_ENV = 'test'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'

// Suppress console warnings during tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
  jest.clearAllMocks()
}) 