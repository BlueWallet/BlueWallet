module.exports = {
  maxWorkers: 1,
  testTimeout: 600_000, // first session builds WebDriverAgentMac, which takes a while
  verbose: true,
  testEnvironment: 'node',
  globalSetup: '<rootDir>/e2e-appium/globalSetup.ts',
  globalTeardown: '<rootDir>/e2e-appium/globalTeardown.ts',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e-appium/**/*.spec.ts'],
  transform: {
    '\\.[jt]sx?$': ['ts-jest'],
  },
};
