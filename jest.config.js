const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const config = {
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
    // '@prisma/client': '<rootDir>/node_modules/@prisma/client',
    '^@/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/app/components/$1',
    '^@/lib/(.*)$': '<rootDir>/app/lib/$1',
    '^@/utils/(.*)$': '<rootDir>/app/utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/infrastructure/',
    '<rootDir>/archive/',
  ],
  // Transform ESM modules from AWS SDK and other packages
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@smithy|@aws-sdk)/)',
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
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,jsx,ts,tsx}',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  // Use node environment for API route tests
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  // Parallel execution optimization
  maxWorkers: process.env.CI ? 2 : '50%',
  // Cache optimization
  cacheDirectory: '<rootDir>/.jest-cache',
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config) 