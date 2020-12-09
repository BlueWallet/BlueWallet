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
    [
      'transform-inline-environment-variables',
      {
        include: ['NODE_ENV', 'LOG_BOX_IGNORE'],
      },
    ],
  ],
  env: {
    test: {
      plugins: ['react-native-config-node/transform'],
    },
  },
};
