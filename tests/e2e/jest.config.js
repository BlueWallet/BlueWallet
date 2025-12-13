module.exports = {
  maxWorkers: 1,
  testTimeout: 600_000, // 10 minutes. iOS multisig and plausible deniability tests take a long time to run
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
