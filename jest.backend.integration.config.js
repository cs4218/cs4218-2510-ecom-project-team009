export default {
  // display name
  displayName: "backend-integration",

  // test environment for backend integration tests
  testEnvironment: "node",

  // which tests to run - backend integration tests only
  testMatch: [
    "<rootDir>/controllers/*.integration.test.js",
    "<rootDir>/routes/*.integration.test.js",
    "<rootDir>/middlewares/*.integration.test.js",
    "<rootDir>/helpers/*.integration.test.js",
    "<rootDir>/models/*.integration.test.js",
  ],

  // don't be silent - show console logs during integration tests for debugging
  silent: false,

  // set longer timeout for integration tests (database operations take time)
  testTimeout: 30000,

  // setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/config/testDb.js"],

  // code coverage for integration tests
  collectCoverage: true,

  collectCoverageFrom: [
    "controllers/**",
    "routes/**",
    "middlewares/**",
    "helpers/**",
    "models/**",
  ],

  // code coverage directory
  coverageDirectory: "coverage/backend-integration",

  // code coverage reporters
  coverageReporters: ["lcov", "text", "json"],

  // code coverage threshold
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
};
