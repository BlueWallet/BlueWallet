import assert from 'assert';

import { WalletDescriptor } from '../../class/wallet-descriptor';
import { HDAezeedWallet } from '../../class/wallets/hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from '../../class/wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from '../../class/wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from '../../class/wallets/hd-segwit-p2sh-wallet';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// account xpubs of MNEMONIC (BIP44/84/86 test vectors)
const XPUB_44 = 'xpub6BosfCnifzxcFwrSzQiqu2DBVTshkCXacvNsWGYJVVhhawA7d4R5WSWGFNbi8Aw6ZRc1brxMyWMzG3DSSSSoekkudhUd9yLb6qx39T9nMdj';
const XPUB_49 = 'xpub6C6nQwHaWbSrzs5tZ1q7m5R9cPK9eYpNMFesiXsYrgc1P8bvLLAet9JfHjYXKjToD8cBRswJXXbbFpXgwsswVPAZzKMa1jUp2kVkGVUaJa7';
const XPUB_84 = 'xpub6CatWdiZiodmUeTDp8LT5or8nmbKNcuyvz7WyksVFkKB4RHwCD3XyuvPEbvqAQY3rAPshWcMLoP2fMFMKHPJ4ZeZXYVUhLv1VMrjPC7PW6V';
const ZPUB_84 = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
const XPUB_86 = 'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ';

