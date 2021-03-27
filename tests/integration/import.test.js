import {
  HDSegwitElectrumSeedP2WPKHWallet,
  HDLegacyBreadwalletWallet,
  HDSegwitBech32Wallet,
  HDLegacyElectrumSeedP2PKHWallet,
  LegacyWallet,
  SegwitP2SHWallet,
  SegwitBech32Wallet,
  HDLegacyP2PKHWallet,
  HDSegwitP2SHWallet,
  WatchOnlyWallet,
  HDAezeedWallet,
} from '../../class';
import WalletImport from '../../class/wallet-import';
import React from 'react';
import Notifications from '../../blue_modules/notifications';
const assert = require('assert');
global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
const BlueElectrum = require('../../blue_modules/BlueElectrum'); // so it connects ASAP

/** @type HDSegwitBech32Wallet */
let lastImportedWallet;

React.useContext = jest.fn(() => {
  return {
    wallets: [],
    pendingWallets: [],
    setPendingWallets: function () {},
    saveToDisk: function () {},
    addWallet: function (wallet) {
      lastImportedWallet = wallet;
    },
  };
});

jest.mock('../../blue_modules/notifications', () => {
  return {
    majorTomToGroundControl: jest.fn(),
  };
});

jest.mock('../../blue_modules/prompt', () => {
  return jest.fn(() => {
    return 'qwerty';
  });
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.waitTillConnected();
  WalletImport(); // damn i love javascript
  Notifications(); // damn i love javascript
});

