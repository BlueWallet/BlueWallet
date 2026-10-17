import assert from 'assert';

import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import Lnurl from '../../class/lnurl';
import { HDAezeedWallet } from '../../class/wallets/hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from '../../class/wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from '../../class/wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from '../../class/wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from '../../class/wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from '../../class/wallets/hd-segwit-p2sh-wallet';
import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { LegacyWallet } from '../../class/wallets/legacy-wallet';
import { LightningCustodianWallet } from '../../class/wallets/lightning-custodian-wallet';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { SegwitBech32Wallet } from '../../class/wallets/segwit-bech32-wallet';
import { SegwitP2SHWallet } from '../../class/wallets/segwit-p2sh-wallet';
import { SLIP39SegwitBech32Wallet } from '../../class/wallets/slip39-wallets';
import { TaprootWallet } from '../../class/wallets/taproot-wallet';
import { WatchOnlyWallet } from '../../class/wallets/watch-only-wallet';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// computed with @scure/bip32 + @noble/hashes, independently from bip32 package used by the app
const VECTORS = [
  { passphrase: '', domain: 'site.com', key: '0a2ab7357ca824220a4e80eb5201499340a750b098c1a81f376ff2062ffe690e' },
  { passphrase: '', domain: 'stacker.news', key: 'e61a448c3f97732f67b61fabc38ca63d7e1728f1f14fe49b86cbd6c103df5bc4' },
  { passphrase: 'secret', domain: 'site.com', key: '57ce32e3096b6cccc7e88cc997edf908e5478d042df5d271b52875d4c08a75f6' },
  { passphrase: 'secret', domain: 'stacker.news', key: '907ad0cd86e3a9e941ca8b452bb67756f9a3b248fd7ce4a42930f878fa7c449c' },
];

describe('LNURL-auth linking keys', () => {
  it('derives the same LUD-05 key for one seed in every BIP39 HD wallet type', () => {
    for (const Wallet of [HDSegwitBech32Wallet, HDSegwitP2SHWallet, HDLegacyP2PKHWallet, HDTaprootWallet, HDLegacyBreadwalletWallet]) {
      for (const { passphrase, domain, key } of VECTORS) {
        const w = new Wallet();
        w.setSecret(MNEMONIC);
        if (passphrase) w.setPassphrase(passphrase);
        assert.ok(w.allowLnurlAuth(), Wallet.type);
        assert.strictEqual(uint8ArrayToHex(w.getLnurlAuthLinkingKey(domain)), key, `${Wallet.type} ${domain} '${passphrase}'`);
      }
    }
  });

  it('uses own BIP32 root for non-BIP39 seed formats', async () => {
    const electrumSegwit = new HDSegwitElectrumSeedP2WPKHWallet();
    electrumSegwit.setSecret('method goddess  humble  crumble output snake essay carpet monster barely trip betray ');

    const electrumLegacy = new HDLegacyElectrumSeedP2PKHWallet();
    electrumLegacy.setSecret('receive happy  wash prosper update    pet neck acid try profit proud hungry  ');

    const aezeed = new HDAezeedWallet();
    aezeed.setSecret(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
    );
    aezeed.setPassphrase('strongPassword');
    assert.ok(await aezeed.validateMnemonicAsync());

    const slip39 = new SLIP39SegwitBech32Wallet();
    slip39.setSecret(
      'shadow pistol academic always adequate wildlife fancy gross oasis cylinder mustang wrist rescue view short owner flip making coding armed\n' +
        'shadow pistol academic acid actress prayer class unknown daughter sweater depict flip twice unkind craft early superior advocate guest smoking',
    );

    for (const w of [electrumSegwit, electrumLegacy, aezeed, slip39]) {
      assert.ok(w.allowLnurlAuth(), w.type);
      // root that produces wallet's own xpub is the right one to derive linking key from
      const root = w._getBip32Root();
      const path = w.getDerivationPath()!;
      const xpub = (path === 'm' ? root : root.derivePath(path)).neutered().toBase58();
      assert.strictEqual(xpub, w._zpubToXpub(w.getXpub()), w.type);
      assert.strictEqual(
        uint8ArrayToHex(w.getLnurlAuthLinkingKey('site.com')),
        uint8ArrayToHex(Lnurl.lud05LinkingKey(w._getBip32Root(), 'site.com')),
      );
    }

    // electrum seed is not a valid BIP39 mnemonic, so treating it as one would give another identity
    const asBip39 = new HDSegwitBech32Wallet();
    asBip39.setSecret(electrumSegwit.getSecret());
    assert.notStrictEqual(
      uint8ArrayToHex(asBip39.getLnurlAuthLinkingKey('site.com')),
      uint8ArrayToHex(electrumSegwit.getLnurlAuthLinkingKey('site.com')),
    );
  });

  it('keeps legacy linking key for lightning custodian wallets', () => {
    const w = new LightningCustodianWallet();
    w.setSecret('lndhub://dc56b8cf8ef3b60060cf:94eac57510de2738451d');
    assert.ok(w.allowLnurlAuth());
    assert.strictEqual(
      uint8ArrayToHex(w.getLnurlAuthLinkingKey('lightninglogin.live')),
      uint8ArrayToHex(Lnurl.legacyLinkingKey('lndhub://dc56b8cf8ef3b60060cf:94eac57510de2738451d', 'lightninglogin.live')),
    );
  });

  it('does not allow wallets without a single BIP32 seed', () => {
    const multisig = new MultisigHDWallet();
    multisig.addCosigner(MNEMONIC);
    assert.ok(!multisig.allowLnurlAuth());

    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret('zpub6n6X5F7QEogTDXchPXXhrvDQ38D5JTFNFWhFrFyri3Sazo4x225nENMeN1kKs1cYbeZDtuDUXhDQepUkxjnAi67z2PJ4d33qo8Cu3HLw74c');
    assert.ok(!watchOnly.allowLnurlAuth());

    assert.ok(!new HDSegwitBech32Wallet().allowLnurlAuth());

    for (const Wallet of [LegacyWallet, SegwitP2SHWallet, SegwitBech32Wallet, TaprootWallet]) {
      const w = new Wallet();
      w.setSecret('L4rK1yDtCWekvXuE6oXD9jCYfFNV2cWRpVuPLBcCU2z8TrisoyY1');
      assert.ok(!w.allowLnurlAuth(), Wallet.type);
      assert.throws(() => w.getLnurlAuthLinkingKey('site.com'));
    }
  });
});
