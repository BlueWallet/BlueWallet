module.exports = {
  maxWorkers: 1,
  testTimeout: 333_000,
  verbose: true,
  reporters: ['detox/runners/jest/reporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testEnvironment: 'detox/runners/jest/testEnvironment',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.spec.js'],
  transform: {
    '\\.[jt]sx?$': ['ts-jest'],
  },
};
