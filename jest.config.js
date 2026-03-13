module.exports = {
  testEnvironment: '<rootDir>/tests/custom-environment.js',
  reporters: ['default', ['<rootDir>/tests/custom-reporter.js', {}]],
  preset: 'react-native',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?)|silent-payments|@arkade-os)/'],
  moduleNameMapper: {
    '^expo/fetch$': '<rootDir>/util/expo-fetch-nodejs.js',
    '^@arkade-os/sdk/repositories/realm$': '<rootDir>/node_modules/@arkade-os/sdk/dist/cjs/repositories/realm/index.js',
    '^@arkade-os/sdk/worker/expo$': '<rootDir>/node_modules/@arkade-os/sdk/dist/cjs/worker/expo/index.js',
    '^@arkade-os/boltz-swap/repositories/realm$': '<rootDir>/node_modules/@arkade-os/boltz-swap/dist/repositories/realm/index.cjs',
    '^@react-native-vector-icons/(.*)$': '<rootDir>/tests/mocks/vector-icons.js',
  },
  setupFiles: ['./tests/setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules'],
};
