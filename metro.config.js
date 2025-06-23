const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    /**
     * needed for spark. should be safe to remove after we bump RN version since it will default to 'true'
     * (`npm ls metro` should be >= 0.82.0)
     * @see https://metrobundler.dev/docs/configuration/#unstable_enablepackageexports-experimental
     */
    unstable_enablePackageExports: true,
    extraNodeModules: {
      ws: path.resolve(__dirname, 'ws-shim.js'),
    },
    resolveRequest: (context, moduleName, platform) => {
      /**
       * needed for spark. possibly can be removed after RN version bump
       */
      if (moduleName === '@buildonspark/spark-sdk/native') {
        return {
          filePath: path.resolve(__dirname, 'node_modules/@buildonspark/spark-sdk/dist/native/index.cjs'),
          type: 'sourceFile',
        };
      }

      if (moduleName === 'stream') {
        return {
          filePath: path.resolve(__dirname, 'node_modules/stream-browserify/index.js'),
          type: 'sourceFile',
        };
      }

      if (moduleName === 'net') {
        return {
          filePath: path.resolve(__dirname, 'node_modules/react-native-tcp-socket/src/index.js'),
          type: 'sourceFile',
        };
      }

      if (moduleName === 'tls') {
        return {
          filePath: path.resolve(__dirname, 'node_modules/react-native-tcp-socket/src/index.js'),
          type: 'sourceFile',
        };
      }

      /**
       * Node.js modules that need to be polyfilled for React Native
       */
      const nodeModules = {
        crypto: 'react-native-crypto',
        zlib: false,
        http: false,
        https: false,
        fs: false,
        child_process: false,
        cluster: false,
        dgram: false,
        dns: false,
        domain: false,
        punycode: false,
        readline: false,
        repl: false,
        string_decoder: false,
        sys: false,
        tty: false,
        vm: false,
        worker_threads: false,
      };

      if (nodeModules[moduleName] !== undefined) {
        if (nodeModules[moduleName] === false) {
          // Return empty module for unsupported Node.js modules
          return {
            filePath: path.resolve(__dirname, 'empty-module.js'),
            type: 'sourceFile',
          };
        }
        return {
          filePath: path.resolve(__dirname, `node_modules/${nodeModules[moduleName]}/index.js`),
          type: 'sourceFile',
        };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
