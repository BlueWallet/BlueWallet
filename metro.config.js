const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// @bitcoinerlab/descriptors-core needs @noble/hashes v2.x (which has ./legacy, ./sha2, etc.)
// but npm dedupes to the root v1.3.3 that lacks those subpaths.
// Redirect to the v2 copy nested under @bitcoinerlab/descriptors-scure.
const nobleHashesV2 = path.join(__dirname, 'node_modules/@bitcoinerlab/descriptors-scure/node_modules/@noble/hashes');
const descriptorsCoreDir = path.join('node_modules', '@bitcoinerlab', 'descriptors-core');

const resolveAliases = {
  '@arkade-os/sdk': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/index.js'),
  '@arkade-os/sdk/repositories/realm': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/repositories/realm/index.js'),
  '@arkade-os/sdk/adapters/expo': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/adapters/expo.js'),
  '@arkade-os/sdk/worker/expo': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/cjs/worker/expo/index.js'),
  '@arkade-os/boltz-swap/repositories/realm': path.join(__dirname, 'node_modules/@arkade-os/boltz-swap/dist/repositories/realm/index.cjs'),
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

      // Redirect @noble/hashes imports from descriptors-core to the v2 copy
      if (moduleName.startsWith('@noble/hashes/') && context.originModulePath.includes(descriptorsCoreDir)) {
        const subpath = moduleName.replace('@noble/hashes/', '');
        return {
          type: 'sourceFile',
          filePath: path.join(nobleHashesV2, subpath),
        };
      }

      // Fall back to default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
