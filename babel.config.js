module.exports = {
  presets: ['@babel/preset-typescript', 'module:metro-react-native-babel-preset'],
  env: {
    test: {
      plugins: ['react-native-config-node/transform'],
    },
  },
};
