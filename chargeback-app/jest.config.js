/**
 * Jest configuration for Next.js 14 (App Router).
 * Uses next/jest which sets up SWC transforms automatically.
 */
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Points to the Next.js app root so next/jest can pick up next.config.js and .env files
  dir: './',
})

/** @type {import('jest').Config} */
const customConfig = {
  // Use Node environment for API route tests (not jsdom)
  testEnvironment: 'node',

  // Path alias — mirrors tsconfig paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Collect test files under __tests__
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],

  // Setup file applied after the test framework is installed (correct Jest key)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Coverage — exclude generated files and pure layout/page shells
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/layout.tsx',
    '!src/**/page.tsx',
    '!src/app/globals.css',
  ],

  // Show a summary of coverage at the end of each run
  coverageReporters: ['text-summary', 'lcov'],
}

module.exports = createJestConfig(customConfig)
