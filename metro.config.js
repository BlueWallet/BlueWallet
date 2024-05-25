const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const defaultSourceExts = require('metro-config/src/defaults/defaults').sourceExts;
const defaultAssetExts = require('metro-config/src/defaults/defaults').assetExts;
/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: defaultAssetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultSourceExts, 'svg'],
  },
});
