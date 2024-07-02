module.exports = {
  preset: 'react-native',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native(-.*)?|@react-native(-community)?)|@rneui|silent-payments/)'],
  setupFiles: ['./tests/setup.js'],
  watchPathIgnorePatterns: ['<rootDir>/node_modules'],
  setupFilesAfterEnv: ['./tests/setupAfterEnv.js'],
};
