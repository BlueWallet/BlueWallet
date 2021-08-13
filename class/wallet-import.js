/* global alert */
import {
  SegwitP2SHWallet,
  LegacyWallet,
  WatchOnlyWallet,
  HDLegacyBreadwalletWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
  LightningCustodianWallet,
  SegwitBech32Wallet,
  HDLegacyElectrumSeedP2PKHWallet,
  HDSegwitElectrumSeedP2WPKHWallet,
  HDAezeedWallet,
  MultisigHDWallet,
  SLIP39LegacyP2PKHWallet,
  PlaceholderWallet,
  SLIP39SegwitP2SHWallet,
  SLIP39SegwitBech32Wallet,
} from '.';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import loc from '../loc';
import { useContext } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';
import Notifications from '../blue_modules/notifications';
import IdleTimerManager from 'react-native-idle-timer';
const A = require('../blue_modules/analytics');
const bip38 = require('../blue_modules/bip38');
const wif = require('wif');
const prompt = require('../blue_modules/prompt');

function WalletImport() {
  const { wallets, saveToDisk, addWallet, setIsImportingWallet } = useContext(BlueStorageContext);

  /**
   *
   * @param w {AbstractWallet}
   * @returns {Promise<void>}
   * @private
   */
  WalletImport._saveWallet = async w => {
    IdleTimerManager.setIdleTimerDisabled(false);
    if (WalletImport.isWalletImported(w)) {
      WalletImport.presentWalletAlreadyExistsAlert();
      return;
    }
    const emptyWalletLabel = new LegacyWallet().getLabel();
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
    w.setUserHasSavedExport(true);
    addWallet(w);
    await saveToDisk();
    A(A.ENUM.CREATED_WALLET);
    alert(loc.wallets.import_success);
    Notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
  };

  WalletImport.isWalletImported = w => {
    const wallet = wallets.some(wallet => wallet.getSecret() === w.secret || wallet.getID() === w.getID());
    return !!wallet;
  };

  WalletImport.removePlaceholderWallet = () => {
    setIsImportingWallet(false);
  };

  WalletImport.addPlaceholderWallet = (importText, isFailure = false) => {
    const placeholderWallet = new PlaceholderWallet();
    placeholderWallet.setSecret(importText);
    placeholderWallet.setIsFailure(isFailure);
    setIsImportingWallet(placeholderWallet);
  };

  WalletImport.presentWalletAlreadyExistsAlert = () => {
    ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    alert('This wallet has been previously imported.');
  };

  /**
   *
   * @param importText
   * @returns {Promise<void>}
   * @returns {Promise<{text: string, password: string|void}>}
   */
  WalletImport.askPasswordIfNeeded = async importText => {
    const text = importText.trim();
    let password;

    // BIP38 password required
    if (text.startsWith('6P')) {
      do {
        password = await prompt(loc.wallets.looks_like_bip38, loc.wallets.enter_bip38_password);
      } while (!password);
      return { text, password };
    }

    // HD BIP39 wallet password is optinal
    const hd = new HDSegwitBech32Wallet();
    hd.setSecret(text);
    if (hd.validateMnemonic()) {
      password = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
      return { text, password };
    }

    // AEZEED password needs to be correct
    const aezeed = new HDAezeedWallet();
    aezeed.setSecret(text);
    if (await aezeed.mnemonicInvalidPassword()) {
      do {
        password = await prompt('', loc.wallets.enter_bip38_password);
        aezeed.setPassphrase(password);
      } while (await aezeed.mnemonicInvalidPassword());
      return { text, password };
    }

    // SLIP39 wallet password is optinal
    if (text.includes('\n')) {
      const s1 = new SLIP39SegwitP2SHWallet();
      s1.setSecret(text);

      if (s1.validateMnemonic()) {
        password = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
        return { text, password };
      }
    }

    // ELECTRUM segwit wallet password is optinal
    const electrum1 = new HDSegwitElectrumSeedP2WPKHWallet();
    electrum1.setSecret(importText);
    if (electrum1.validateMnemonic()) {
      password = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
      return { text, password };
    }

    // ELECTRUM legacy wallet password is optinal
    const electrum2 = new HDLegacyElectrumSeedP2PKHWallet();
    electrum2.setSecret(importText);
    if (electrum2.validateMnemonic()) {
      password = await prompt(loc.wallets.import_passphrase_title, loc.wallets.import_passphrase_message);
      return { text, password };
    }

    return { text, password };
  };

  /**
   *
   * @param importText
   * @param password
   * @returns {Promise<void>}
   */
  WalletImport.processImportText = async (importText, password) => {
    IdleTimerManager.setIdleTimerDisabled(true);
    // Plan:
    // -2. check if BIP38 encrypted
    // -1a. check if multisig
    // -1. check lightning custodian
    // 0. check if its HDSegwitBech32Wallet (BIP84)
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 3.1 check HD Electrum legacy
    // 3.2 check if its AEZEED
    // 3.3 check if its SLIP39
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO

    importText = importText.trim();

    if (importText.startsWith('6P')) {
      const decryptedKey = await bip38.decrypt(importText, password);

      if (decryptedKey) {
        importText = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);
      }
    }

    // is it multisig?
    try {
      const ms = new MultisigHDWallet();
      ms.setSecret(importText);
      if (ms.getN() > 0 && ms.getM() > 0) {
        await ms.fetchBalance();
        return WalletImport._saveWallet(ms);
      }
    } catch (e) {
      console.log(e);
    }

    // is it lightning custodian?
    if (importText.indexOf('blitzhub://') !== -1 || importText.indexOf('lndhub://') !== -1) {
      const lnd = new LightningCustodianWallet();
      if (importText.includes('@')) {
        const split = importText.split('@');
        lnd.setBaseURI(split[1]);
        lnd.setSecret(split[0]);
      }
      lnd.init();
      await lnd.authorize();
      await lnd.fetchTransactions();
      await lnd.fetchUserInvoices();
      await lnd.fetchPendingTransactions();
      await lnd.fetchBalance();
      return WalletImport._saveWallet(lnd);
    }

    // trying other wallet types
    const hd4 = new HDSegwitBech32Wallet();
    hd4.setSecret(importText);
    if (hd4.validateMnemonic()) {
      hd4.setPassphrase(password);
      if (await hd4.wasEverUsed()) {
        await hd4.fetchBalance(); // fetching balance for BIP84 only on purpose
        return WalletImport._saveWallet(hd4);
      }

      const hd2 = new HDSegwitP2SHWallet();
      hd2.setSecret(importText);
      hd2.setPassphrase(password);
      if (await hd2.wasEverUsed()) {
        return WalletImport._saveWallet(hd2);
      }

      const hd3 = new HDLegacyP2PKHWallet();
      hd3.setSecret(importText);
      hd3.setPassphrase(password);
      if (await hd3.wasEverUsed()) {
        return WalletImport._saveWallet(hd3);
      }

      const hd1 = new HDLegacyBreadwalletWallet();
      hd1.setSecret(importText);
      hd1.setPassphrase(password);
      if (await hd1.wasEverUsed()) {
        return WalletImport._saveWallet(hd1);
      }

      // no scheme (BIP84/BIP49/BIP44/Bread) was ever used. lets import as default BIP84:
      return WalletImport._saveWallet(hd4);
    }

    const segwitWallet = new SegwitP2SHWallet();
    segwitWallet.setSecret(importText);
    if (segwitWallet.getAddress()) {
      // ok its a valid WIF

      const segwitBech32Wallet = new SegwitBech32Wallet();
      segwitBech32Wallet.setSecret(importText);
      if (await segwitBech32Wallet.wasEverUsed()) {
        // yep, its single-address bech32 wallet
        await segwitBech32Wallet.fetchBalance();
        return WalletImport._saveWallet(segwitBech32Wallet);
      }

      if (await segwitWallet.wasEverUsed()) {
        // yep, its single-address bech32 wallet
        await segwitWallet.fetchBalance();
        return WalletImport._saveWallet(segwitWallet);
      }

      // default wallet is Legacy
      const legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(importText);
      return WalletImport._saveWallet(legacyWallet);
    }

    // case - WIF is valid, just has uncompressed pubkey

    const legacyWallet = new LegacyWallet();
    legacyWallet.setSecret(importText);
    if (legacyWallet.getAddress()) {
      await legacyWallet.fetchBalance();
      await legacyWallet.fetchTransactions();
      return WalletImport._saveWallet(legacyWallet);
    }

    // if we're here - nope, its not a valid WIF

    // maybe its a watch-only address?
    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret(importText);
    if (watchOnly.valid()) {
      await watchOnly.fetchBalance();
      return WalletImport._saveWallet(watchOnly);
    }
    // nope, not watch-only

    try {
      const hdElectrum = new HDSegwitElectrumSeedP2WPKHWallet();
      hdElectrum.setSecret(importText);
      hdElectrum.setPassphrase(password);
      if (hdElectrum.validateMnemonic()) {
        // not fetching txs or balances, fuck it, yolo, life is too short
        return WalletImport._saveWallet(hdElectrum);
      }
    } catch (_) {}

    try {
      const hdElectrum = new HDLegacyElectrumSeedP2PKHWallet();
      hdElectrum.setSecret(importText);
      hdElectrum.setPassphrase(password);
      if (hdElectrum.validateMnemonic()) {
        // not fetching txs or balances, fuck it, yolo, life is too short
        return WalletImport._saveWallet(hdElectrum);
      }
    } catch (_) {}

    // is it AEZEED?
    try {
      const aezeed = new HDAezeedWallet();
      aezeed.setSecret(importText);
      aezeed.setPassphrase(password);
      if (await aezeed.validateMnemonicAsync()) {
        // not fetching txs or balances, fuck it, yolo, life is too short
        return WalletImport._saveWallet(aezeed);
      }
    } catch (_) {}

    // if it is multi-line string, then it is probably SLIP39 wallet
    // each line - one share
    if (importText.includes('\n')) {
      const s1 = new SLIP39SegwitP2SHWallet();
      s1.setSecret(importText);

      if (s1.validateMnemonic()) {
        s1.setPassphrase(password);
        if (await s1.wasEverUsed()) {
          return WalletImport._saveWallet(s1);
        }

        const s2 = new SLIP39LegacyP2PKHWallet();
        s2.setPassphrase(password);
        s2.setSecret(importText);
        if (await s2.wasEverUsed()) {
          return WalletImport._saveWallet(s2);
        }

        const s3 = new SLIP39SegwitBech32Wallet();
        s3.setSecret(importText);
        s3.setPassphrase(password);
        return WalletImport._saveWallet(s3);
      }
    }

    // nope?

    // TODO: try a raw private key
    IdleTimerManager.setIdleTimerDisabled(false);
    throw new Error('Could not recognize format');
  };
  IdleTimerManager.setIdleTimerDisabled(false);
  return null;
}

export default WalletImport;
