const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const resolveAliases = {
  '@arkade-os/sdk/adapters/expo': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/adapters/expo.js'),
  'expo/fetch': path.join(__dirname, 'util/expo-fetch.js'),
};

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
    resolveRequest: (context, moduleName, platform) => {
      if (resolveAliases[moduleName])
        return {
          type: 'sourceFile',
          filePath: resolveAliases[moduleName],
        };

      // Fall back to default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
