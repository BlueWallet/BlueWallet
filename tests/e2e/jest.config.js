module.exports = {
  maxWorkers: 1,
  // Default 10 minutes; long multisig / UR flows also set per-test overrides.
  testTimeout: 600_000,
  verbose: true,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
  setupFilesAfterEnv: ['<rootDir>/e2e/setup.js'],
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.spec.js'],
  transform: {
    '\\.[jt]sx?$': ['ts-jest'],
  },
};
