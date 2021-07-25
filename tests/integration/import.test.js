import React from 'react';
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
  SLIP39SegwitP2SHWallet,
  SLIP39SegwitBech32Wallet,
} from '../../class';
import WalletImport from '../../class/wallet-import';
import Notifications from '../../blue_modules/notifications';
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
    expect(lastImportedWallet.type).toBe(HDSegwitBech32Wallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('bc1qth9qxvwvdthqmkl6x586ukkq8zvumd38nxr08l');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD SegWit (BIP84 Bech32 Native)');
  });

  it('can import BIP84 with passphrase', async () => {
    await WalletImport.processImportText(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      'BlueWallet',
    );
    expect(lastImportedWallet.type).toBe(HDSegwitBech32Wallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('bc1qe8q660wfj6uvqg7zyn86jcsux36natklqnfdrc');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD SegWit (BIP84 Bech32 Native)');
  });

  it('can import Legacy', async () => {
    await WalletImport.processImportText('KztVRmc2EJJBHi599mCdXrxMTsNsGy3NUjc3Fb3FFDSMYyMDRjnv');
    expect(lastImportedWallet.type).toBe(LegacyWallet.type);
    expect(lastImportedWallet.getAddress()).toBe('1AhcdMCzby4VXgqrexuMfh7eiSprRFtN78');
    expect(lastImportedWallet.getLabel()).toBe('Imported Legacy (P2PKH)');
  });

  it('can import Legacy P2SH Segwit', async () => {
    await WalletImport.processImportText('L3NxFnYoBGjJ5PhxrxV6jorvjnc8cerYJx71vXU6ta8BXQxHVZya');
    expect(lastImportedWallet.type).toBe(SegwitP2SHWallet.type);
    expect(lastImportedWallet.getAddress()).toBe('3KM9VfdsDf9uT7uwZagoKgVn8z35m9CtSM');
    expect(lastImportedWallet.getLabel()).toBe('Imported SegWit (P2SH)');
  });

  it('can import Legacy Bech32 Segwit', async () => {
    await WalletImport.processImportText('L1T6FfKpKHi8JE6eBKrsXkenw34d5FfFzJUZ6dLs2utxkSvsDfxZ');
    expect(lastImportedWallet.type).toBe(SegwitBech32Wallet.type);
    expect(lastImportedWallet.getAddress()).toBe('bc1q763rf54hzuncmf8dtlz558uqe4f247mq39rjvr');
    expect(lastImportedWallet.getLabel()).toBe('Imported P2 WPKH');
  });

  it('can import BIP44', async () => {
    await WalletImport.processImportText(
      'sting museum endless duty nice riot because swallow brother depth weapon merge woman wish hold finish venture gauge stomach bomb device bracket agent parent',
    );
    expect(lastImportedWallet.type).toBe(HDLegacyP2PKHWallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('1EgDbwf5nXp9knoaWW6nV6N91EK3EFQ5vC');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD Legacy (BIP44 P2PKH)');
  });

  it('can import BIP49', async () => {
    await WalletImport.processImportText(
      'believe torch sport lizard absurd retreat scale layer song pen clump combine window staff dream filter latin bicycle vapor anchor put clean gain slush',
    );
    expect(lastImportedWallet.type).toBe(HDSegwitP2SHWallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('3EoqYYp7hQSHn5nHqRtWzkgqmK3caQ2SUu');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD SegWit (BIP49 P2SH)');
  });

  it('can import HD Legacy Electrum (BIP32 P2PKH)', async () => {
    await WalletImport.processImportText('eight derive blast guide smoke piece coral burden lottery flower tomato flame');
    expect(lastImportedWallet.type).toBe(HDLegacyElectrumSeedP2PKHWallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('1FgVfJ5D3HyKWKC4xk36Cio7MUaxxnXaVd');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD Legacy Electrum (BIP32 P2PKH)');
  });

  it('can import BreadWallet', async () => {
    await WalletImport.processImportText(
      'tired lesson alert attend giggle fancy nose enter ethics fashion fly dove dutch hidden toe argue save fish catch patient waste gift divorce whisper',
    );
    expect(lastImportedWallet.type).toBe(HDLegacyBreadwalletWallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('1j7TbbTv8adcZFr4RC7Cyr7GN9VGYTecu');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD Legacy Breadwallet (P2PKH)');
  });

  it('can import HD Electrum (BIP32 P2WPKH)', async () => {
    await WalletImport.processImportText('noble mimic pipe merry knife screen enter dune crop bonus slice card');
    expect(lastImportedWallet.type).toBe(HDSegwitElectrumSeedP2WPKHWallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('bc1qzzanxnr3xv9a5ha264kpzpfq260qvuameslddu');
    expect(lastImportedWallet.getLabel()).toBe('Imported HD Electrum (BIP32 P2WPKH)');
  });

  it('can import AEZEED', async () => {
    await WalletImport.processImportText(
      'abstract rhythm weird food attract treat mosquito sight royal actor surround ride strike remove guilt catch filter summer mushroom protect poverty cruel chaos pattern',
    );
    expect(lastImportedWallet.type).toBe(HDAezeedWallet.type);
  });

  it('can import AEZEED with password', async () => {
    await WalletImport.processImportText(
      'able mix price funny host express lawsuit congress antique float pig exchange vapor drip wide cup style apple tumble verb fix blush tongue market',
      'strongPassword',
    );
    expect(lastImportedWallet.type).toBe(HDAezeedWallet.type);
  });

  it('importing empty BIP39 should yield BIP84', async () => {
    const tempWallet = new HDSegwitBech32Wallet();
    await tempWallet.generate();
    await WalletImport.processImportText(tempWallet.getSecret());
    expect(lastImportedWallet.type).toBe(HDSegwitBech32Wallet.type);
  });

  it('can import Legacy with uncompressed pubkey', async () => {
    await WalletImport.processImportText('5KE6tf9vhYkzYSbgEL6M7xvkY69GMFHF3WxzYaCFMvwMxn3QgRS');
    expect(lastImportedWallet.getSecret()).toBe('5KE6tf9vhYkzYSbgEL6M7xvkY69GMFHF3WxzYaCFMvwMxn3QgRS');
    expect(lastImportedWallet.type).toBe(LegacyWallet.type);
    expect(lastImportedWallet.getAddress()).toBe('1GsJDeD6fqS912egpjhdjrUTiCh1hhwBgQ');
    expect(lastImportedWallet.getLabel()).toBe('Imported Legacy (P2PKH)');
  });

  it('can import BIP38 encrypted backup', async () => {
    await WalletImport.processImportText('6PnU5voARjBBykwSddwCdcn6Eu9EcsK24Gs5zWxbJbPZYW7eiYQP8XgKbN', 'qwerty');
    expect(lastImportedWallet.getSecret()).toBe('KxqRtpd9vFju297ACPKHrGkgXuberTveZPXbRDiQ3MXZycSQYtjc');
    expect(lastImportedWallet.type).toBe(LegacyWallet.type);
    expect(lastImportedWallet.getAddress()).toBe('1639W2kM6UY9PdavMQeLqG4SuUEae9NZfq');
    expect(lastImportedWallet.getLabel()).toBe('Imported Legacy (P2PKH)');
  });

  it('can import watch-only address', async () => {
    await WalletImport.processImportText('1AhcdMCzby4VXgqrexuMfh7eiSprRFtN78');
    expect(lastImportedWallet.type).toBe(WatchOnlyWallet.type);
    await WalletImport.processImportText('3EoqYYp7hQSHn5nHqRtWzkgqmK3caQ2SUu');
    expect(lastImportedWallet.type).toBe(WatchOnlyWallet.type);
    await WalletImport.processImportText('bc1q8j4lk4qlhun0n7h5ahfslfldc8zhlxgynfpdj2');
    expect(lastImportedWallet.type).toBe(WatchOnlyWallet.type);
    await WalletImport.processImportText(
      'zpub6r7jhKKm7BAVx3b3nSnuadY1WnshZYkhK8gKFoRLwK9rF3Mzv28BrGcCGA3ugGtawi1WLb2vyjQAX9ZTDGU5gNk2bLdTc3iEXr6tzR1ipNP',
    );
    expect(lastImportedWallet.type).toBe(WatchOnlyWallet.type);
  });

  it('can import slip39 wallet', async () => {
    // 2-of-3 slip39 wallet
    // crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong
    // crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase
    // crystal lungs academic always earth satoshi elbow satoshi that pants formal leaf rival texture romantic filter expand regular soul desert
    await WalletImport.processImportText(
      'crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong\n' +
        'crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase',
    );
    expect(lastImportedWallet.type).toBe(SLIP39SegwitP2SHWallet.type);
  });

  it('can import slip39 wallet with password', async () => {
    // 2-of-3 slip39 wallet
    // crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong
    // crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase
    // crystal lungs academic always earth satoshi elbow satoshi that pants formal leaf rival texture romantic filter expand regular soul desert
    await WalletImport.processImportText(
      'crystal lungs academic acid corner infant satisfy spider alcohol laser golden equation fiscal epidemic infant scholar space findings tadpole belong\n' +
        'crystal lungs academic agency class payment actress avoid rebound ordinary exchange petition tendency mild mobile spine robin fancy shelter increase',
      'BlueWallet',
    );
    expect(lastImportedWallet.type).toBe(SLIP39SegwitBech32Wallet.type);
    expect(lastImportedWallet._getExternalAddressByIndex(0)).toBe('bc1q5k23fle53w8a3982m82e9f6hqlnrh3mv5s9s6z');
  });

  it('can import watch-only Cobo vault export', async () => {
    await WalletImport.processImportText(
      '{"ExtPubKey":"zpub6riZchHnrWzhhZ3Z4dhCJmesGyafMmZBRC9txhnidR313XJbcv4KiDubderKHhL7rMsqacYd82FQ38e4whgs8Dg7CpsxX3dSGWayXsEerF4","MasterFingerprint":"7D2F0272","AccountKeyPath":"84\'\\/0\'\\/0\'","CoboVaultFirmwareVersion":"2.6.1(BTC-Only)"}',
    );
    expect(lastImportedWallet.type).toBe(WatchOnlyWallet.type);
  });
});
