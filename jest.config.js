module.exports = {
  testEnvironment: '<rootDir>/tests/custom-environment.js',
  reporters: ['default', ['<rootDir>/tests/custom-reporter.js', {}]],
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?)|silent-payments|@arkade-os)/'],
  moduleNameMapper: {
    '^expo/fetch$': '<rootDir>/util/expo-fetch-nodejs.js',
    '^@react-native-vector-icons/(.*)$': '<rootDir>/tests/mocks/vector-icons.js',
    '^react-native-svg$': '<rootDir>/tests/mocks/react-native-svg.js',
    // Mirror of metro.config.js resolveRequest: descriptors-core uses @noble/hashes v2
    // subpaths (e.g. `sha2.js`, `legacy.js`) but does not declare it as a dep, so npm
    // resolves up to v1.3.3 (which only exposes the no-extension subpaths via `exports`).
    // Redirect any `.js`-suffixed @noble/hashes subpath to the v2 copy nested under
    // descriptors-scure. bitcoinjs-lib imports `@noble/hashes/sha256` (no extension)
    // so it is unaffected.
    '^@noble/hashes/(.+\\.js)$': '<rootDir>/node_modules/@bitcoinerlab/descriptors-scure/node_modules/@noble/hashes/$1',
  },
  setupFiles: ['./tests/setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules'],
};
