module.exports = {
  maxWorkers: 1,
  testTimeout: 600_000, // first session builds WebDriverAgentMac, which takes a while
  verbose: true,
  bail: process.env.E2E_FAIL_FAST === '0' ? 0 : 1,
  testEnvironment: '<rootDir>/e2e-appium/environment.js',
  testEnvironmentOptions: { failFast: process.env.E2E_FAIL_FAST !== '0' },
  globalSetup: '<rootDir>/e2e-appium/globalSetup.ts',
  globalTeardown: '<rootDir>/e2e-appium/globalTeardown.ts',
  rootDir: '..',
  testMatch: ['<rootDir>/e2e-appium/**/*.spec.ts'],
  transform: {
    // Preserve native dynamic import for ESM-only crypto dependencies.
    '\\.[jt]sx?$': ['ts-jest', { tsconfig: { module: 'Node16', moduleResolution: 'Node16' } }],
  },
};
