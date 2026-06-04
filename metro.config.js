const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// Force the Arkade SDK and its subpaths to resolve to their CJS builds. The ESM
// build uses `export * as ns from '...'` (ES2020), which the React Native babel
// preset does not transform, so loading the ESM entry triggers a Babel error.
// The boltz-swap realm subpath is forced to CJS for the same reason — it
// re-exports the SDK realm types.
const resolveAliases = {
  '@arkade-os/sdk': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/index.cjs'),
  '@arkade-os/sdk/adapters/expo': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/adapters/expo.cjs'),
  '@arkade-os/sdk/repositories/realm': path.join(__dirname, 'node_modules/@arkade-os/sdk/dist/repositories/realm/index.cjs'),
  '@arkade-os/boltz-swap/repositories/realm': path.join(__dirname, 'node_modules/@arkade-os/boltz-swap/dist/repositories/realm/index.cjs'),
  'expo/fetch': path.join(__dirname, 'util/expo-fetch.js'),
};

// @bitcoinerlab/descriptors-core uses @noble/hashes 2.x APIs (`./legacy.js`,
// `./sha2.js`) but does not declare @noble/hashes as a direct dep. npm
// resolves up to the top-level @noble/hashes@1.3.3 (kept for bitcoinjs-lib),
// which doesn't expose those subpaths. Redirect any @noble/hashes import that
// originates inside descriptors-core to the v2 copy already nested under
// descriptors-scure.
const nobleHashesV2 = path.join(__dirname, 'node_modules/@bitcoinerlab/descriptors-scure/node_modules/@noble/hashes');
const descriptorsCoreDir = path.join('node_modules', '@bitcoinerlab', 'descriptors-core');

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

      if (moduleName.startsWith('@noble/hashes/') && context.originModulePath.includes(descriptorsCoreDir)) {
        return {
          type: 'sourceFile',
          filePath: path.join(nobleHashesV2, moduleName.slice('@noble/hashes/'.length)),
        };
      }

      // Fall back to default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
