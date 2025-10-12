export default {
  // display name
  displayName: "frontend-integration",

  // test environment for frontend integration tests
  testEnvironment: "jest-environment-jsdom",

  // which tests to run - frontend integration tests only
  testMatch: ["<rootDir>/client/src/**/*.integration.test.js"],

  // jest does not recognise jsx files by default, so we use babel to transform any jsx files
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  // tells jest how to handle css/scss imports in your tests
  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
  },

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // don't be silent - show console logs during integration tests for debugging
  silent: false,

  // set longer timeout for integration tests (component rendering and interactions take time)
  testTimeout: 30000,

  // setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],

  // code coverage for integration tests
  collectCoverage: true,

  collectCoverageFrom: [
    "client/src/pages/**",
    "client/src/context/**",
    "client/src/hooks/**",
    "client/src/components/**",
  ],

  // code coverage directory
  coverageDirectory: "coverage/frontend-integration",

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
