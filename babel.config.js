module.exports = {
  presets: ['@babel/preset-typescript', 'module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          app: './src',
        },
      },
    ],
  ],
  env: {
    test: {
      plugins: ['react-native-config-node/transform'],
    },
  },
};
