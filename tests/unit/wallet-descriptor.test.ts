import assert from 'assert';

import { WalletDescriptor } from '../../class/wallet-descriptor';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { HDSegwitP2SHWallet } from '../../class/wallets/hd-segwit-p2sh-wallet';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('WalletDescriptor', () => {
  describe('normalizeToXpub', () => {
    it('passes through xpub unchanged', () => {
      const xpub = 'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
      assert.strictEqual(WalletDescriptor.normalizeToXpub(xpub), xpub);
    });

    it('converts zpub to xpub', () => {
      const zpub = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
      const result = WalletDescriptor.normalizeToXpub(zpub);
      assert.ok(result.startsWith('xpub'), `Expected xpub prefix, got: ${result.substring(0, 4)}`);
      assert.strictEqual(
        result,
        'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V',
      );
    });

    it('converts ypub to xpub', () => {
      const ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
      const result = WalletDescriptor.normalizeToXpub(ypub);
      assert.ok(result.startsWith('xpub'), `Expected xpub prefix, got: ${result.substring(0, 4)}`);
      assert.strictEqual(
        result,
        'xpub6Bs2TeWr8hC91BJFNDGFKYomz1pTwjjKJWRVY798YWMjJVrU9dZy1vHvqda1EyqmazUtVpVD6eADnELDfN5jCiTWiJ52tdVvcNXVpa2Z6fx',
      );
    });

    it('passes through tpub unchanged', () => {
      const tpub = 'tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba';
      assert.strictEqual(WalletDescriptor.normalizeToXpub(tpub), tpub);
    });
  });

  describe('scriptTypeFromPath', () => {
    it('detects p2tr from BIP86 path', () => {
      assert.strictEqual(WalletDescriptor.scriptTypeFromPath("m/86'/0'/0'"), 'p2tr');
    });
    it('detects p2wpkh from BIP84 path', () => {
      assert.strictEqual(WalletDescriptor.scriptTypeFromPath("m/84'/0'/0'"), 'p2wpkh');
    });
    it('detects p2sh(p2wpkh) from BIP49 path', () => {
      assert.strictEqual(WalletDescriptor.scriptTypeFromPath("m/49'/0'/0'"), 'p2sh(p2wpkh)');
    });
    it('detects p2pkh from BIP44 path', () => {
      assert.strictEqual(WalletDescriptor.scriptTypeFromPath("m/44'/0'/0'"), 'p2pkh');
    });
    it('returns undefined for non-standard path', () => {
      assert.strictEqual(WalletDescriptor.scriptTypeFromPath("m/0'"), undefined);
    });
  });

  describe('getDescriptor', () => {
    it('generates wpkh descriptor for BIP84', () => {
      const xpub = 'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/84'/0'/0'", xpub);
      assert.strictEqual(result, `wpkh([73c5da0a/84'/0'/0']${xpub}/<0;1>/*)`);
    });

    it('generates pkh descriptor for BIP44', () => {
      const xpub = 'xpub6ByZUAv558PPheJgcPYHpxPLwz8M7TtueYMAik84NADeQcvbzS8W3WxxJ3C9NzfYkMoChiMAumWbeEvMWhTVpH75NqGv5c9wF3wKDbfQShb';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/44'/0'/0'", xpub);
      assert.strictEqual(result, `pkh([73c5da0a/44'/0'/0']${xpub}/<0;1>/*)`);
    });

    it('generates sh(wpkh) descriptor for BIP49', () => {
      const xpub = 'xpub6Bs2TeWr8hC91BJFNDGFKYomz1pTwjjKJWRVY798YWMjJVrU9dZy1vHvqda1EyqmazUtVpVD6eADnELDfN5jCiTWiJ52tdVvcNXVpa2Z6fx';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/49'/0'/0'", xpub);
      assert.strictEqual(result, `sh(wpkh([73c5da0a/49'/0'/0']${xpub}/<0;1>/*))`);
    });

    it('generates tr descriptor for BIP86', () => {
      const xpub = 'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/86'/0'/0'", xpub);
      assert.strictEqual(result, `tr([73c5da0a/86'/0'/0']${xpub}/<0;1>/*)`);
    });

    it('normalizes zpub to xpub inside descriptor', () => {
      const zpub = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/84'/0'/0'", zpub);
      assert.ok(result.startsWith('wpkh('));
      assert.ok(result.includes('xpub'), 'Descriptor should use xpub encoding, not zpub');
      assert.ok(!result.includes('zpub'), 'Descriptor should not contain zpub');
    });

    it('normalizes ypub to xpub inside descriptor', () => {
      const ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/49'/0'/0'", ypub);
      assert.ok(result.startsWith('sh(wpkh('));
      assert.ok(result.includes('xpub'), 'Descriptor should use xpub encoding, not ypub');
      assert.ok(!result.includes('ypub'), 'Descriptor should not contain ypub');
    });

    it('accepts explicit scriptType to override path detection', () => {
      const xpub = 'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
      const result = WalletDescriptor.getDescriptor('73C5DA0A', "m/0'", xpub, 'p2wpkh');
      assert.ok(result.startsWith('wpkh('));
    });

    it('throws for unknown path without explicit scriptType', () => {
      const xpub = 'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
      assert.throws(() => {
        WalletDescriptor.getDescriptor('73C5DA0A', "m/0'", xpub);
      });
    });

    it('lowercases the fingerprint', () => {
      const xpub = 'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
      const result = WalletDescriptor.getDescriptor('AABBCCDD', "m/84'/0'/0'", xpub);
      assert.ok(result.includes('[aabbccdd/'));
    });
  });

  describe('end-to-end with real wallet instances', () => {
    it('BIP84 (HDSegwitBech32Wallet) produces correct wpkh descriptor', () => {
      const hd = new HDSegwitBech32Wallet();
      hd.setSecret(MNEMONIC);
      const fp = hd.getMasterFingerprintHex();
      const path = hd.getDerivationPath()!;
      const descriptor = WalletDescriptor.getDescriptor(fp, path, hd.getXpub(), hd.segwitType as any);
      assert.ok(descriptor.startsWith('wpkh('), `Expected wpkh descriptor, got: ${descriptor.substring(0, 10)}`);
      assert.ok(descriptor.includes('[73c5da0a/'), 'should contain fingerprint');
      assert.ok(descriptor.includes("84'/0'/0'"), 'should contain derivation path');
      assert.ok(descriptor.includes('xpub'), 'should use xpub encoding inside descriptor');
      assert.ok(!descriptor.includes('zpub'), 'should not contain zpub');
      assert.ok(descriptor.endsWith('/<0;1>/*)'), 'should end with multipath wildcard');
    });

    it('BIP49 (HDSegwitP2SHWallet) produces correct sh(wpkh) descriptor', () => {
      const hd = new HDSegwitP2SHWallet();
      hd.setSecret(MNEMONIC);
      const fp = hd.getMasterFingerprintHex();
      const path = hd.getDerivationPath()!;
      const descriptor = WalletDescriptor.getDescriptor(fp, path, hd.getXpub(), hd.segwitType as any);
      assert.ok(descriptor.startsWith('sh(wpkh('), `Expected sh(wpkh) descriptor, got: ${descriptor.substring(0, 15)}`);
      assert.ok(descriptor.includes('[73c5da0a/'), 'should contain fingerprint');
      assert.ok(descriptor.includes("49'/0'/0'"), 'should contain derivation path');
      assert.ok(descriptor.includes('xpub'), 'should use xpub encoding inside descriptor');
      assert.ok(!descriptor.includes('ypub'), 'should not contain ypub');
      assert.ok(descriptor.endsWith('/<0;1>/*))'), 'should end with multipath wildcard and double close parens');
    });

    it('BIP44 (HDLegacyP2PKHWallet) produces correct pkh descriptor', () => {
      const hd = new HDLegacyP2PKHWallet();
      hd.setSecret(MNEMONIC);
      const fp = hd.getMasterFingerprintHex();
      const path = hd.getDerivationPath()!;
      const descriptor = WalletDescriptor.getDescriptor(fp, path, hd.getXpub());
      assert.ok(descriptor.startsWith('pkh('), `Expected pkh descriptor, got: ${descriptor.substring(0, 10)}`);
      assert.ok(descriptor.includes('[73c5da0a/'), 'should contain fingerprint');
      assert.ok(descriptor.includes("44'/0'/0'"), 'should contain derivation path');
      assert.ok(descriptor.includes('xpub'), 'should use xpub encoding');
      assert.ok(descriptor.endsWith('/<0;1>/*)'), 'should end with multipath wildcard');
    });

    it('BIP86 (HDTaprootWallet) produces correct tr descriptor', () => {
      const hd = new HDTaprootWallet();
      hd.setSecret(MNEMONIC);
      const fp = hd.getMasterFingerprintHex();
      const path = hd.getDerivationPath()!;
      const descriptor = WalletDescriptor.getDescriptor(fp, path, hd.getXpub(), hd.segwitType as any);
      assert.ok(descriptor.startsWith('tr('), `Expected tr descriptor, got: ${descriptor.substring(0, 10)}`);
      assert.ok(descriptor.includes('[73c5da0a/'), 'should contain fingerprint');
      assert.ok(descriptor.includes("86'/0'/0'"), 'should contain derivation path');
      assert.ok(descriptor.includes('xpub'), 'should use xpub encoding');
      assert.ok(descriptor.endsWith('/<0;1>/*)'), 'should end with multipath wildcard');
    });
  });
});
