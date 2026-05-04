const path = require('path');

module.exports = {
  project: {
    android: {},
    ios: {},
  },
  assets: ['./assets/fonts'],
  dependencies: {
    'react-native-context-menu-view': {
      root: path.resolve(__dirname, 'node_modules/react-native-context-menu-view'),
      platforms: {
        ios: {
          podspecPath: path.resolve(__dirname, 'node_modules/react-native-context-menu-view/react-native-context-menu-view.podspec'),
        },
        android: {
          sourceDir: path.resolve(__dirname, 'node_modules/react-native-context-menu-view/android'),
        },
      },
    },
  },
  codegenConfig: {
    name: 'BlueWalletSpec',
    type: 'all',
    jsSrcsDir: './codegen',
    android: {
      javaPackageName: 'io.bluewallet.bluewallet',
    },
  },
};
