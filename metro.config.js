/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('@react-native/metro-config');

// Get the default Metro configuration.
const defaultConfig = getDefaultConfig(__dirname);

// If you have transformer settings to modify, you can do that here:
defaultConfig.transformer = {
  ...defaultConfig.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Export the updated configuration.
module.exports = defaultConfig;
