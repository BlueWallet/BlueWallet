const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    extraNodeModules: {
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      net: require.resolve('react-native-tcp-socket'),
      tls: require.resolve('react-native-tcp-socket'),
    },
  },
  transformer: {
    // Enable inline requires for better performance with dynamic language loading
    inlineRequires: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
