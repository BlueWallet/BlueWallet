module.exports = {
  testEnvironment: '<rootDir>/tests/custom-environment.js',
  reporters: ['default', ['<rootDir>/tests/custom-reporter.js', {}]],
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  // @neuraiproject/neurai-privacy publishes its client entry as ESM only; so does @noble/ciphers
  // (the wallet-crypto test double).
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?)|silent-payments|@arkade-os|@neuraiproject/neurai-privacy|@noble/ciphers)/',
  ],
  moduleNameMapper: {
    // The RN SDK subpath is import-only; its Node entry exports the same transaction builders.
    '^@neuraiproject/neurai-sign-esp32/react-native$': '<rootDir>/node_modules/@neuraiproject/neurai-sign-esp32/dist/index.cjs',
    '^expo/fetch$': '<rootDir>/util/expo-fetch-nodejs.js',
    '^@react-native-vector-icons/(.*)$': '<rootDir>/tests/mocks/vector-icons.js',
    '^react-native-svg$': '<rootDir>/tests/mocks/react-native-svg.js',
  },
  setupFiles: ['./tests/setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules'],
};
