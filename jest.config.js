module.exports = {
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  modulePathIgnorePatterns: ['<rootDir>/tests/e2e'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(jest-)?react-native|react-navigation|@react-native-community|@sentry/*)'],
  coveragePathIgnorePatterns: ['/node_modules/'],
};
