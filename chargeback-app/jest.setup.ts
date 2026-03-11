/**
 * Global Jest setup — runs once after the test framework is installed
 * in each test worker process.
 *
 * Keep this file minimal; test-specific setup belongs in the test file.
 */

// Silence expected console.error calls from API routes during tests.
// Individual tests can spy on console.error if they need to assert on it.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})
