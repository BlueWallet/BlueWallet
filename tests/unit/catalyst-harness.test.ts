import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { redactAppiumLogs, redactSecrets, secretValues } from '../e2e-appium/redact';
import { secret } from '../e2e-appium/config';

jest.mock('react-native-device-info', () => ({ getBundleId: jest.fn() }));

describe('Catalyst e2e harness', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('takes secrets from the environment and fails loudly without them', () => {
    delete process.env.HD_MNEMONIC_BIP84;
    assert.throws(() => secret('HD_MNEMONIC_BIP84'), /Set HD_MNEMONIC_BIP84 \(locally: source \.\.\/env\.sh\)/);
    process.env.MNEMONICS_COBO = ' zoo zoo wrong \n';
    assert.strictEqual(secret('MNEMONICS_COBO'), 'zoo zoo wrong');
  });

  it('redacts every form in which a seed reaches the artifacts', () => {
    delete process.env.HD_MNEMONIC;
    delete process.env.MNEMONICS_COBO;
    process.env.HD_MNEMONIC_BIP84 = 'abandon  abandon about';
    const encoded = Buffer.from('abandon abandon about').toString('base64');
    const text = [
      // plain and whitespace-collapsed (accessibility XML)
      'label="abandon abandon about" value="abandon  abandon about" other="zoo"',
      // base64 clipboard payload (Appium server log)
      `{"script":"macos: setClipboard","args":[{"content":"${encoded}"}]}`,
      // numbered words (WalletExport screen); foreign words stay
      '<X label="1. abandon " /><X label="2. abandon " /><X label="3. about " /><X label="4. zoo " />',
    ].join('\n');
    assert.strictEqual(
      redactSecrets(text, secretValues()),
      [
        'label="[redacted]" value="[redacted]" other="zoo"',
        '{"script":"macos: setClipboard","args":[{"content":"[redacted]"}]}',
        '<X label="[redacted] " /><X label="[redacted] " /><X label="[redacted] " /><X label="4. zoo " />',
      ].join('\n'),
    );

    // Global teardown rewrites only the Appium server logs in the artifacts directory.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-redact-'));
    try {
      fs.writeFileSync(path.join(dir, 'appium-1.log'), `content ${encoded} plain abandon abandon about`);
      fs.writeFileSync(path.join(dir, 'other.xml'), 'abandon abandon about');
      redactAppiumLogs(dir, secretValues());
      assert.strictEqual(fs.readFileSync(path.join(dir, 'appium-1.log'), 'utf8'), 'content [redacted] plain [redacted]');
      assert.strictEqual(fs.readFileSync(path.join(dir, 'other.xml'), 'utf8'), 'abandon abandon about');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    delete process.env.HD_MNEMONIC_BIP84;
    assert.deepStrictEqual(secretValues(), []);
    assert.strictEqual(redactSecrets('nothing', []), 'nothing');
  });

  // The Metro adapter keeps the test app's settings out of the production app group
  // shared with widgets, and refuses to be bundled into any other app.
  it('keeps e2e preferences in the isolated bundle domain', async () => {
    const get = jest.fn().mockResolvedValue('127.0.0.1');
    const set = jest.fn().mockResolvedValue(undefined);
    const setName = jest.fn().mockResolvedValue(undefined);
    // TurboModule methods are non-enumerable; the adapter must not spread them away.
    NativeModules.RNDefaultPreference = Object.defineProperties(
      {},
      { get: { value: get }, set: { value: set }, setName: { value: setName } },
    );

    jest.mocked(DeviceInfo.getBundleId).mockReturnValue('io.bluewallet.bluewallet.e2e');
    let preferences: typeof import('../e2e-appium/preferences').default;
    jest.isolateModules(() => {
      preferences = require('../e2e-appium/preferences').default;
    });
    await preferences!.setName();
    expect(setName).not.toHaveBeenCalled();
    expect(await preferences!.getName()).toBe('io.bluewallet.bluewallet.e2e');
    expect(await preferences!.get('electrum_host')).toBe('127.0.0.1');
    expect(get).toHaveBeenCalledWith('electrum_host');
    await preferences!.set('electrum_tcp_port', '50001');
    expect(set).toHaveBeenCalledWith('electrum_tcp_port', '50001');

    jest.mocked(DeviceInfo.getBundleId).mockReturnValue('io.bluewallet.unrelated');
    expect(() => jest.isolateModules(() => require('../e2e-appium/preferences'))).toThrow('unrelated app');
  });

  // Mac2 bundles its own shell-quote, which npm overrides cannot patch; patches/ keeps both
  // copies protected against GHSA-pqg4-j6r4-53mv.
  it.each(['shell-quote', 'appium-mac2-driver/node_modules/shell-quote'])('keeps %s safe from command injection', moduleName => {
    // Mac2 exposes only ESM entry points; address its bundled CJS package on disk.
    const { quote, parse } = require(path.join(__dirname, '../../node_modules', moduleName));
    for (const terminator of ['\n', '\r', ' ', ' ']) {
      expect(() => quote(['echo', 'ok', { comment: 'comment' }, `argument${terminator}unexpected-command`])).toThrow(TypeError);
    }
    const args = ['wallet.e2e', 'a b', "c'd", '$(not-executed)', '127.0.0.1:50001'];
    expect(parse(quote(args))).toEqual(args);
  });
});