describe('import procedure', function () {
  it('can import BIP84', async () => {
    await WalletImport.processImportText(
      'always direct find escape liar turn differ shy tool gap elder galaxy lawn wild movie fog moon spread casual inner box diagram outdoor tell',
    );
    assert.strictEqual(lastImportedWallet.type, HDSegwitBech32Wallet.type);
    assert.strictEqual(lastImportedWallet._getExternalAddressByIndex(0), 'bc1qth9qxvwvdthqmkl6x586ukkq8zvumd38nxr08l');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported HD SegWit (BIP84 Bech32 Native)');
  });

  it('can import Legacy', async () => {
    await WalletImport.processImportText('KztVRmc2EJJBHi599mCdXrxMTsNsGy3NUjc3Fb3FFDSMYyMDRjnv');
    assert.strictEqual(lastImportedWallet.type, LegacyWallet.type);
    assert.strictEqual(lastImportedWallet.getAddress(), '1AhcdMCzby4VXgqrexuMfh7eiSprRFtN78');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported Legacy (P2PKH)');
  });

  it('can import Legacy P2SH Segwit', async () => {
    await WalletImport.processImportText('L3NxFnYoBGjJ5PhxrxV6jorvjnc8cerYJx71vXU6ta8BXQxHVZya');
    assert.strictEqual(lastImportedWallet.type, SegwitP2SHWallet.type);
    assert.strictEqual(lastImportedWallet.getAddress(), '3KM9VfdsDf9uT7uwZagoKgVn8z35m9CtSM');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported SegWit (P2SH)');
  });

  it('can import Legacy Bech32 Segwit', async () => {
    await WalletImport.processImportText('L1T6FfKpKHi8JE6eBKrsXkenw34d5FfFzJUZ6dLs2utxkSvsDfxZ');
    assert.strictEqual(lastImportedWallet.type, SegwitBech32Wallet.type);
    assert.strictEqual(lastImportedWallet.getAddress(), 'bc1q763rf54hzuncmf8dtlz558uqe4f247mq39rjvr');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported P2 WPKH');
  });

  it('can import BIP44', async () => {
    await WalletImport.processImportText(
      'sting museum endless duty nice riot because swallow brother depth weapon merge woman wish hold finish venture gauge stomach bomb device bracket agent parent',
    );
    assert.strictEqual(lastImportedWallet.type, HDLegacyP2PKHWallet.type);
    assert.strictEqual(lastImportedWallet._getExternalAddressByIndex(0), '1EgDbwf5nXp9knoaWW6nV6N91EK3EFQ5vC');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported HD Legacy (BIP44 P2PKH)');
  });

  it('can import BIP49', async () => {
    await WalletImport.processImportText(
      'believe torch sport lizard absurd retreat scale layer song pen clump combine window staff dream filter latin bicycle vapor anchor put clean gain slush',
    );
    assert.strictEqual(lastImportedWallet.type, HDSegwitP2SHWallet.type);
    assert.strictEqual(lastImportedWallet._getExternalAddressByIndex(0), '3EoqYYp7hQSHn5nHqRtWzkgqmK3caQ2SUu');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported HD SegWit (BIP49 P2SH)');
  });

  it('can import HD Legacy Electrum (BIP32 P2PKH)', async () => {
    await WalletImport.processImportText('eight derive blast guide smoke piece coral burden lottery flower tomato flame');
    assert.strictEqual(lastImportedWallet.type, HDLegacyElectrumSeedP2PKHWallet.type);
    assert.strictEqual(lastImportedWallet._getExternalAddressByIndex(0), '1FgVfJ5D3HyKWKC4xk36Cio7MUaxxnXaVd');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported HD Legacy Electrum (BIP32 P2PKH)');
  });

  it('can import BreadWallet', async () => {
    await WalletImport.processImportText(
      'tired lesson alert attend giggle fancy nose enter ethics fashion fly dove dutch hidden toe argue save fish catch patient waste gift divorce whisper',
    );
    assert.strictEqual(lastImportedWallet.type, HDLegacyBreadwalletWallet.type);
    assert.strictEqual(lastImportedWallet._getExternalAddressByIndex(0), '1j7TbbTv8adcZFr4RC7Cyr7GN9VGYTecu');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported HD Legacy Breadwallet (P2PKH)');
  });

  it('can import HD Electrum (BIP32 P2WPKH)', async () => {
    await WalletImport.processImportText('noble mimic pipe merry knife screen enter dune crop bonus slice card');
    assert.strictEqual(lastImportedWallet.type, HDSegwitElectrumSeedP2WPKHWallet.type);
    assert.strictEqual(lastImportedWallet._getExternalAddressByIndex(0), 'bc1qzzanxnr3xv9a5ha264kpzpfq260qvuameslddu');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported HD Electrum (BIP32 P2WPKH)');
  });

  it('can import AEZEED', async () => {
    await WalletImport.processImportText(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    assert.strictEqual(lastImportedWallet.type, HDAezeedWallet.type);
  });

  it('importing empty BIP39 should yield BIP84', async () => {
    const tempWallet = new HDSegwitBech32Wallet();
    await tempWallet.generate();
    await WalletImport.processImportText(tempWallet.getSecret());
    assert.strictEqual(lastImportedWallet.type, HDSegwitBech32Wallet.type);
  });

  it('can import Legacy with uncompressed pubkey', async () => {
    await WalletImport.processImportText('5KE6tf9vhYkzYSbgEL6M7xvkY69GMFHF3WxzYaCFMvwMxn3QgRS');
    assert.strictEqual(lastImportedWallet.getSecret(), '5KE6tf9vhYkzYSbgEL6M7xvkY69GMFHF3WxzYaCFMvwMxn3QgRS');
    assert.strictEqual(lastImportedWallet.type, LegacyWallet.type);
    assert.strictEqual(lastImportedWallet.getAddress(), '1GsJDeD6fqS912egpjhdjrUTiCh1hhwBgQ');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported Legacy (P2PKH)');
  });

  it('can import BIP38 encrypted backup', async () => {
    await WalletImport.processImportText('6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN');
    assert.strictEqual(lastImportedWallet.getSecret(), 'KxqRtpd9vFju297ACPKHrGkgXuberTveZPXbRDiQ3MXZycSQYtjc');
    assert.strictEqual(lastImportedWallet.type, LegacyWallet.type);
    assert.strictEqual(lastImportedWallet.getAddress(), '1639W2kM6UY9PdavMQeLqG4SuUEae9NZfq');
    assert.strictEqual(lastImportedWallet.getLabel(), 'Imported Legacy (P2PKH)');
  });

  it('can import watch-only address', async () => {
    await WalletImport.processImportText('1AhcdMCzby4VXgqrexuMfh7eiSprRFtN78');
    assert.strictEqual(lastImportedWallet.type, WatchOnlyWallet.type);
    await WalletImport.processImportText('3EoqYYp7hQSHn5nHqRtWzkgqmK3caQ2SUu');
    assert.strictEqual(lastImportedWallet.type, WatchOnlyWallet.type);
    await WalletImport.processImportText('bc1q8j4lk4qlhun0n7h5ahfslfldc8zhlxgynfpdj2');
    assert.strictEqual(lastImportedWallet.type, WatchOnlyWallet.type);
    await WalletImport.processImportText(
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
    );
    assert.strictEqual(lastImportedWallet.type, WatchOnlyWallet.type);
  });
});
