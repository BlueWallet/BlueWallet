import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { appiumLogFilters, redactAppiumLogs, redactSecrets, secretValues } from '../e2e-appium/redact';
import { secret } from '../e2e-appium/config';
import { rowPredicate } from '../e2e-appium/driver';

jest.mock('react-native-device-info', () => ({ getBundleId: jest.fn() }));

describe('Catalyst e2e harness', () => {
  it('matches a ListItem by its title and a merged row by its title prefix', () => {
    assert.strictEqual(rowPredicate('ARS ($)'), 'elementType == 9 AND (label == "ARS ($)" OR label BEGINSWITH "ARS ($),")');
  });

  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('takes secrets from the environment and fails loudly without them', () => {
    delete process.env.HD_MNEMONIC_BIP84;
    assert.throws(() => secret('HD_MNEMONIC_BIP84'), /Set HD_MNEMONIC_BIP84 \(locally: source \.\.\/env\.sh\)/);
    process.env.HD_MNEMONIC_BIP84 = ' zoo zoo wrong \n';
    assert.strictEqual(secret('HD_MNEMONIC_BIP84'), 'zoo zoo wrong');
  });

  it('refuses a seed the wallet would normalize, because artifacts would hold the normalized form', () => {
    // abstract-hd-wallet.ts lowercases, replaces separators and expands abbreviated words.
    for (const value of ['Zoo zoo wrong', 'zoo,zoo,wrong', 'zoo  zoo wrong', 'zo zoo wrong']) {
      process.env.HD_MNEMONIC_BIP84 = value;
      assert.throws(() => secret('HD_MNEMONIC_BIP84'), /HD_MNEMONIC_BIP84 must be lowercase BIP39 words separated by single spaces/);
      assert.throws(() => secretValues(), /HD_MNEMONIC_BIP84 must be lowercase BIP39 words separated by single spaces/);
    }
  });

  it('redacts recovery phrases the app generated during a run, not only the fixtures', () => {
    delete process.env.HD_MNEMONIC;
    delete process.env.HD_MNEMONIC_BIP84;
    const generated = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
    const text = [
      // numbered words of the backup screen (createWallet) and the export screen
      '<X label="1. zoo " /><X label="2. wrong " /><X label="12. zoo" />',
      // a whole phrase in one label
      `label="${generated}"`,
      // ordinary text stays
      'label="Add now" value="3 wallets" other="zoo"',
    ].join('\n');
    assert.strictEqual(
      redactSecrets(text, secretValues()),
      [
        '<X label="[redacted] " /><X label="[redacted] " /><X label="[redacted]" />',
        'label="[redacted]"',
        'label="Add now" value="3 wallets" other="zoo"',
      ].join('\n'),
    );
    assert.ok(appiumLogFilters(secretValues()).length > 0, 'the server log filters must not depend on fixtures');
  });

  it('redacts signed transactions and PSBTs the funded cases leave on screen', () => {
    delete process.env.HD_MNEMONIC;
    delete process.env.HD_MNEMONIC_BIP84;
    const rawTx = '02000000000101' + 'ab'.repeat(120) + '00000000';
    const psbt = 'cHNidP8BAH0CAAAAAb' + 'A'.repeat(120) + '==';
    const ur = 'UR:CRYPTO-PSBT/1-7/LPADATCFAALNCYHSGHLRKNHDOLAEAEAE';
    assert.strictEqual(
      redactSecrets(`label="${ur}" content="${Buffer.from(ur).toString('base64')}"`, secretValues()),
      'label="[redacted]" content="[redacted]"',
    );
    const text = `value="${rawTx}" content="${psbt}" script="76a91419129d53e6319baf19dba059bead166df90ab8f588ac" id="0200000000"`;
    assert.strictEqual(
      redactSecrets(text, secretValues()),
      'value="[redacted]" content="[redacted]" script="76a91419129d53e6319baf19dba059bead166df90ab8f588ac" id="0200000000"',
    );
  });

  it('redacts every form in which a seed reaches the artifacts', () => {
    delete process.env.HD_MNEMONIC;
    delete process.env.HD_MNEMONIC_BIP84;
    process.env.HD_MNEMONIC_BIP84 = 'abandon abandon about';
    const encoded = Buffer.from('abandon abandon about').toString('base64');
    const text = [
      // plain (accessibility XML, native log)
      'label="abandon abandon about" value="abandon abandon about" other="zoo"',
      // base64 clipboard payload (Appium server log)
      `{"script":"macos: setClipboard","args":[{"content":"${encoded}"}]}`,
      // numbered words (WalletExport screen); a numbered non-BIP39 word stays
      '<X label="1. abandon " /><X label="2. abandon " /><X label="3. about " /><X label="4. xyz " />',
    ].join('\n');
    assert.strictEqual(
      redactSecrets(text, secretValues()),
      [
        'label="[redacted]" value="[redacted]" other="zoo"',
        '{"script":"macos: setClipboard","args":[{"content":"[redacted]"}]}',
        '<X label="[redacted] " /><X label="[redacted] " /><X label="[redacted] " /><X label="4. xyz " />',
      ].join('\n'),
    );

    // The Appium server applies the same rules while writing its log.
    const filtered = appiumLogFilters(secretValues()).reduce(
      (result, rule) => result.replace(new RegExp(rule.pattern, 'g'), rule.replacer),
      text,
    );
    assert.strictEqual(filtered, redactSecrets(text, secretValues()));

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
