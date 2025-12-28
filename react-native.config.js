module.exports = {
  project: {
    android: {},
    ios: {},
  },
  codegenConfig: {
    name: 'BlueWalletSpec',
    type: 'app',
    jsSrcsDir: './codegen',
    android: {
      javaPackageName: 'io.bluewallet.bluewallet',
    },
  },
};
