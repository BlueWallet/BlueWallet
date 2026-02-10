const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const resolveAliases = {
  '@arkade-os/sdk/adapters/expo': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/adapters/expo.js'),
  'expo/fetch': path.join(__dirname, 'util/expo-fetch.js'),
  'react-native-vector-icons/FontAwesome': path.join(
    __dirname,
    'node_modules/@react-native-vector-icons/fontawesome/lib/commonjs/index.js',
  ),
  'react-native-vector-icons/FontAwesome6': path.join(
    __dirname,
    'node_modules/@react-native-vector-icons/fontawesome6/lib/commonjs/index.js',
  ),
  'react-native-vector-icons/Ionicons': path.join(__dirname, 'node_modules/@react-native-vector-icons/ionicons/lib/commonjs/index.js'),
  'react-native-vector-icons/MaterialIcons': path.join(
    __dirname,
    'node_modules/@react-native-vector-icons/material-icons/lib/commonjs/index.js',
  ),
  'react-native-vector-icons/MaterialCommunityIcons': path.join(
    __dirname,
    'node_modules/@react-native-vector-icons/material-design-icons/lib/commonjs/index.js',
  ),
  'react-native-vector-icons/Entypo': path.join(__dirname, 'node_modules/@react-native-vector-icons/entypo/lib/commonjs/index.js'),
  'react-native-vector-icons/Octicons': path.join(__dirname, 'node_modules/@react-native-vector-icons/octicons/lib/commonjs/index.js'),
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
