module.exports = {
  maxWorkers: 1,
  testTimeout: 900_000, // 15 minutes. iOS multisig, plausible deniability, and PSBT watch-only tests take a long time to run
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
