const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/infrastructure/',
    '<rootDir>/archive/',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/layout.tsx',
    '!app/**/loading.tsx',
    '!app/**/not-found.tsx',
    '!app/**/error.tsx',
    '!app/api/debug*/**',
    '!app/api/test*/**',
  ],
  // Temporarily disabled coverage thresholds - will re-enable as we increase coverage
  // coverageThreshold: {
  //   global: {
  //     branches: 0.5,
  //     functions: 1,
  //     lines: 2,
  //     statements: 1.5,
  //   },
  //   // Target higher coverage for critical components we're actively testing
  //   'app/components/ui/Button.tsx': {
  //     branches: 90,
  //     functions: 90,
  //     lines: 90,
  //     statements: 90,
  //   },
  //   'app/api/projects/route.ts': {
  //     branches: 6,
  //     functions: 15,
  //     lines: 15,
  //     statements: 15,
  //   },
  // },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@/fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@/helpers/(.*)$': '<rootDir>/tests/helpers/$1',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,jsx,ts,tsx}',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
  // Use node environment for API route tests
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  // Parallel execution optimization
  maxWorkers: process.env.CI ? 2 : '50%',
  // Cache optimization
  cacheDirectory: '<rootDir>/.jest-cache',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 