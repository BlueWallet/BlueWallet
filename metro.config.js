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

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
