module.exports = {
  // Pin the @babel/runtime version so Metro resolves a single copy instead of
  // bundling duplicate helpers, which bloats the bundle.
  // See https://github.com/babel/babel/issues/18050
  presets: [['module:@react-native/babel-preset', { enableBabelRuntime: '^7.26.0' }]],
  plugins: ['react-native-worklets/plugin'],
};
