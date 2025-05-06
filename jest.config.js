module.exports = {
  testEnvironment: '<rootDir>/tests/custom-environment.js',
  reporters: ['default', ['<rootDir>/tests/custom-reporter.js', {}]],
  preset: 'react-native',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transformIgnorePatterns: ['node_modules/(?!(react-native|@react-native|@react-navigation)/)'],
  setupFiles: ['./tests/setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules'],
  setupFilesAfterEnv: ['./tests/setupAfterEnv.js'],
};
