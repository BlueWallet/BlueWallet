import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { redactAppiumLogs, redactSecrets, secretValues } from '../e2e-appium/redact';
import { secret } from '../e2e-appium/config';

describe('Catalyst secrets', () => {
  const previous = { ...process.env };
  afterEach(() => {
    process.env = { ...previous };
  });

  it('throws a clear error when a required secret is missing', () => {
    delete process.env.HD_MNEMONIC_BIP84;
    assert.throws(() => secret('HD_MNEMONIC_BIP84'), /Set HD_MNEMONIC_BIP84 \(locally: source \.\.\/env\.sh\)/);
  });

  it('returns the trimmed secret', () => {
    process.env.MNEMONICS_COBO = ' zoo zoo wrong \n';
    assert.strictEqual(secret('MNEMONICS_COBO'), 'zoo zoo wrong');
  });

  it('redacts secret values and their whitespace-collapsed forms', () => {
    process.env.HD_MNEMONIC_BIP84 = 'abandon  abandon about';
    const text = 'label="abandon abandon about" value="abandon  abandon about" other="zoo"';
    assert.strictEqual(redactSecrets(text, secretValues()), 'label="[redacted]" value="[redacted]" other="zoo"');
  });

  it('redacts the base64 form that Appium logs for clipboard payloads', () => {
    process.env.HD_MNEMONIC_BIP84 = 'abandon abandon about';
    const encoded = Buffer.from('abandon abandon about').toString('base64');
    const text = `{"script":"macos: setClipboard","args":[{"content":"${encoded}"}]}`;
    assert.strictEqual(redactSecrets(text, secretValues()), '{"script":"macos: setClipboard","args":[{"content":"[redacted]"}]}');
  });

  it('redacts the numbered words the WalletExport screen exposes one by one', () => {
    process.env.HD_MNEMONIC_BIP84 = 'abandon abandon about';
    const text = '<X label="1. abandon " /><X label="2. abandon " /><X label="3. about " /><X label="4. zoo " />';
    assert.strictEqual(
      redactSecrets(text, secretValues()),
      '<X label="[redacted] " /><X label="[redacted] " /><X label="[redacted] " /><X label="4. zoo " />',
    );
  });

  it('rewrites Appium server logs in the artifacts directory', () => {
    process.env.HD_MNEMONIC_BIP84 = 'abandon abandon about';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalyst-redact-'));
    const log = path.join(dir, 'appium-1.log');
    fs.writeFileSync(log, `content ${Buffer.from('abandon abandon about').toString('base64')} plain abandon abandon about`);
    fs.writeFileSync(path.join(dir, 'other.xml'), 'abandon abandon about');
    redactAppiumLogs(dir, secretValues());
    assert.strictEqual(fs.readFileSync(log, 'utf8'), 'content [redacted] plain [redacted]');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'other.xml'), 'utf8'), 'abandon abandon about');
  });

  it('ignores empty or unset secrets', () => {
    delete process.env.HD_MNEMONIC;
    delete process.env.HD_MNEMONIC_BIP84;
    delete process.env.MNEMONICS_COBO;
    assert.deepStrictEqual(secretValues(), []);
    assert.strictEqual(redactSecrets('nothing', secretValues()), 'nothing');
  });
});
