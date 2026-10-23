// Shared by the Detox and Catalyst end-to-end builds (BUNDLE_CONFIG). Production Metro never loads it.
// With E2E_HIDE_SECRETS=1 (set by the e2e workflows, whose failure videos and screenshots are
// uploaded) helpers/e2e-flags.ts is replaced so that secrets are drawn in transparent ink.
const path = require('path');
const { mergeConfig } = require('@react-native/metro-config');
const base = require('../../metro.config');
const replacements =
  process.env.E2E_HIDE_SECRETS === '1'
    ? { [path.resolve(__dirname, '../../helpers/e2e-flags.ts')]: path.join(__dirname, 'e2e-flags.ts') }
    : {};
module.exports = mergeConfig(base, {
  projectRoot: path.resolve(__dirname, '../..'),
  resolver: {
    resolveRequest(context, name, platform) {
      const resolved = base.resolver.resolveRequest(context, name, platform);
      if (resolved.type === 'sourceFile' && replacements[resolved.filePath])
        return {
          type: 'sourceFile',
          filePath: replacements[resolved.filePath],
        };
      return resolved;
    },
  },
});
