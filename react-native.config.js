// react-native.config.js
module.exports = {
  dependencies: {
    'rn-ldk': {
      platforms: {
        ios: null, // Disable autolinking for ios
        // android: null, // Uncomment if you also want to disable autolinking for Android
      },
    },
  },
};