describe('WalletDescriptor', () => {
  describe('normalizeToXpub', () => {
    it('re-encodes zpub and ypub as xpub', () => {
      assert.strictEqual(WalletDescriptor.normalizeToXpub(ZPUB_84), XPUB_84);
      const ypub = 'ypub6WhHmKBmHNjcrUVNCa3sXduH9yxutMipDcwiKW31vWjcMbfhQHjXdyx4rqXbEtVgzdbhFJ5mZJWmfWwnP4Vjzx97admTUYKQt6b9D7jjSCp';
      const xpub = 'xpub6Bs2TeWr8hC91BJFNDGFKYomz1pTwjjKJWRVY798YWMjJVrU9dZy1vHvqda1EyqmazUtVpVD6eADnELDfN5jCiTWiJ52tdVvcNXVpa2Z6fx';
      assert.strictEqual(WalletDescriptor.normalizeToXpub(ypub), xpub);
    });

    it('leaves xpub and testnet keys untouched', () => {
      assert.strictEqual(WalletDescriptor.normalizeToXpub(XPUB_84), XPUB_84);
      const tpub = 'tpubDC5FSnBiZDMmhiuCmWAYsLwgLYrrT9rAqvTySfuCCrgsWz8wxMXUS9Tb9iVMvcRbvFcAHGkMD5Kx8koh4GquNGNTfohfk7pgjhaPCdXpoba';
      assert.strictEqual(WalletDescriptor.normalizeToXpub(tpub), tpub);
      const vpub = 'vpub5Y6cjg78GGuNLsaPhmYsiw4gYX3HoQiRBiSwDaBXKUafCt9bNwWQiitDk5VZ5BVxYnQdwoTyXSs2JHRPAgjAvtbBrf8ZhDYe2jWAqvZVnsc';
      assert.strictEqual(WalletDescriptor.normalizeToXpub(vpub), vpub);
    });
  });

  describe('getDescriptor', () => {
    it('wraps the key origin and xpub per script type', () => {
      assert.strictEqual(
        WalletDescriptor.getDescriptor('73C5DA0A', "m/44'/0'/0'", XPUB_44, 'p2pkh'),
        `pkh([73c5da0a/44'/0'/0']${XPUB_44})`,
      );
      assert.strictEqual(
        WalletDescriptor.getDescriptor('73C5DA0A', "m/49'/0'/0'", XPUB_49, 'p2sh(p2wpkh)'),
        `sh(wpkh([73c5da0a/49'/0'/0']${XPUB_49}))`,
      );
      assert.strictEqual(
        WalletDescriptor.getDescriptor('73C5DA0A', "m/84'/0'/0'", ZPUB_84, 'p2wpkh'),
        `wpkh([73c5da0a/84'/0'/0']${XPUB_84})`,
      );
      assert.strictEqual(WalletDescriptor.getDescriptor('73C5DA0A', "m/86'/0'/0'", XPUB_86, 'p2tr'), `tr([73c5da0a/86'/0'/0']${XPUB_86})`);
    });
  });

  describe('fromWallet', () => {
    const cases = [
      { Wallet: HDLegacyP2PKHWallet, descriptor: `pkh([73c5da0a/44'/0'/0']${XPUB_44})`, address: '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA' },
      { Wallet: HDSegwitP2SHWallet, descriptor: `sh(wpkh([73c5da0a/49'/0'/0']${XPUB_49}))`, address: '37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf' },
      {
        Wallet: HDSegwitBech32Wallet,
        descriptor: `wpkh([73c5da0a/84'/0'/0']${XPUB_84})`,
        address: 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
      },
      {
        Wallet: HDTaprootWallet,
        descriptor: `tr([73c5da0a/86'/0'/0']${XPUB_86})`,
        address: 'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
      },
    ];

    for (const { Wallet, descriptor, address } of cases) {
      it(`${Wallet.type}: descriptor imports as a watch-only wallet with the same addresses`, () => {
        const hd = new Wallet();
        hd.setSecret(MNEMONIC);
        assert.strictEqual(WalletDescriptor.fromWallet(hd), descriptor);

        const watchOnly = new WatchOnlyWallet();
        watchOnly.setSecret(descriptor);
        watchOnly.init();
        assert.strictEqual(watchOnly.getMasterFingerprintHex(), '73c5da0a');
        assert.strictEqual(hd._getExternalAddressByIndex(0), address);
        for (let i = 0; i < 3; i++) {
          assert.strictEqual(watchOnly._getExternalAddressByIndex(i), hd._getExternalAddressByIndex(i));
          assert.strictEqual(watchOnly._getInternalAddressByIndex(i), hd._getInternalAddressByIndex(i));
        }
      });
    }

    it('uses the wallet script type, not the path, for legacy wallets on a segwit path', () => {
      const hd = new HDLegacyP2PKHWallet();
      hd.setSecret(MNEMONIC);
      hd.setDerivationPath("m/84'/0'/0'"); // electrum scan list has p2pkh at m/84'
      assert.strictEqual(WalletDescriptor.fromWallet(hd), `pkh([73c5da0a/84'/0'/0']${XPUB_84})`);
    });

    it('describes Breadwallet as p2pkh at m/0h', () => {
      const hd = new HDLegacyBreadwalletWallet();
      hd.setSecret(MNEMONIC);
      assert.strictEqual(
        WalletDescriptor.fromWallet(hd),
        "pkh([73c5da0a/0']xpub68jrRzQopSUQm76hJ6TNtiJMJfhj38u1X12xCzExrw388hcN443UVnYpswdUkV7vPJ3KayiCdp3Q5E23s4wvkucohVTh7eSstJdBFyn2DMx)",
      );
    });

    it('returns undefined for wallets whose master fingerprint is not BIP39-derived', () => {
      for (const Wallet of [HDAezeedWallet, HDSegwitElectrumSeedP2WPKHWallet, HDLegacyElectrumSeedP2PKHWallet]) {
        assert.strictEqual(WalletDescriptor.fromWallet(new Wallet()), undefined, Wallet.type);
      }
    });

    it('returns undefined for wallets without an xpub to show', () => {
      const multisig = new MultisigHDWallet();
      multisig.addCosigner(XPUB_84, '73c5da0a', "m/48'/0'/0'/2'");
      multisig.setDerivationPath("m/48'/0'/0'/2'");
      assert.strictEqual(WalletDescriptor.fromWallet(multisig), undefined);

      const watchOnly = new WatchOnlyWallet();
      watchOnly.setSecret(ZPUB_84);
      watchOnly.init();
      assert.strictEqual(WalletDescriptor.fromWallet(watchOnly), undefined);
    });
  });
});
