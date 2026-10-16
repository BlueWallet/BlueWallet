import path from 'path';

// Mac2 bundles its own dependency, so npm overrides alone cannot patch it.
// Keep both copies protected against GHSA-pqg4-j6r4-53mv.
describe.each(['shell-quote', 'appium-mac2-driver/node_modules/shell-quote'])('%s command argument quoting', moduleName => {
  // Mac2 exposes only ESM entry points; address its bundled CJS package on disk.
  const { quote, parse } = require(path.join(__dirname, '../../node_modules', moduleName));

  it.each(['\n', '\r', '\u2028', '\u2029'])('rejects a line terminator after a comment token (%j)', terminator => {
    expect(() => quote(['echo', 'ok', { comment: 'comment' }, `argument${terminator}unexpected-command`])).toThrow(TypeError);
  });

  it('preserves ordinary arguments without evaluating shell syntax', () => {
    const args = ['wallet.e2e', 'a b', "c'd", '$(not-executed)', '127.0.0.1:50001'];
    expect(parse(quote(args))).toEqual(args);
  });
});
