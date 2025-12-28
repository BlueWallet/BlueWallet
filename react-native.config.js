module.exports = {
  project: {
    android: {},
    ios: {},
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
