export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run - only unit tests, exclude integration tests
  testMatch: [
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/middlewares/*.test.js",
    "<rootDir>/helpers/*.test.js",
    "<rootDir>/models/*.test.js",
    "<rootDir>/config/*.test.js",
    "!**/*.integration.test.js"

  ],
  // explicitly exclude integration test files
  testPathIgnorePatterns: [".*integration\\.test\\.js$"],

  silent: true,

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "controllers/**",
    "middlewares/**",
    "helpers/**",
    "models/**",
    "config/**",
    "!config/testDb.js",
    "!**/*.integration.test.js",
    "!**/*.test.js"
  ],
  coveragePathIgnorePatterns: [".*integration\\.test\\.js$"],
  coverageThreshold: {
    global: {
      lines: 100,
      functions: 100,
    },
  },
};
