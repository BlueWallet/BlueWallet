// Only build-catalyst.sh passes this config. Production Metro never loads these adapters.
const path = require('path');
const { mergeConfig } = require('@react-native/metro-config');
const base = require('../../metro.config');
const aliases = {
  'react-native-default-preference': 'preferences.ts',
};
module.exports = mergeConfig(base, {
  projectRoot: path.resolve(__dirname, '../..'),
  resolver: {
    resolveRequest(context, name, platform) {
      if (aliases[name])
        return {
          type: 'sourceFile',
          filePath: path.join(__dirname, aliases[name]),
        };
      return base.resolver.resolveRequest(context, name, platform);
    },
  },
});
