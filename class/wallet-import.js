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
  PlaceholderWallet,
  SegwitBech32Wallet,
  HDLegacyElectrumSeedP2PKHWallet,
  HDSegwitElectrumSeedP2WPKHWallet,
  HDAezeedWallet,
  MultisigHDWallet,
} from '.';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import loc from '../loc';
import { useContext } from 'react';
import { BlueStorageContext } from '../blue_modules/storage-context';
import Notifications from '../blue_modules/notifications';
const A = require('../blue_modules/analytics');
const bip38 = require('../blue_modules/bip38');
const wif = require('wif');
const prompt = require('../blue_modules/prompt');

function WalletImport() {
  const { wallets, pendingWallets, setPendingWallets, saveToDisk, addWallet, setNewWalletAdded } = useContext(BlueStorageContext);

  /**
   *
   * @param w {AbstractWallet}
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   * @returns {Promise<void>}
   * @private
   */
  WalletImport._saveWallet = async (w, additionalProperties) => {
    if (WalletImport.isWalletImported(w)) {
      WalletImport.presentWalletAlreadyExistsAlert();
      return;
    }
    const emptyWalletLabel = new LegacyWallet().getLabel();
    ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
    if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
    w.setUserHasSavedExport(true);
    if (additionalProperties) {
      for (const [key, value] of Object.entries(additionalProperties)) {
        w[key] = value;
      }
    }
    addWallet(w);
    await saveToDisk();
    setNewWalletAdded(true);
    A(A.ENUM.CREATED_WALLET);
    alert(loc.wallets.import_success);
    Notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
  };

  WalletImport.removePlaceholderWallet = () => {
    setPendingWallets([]);
  };

  WalletImport.isWalletImported = w => {
    const wallet = wallets.some(
      wallet => (wallet.getSecret() === w.secret || wallet.getID() === w.getID()) && wallet.type !== PlaceholderWallet.type,
    );
    return !!wallet;
  };

  WalletImport.presentWalletAlreadyExistsAlert = () => {
    ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    alert('This wallet has been previously imported.');
  };

  WalletImport.addPlaceholderWallet = (importText, isFailure = false) => {
    const wallet = new PlaceholderWallet();
    wallet.setSecret(importText);
    wallet.setIsFailure(isFailure);
    setPendingWallets([...pendingWallets, wallet]);
    return wallet;
  };

  WalletImport.isCurrentlyImportingWallet = () => {
    return wallets.some(wallet => wallet.type === PlaceholderWallet.type);
  };

  /**
   *
   * @param importText
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   * @returns {Promise<void>}
   */
  WalletImport.processImportText = async (importText, additionalProperties) => {
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
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO

    if (importText.startsWith('6P')) {
      let password = false;
      do {
        password = await prompt(loc.wallets.looks_like_bip38, loc.wallets.enter_bip38_password, false);
      } while (!password);

      const decryptedKey = await bip38.decrypt(importText, password, status => {
        console.warn(status.percent + '%');
      });

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
      } else {
        lnd.setBaseURI(LightningCustodianWallet.defaultBaseUri);
        lnd.setSecret(importText);
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
      await hd4.fetchBalance();
      if (hd4.getBalance() > 0) {
        // await hd4.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
        return WalletImport._saveWallet(hd4);
      }
    }

    const segwitWallet = new SegwitP2SHWallet();
    segwitWallet.setSecret(importText);
    if (segwitWallet.getAddress()) {
      // ok its a valid WIF

      const legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(importText);

      const segwitBech32Wallet = new SegwitBech32Wallet();
      segwitBech32Wallet.setSecret(importText);

      await legacyWallet.fetchBalance();
      await segwitBech32Wallet.fetchBalance();
      if (legacyWallet.getBalance() > 0) {
        // yep, its legacy we're importing
        await legacyWallet.fetchTransactions();
        return WalletImport._saveWallet(legacyWallet);
      } else if (segwitBech32Wallet.getBalance() > 0) {
        // yep, its single-address bech32 wallet
        await segwitBech32Wallet.fetchTransactions();
        return WalletImport._saveWallet(segwitBech32Wallet);
      } else {
        // by default, we import wif as Segwit P2SH
        await segwitWallet.fetchBalance();
        await segwitWallet.fetchTransactions();
        return WalletImport._saveWallet(segwitWallet);
      }
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

    const hd1 = new HDLegacyBreadwalletWallet();
    hd1.setSecret(importText);
    if (hd1.validateMnemonic()) {
      await hd1.fetchBalance();
      if (hd1.getBalance() > 0) {
        // await hd1.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
        return WalletImport._saveWallet(hd1);
      }
    }

    try {
      const hdElectrumSeedLegacy = new HDSegwitElectrumSeedP2WPKHWallet();
      hdElectrumSeedLegacy.setSecret(importText);
      if (await hdElectrumSeedLegacy.wasEverUsed()) {
        // not fetching txs or balances, fuck it, yolo, life is too short
        return WalletImport._saveWallet(hdElectrumSeedLegacy);
      }
    } catch (_) {}

    try {
      const hdElectrumSeedLegacy = new HDLegacyElectrumSeedP2PKHWallet();
      hdElectrumSeedLegacy.setSecret(importText);
      if (await hdElectrumSeedLegacy.wasEverUsed()) {
        // not fetching txs or balances, fuck it, yolo, life is too short
        return WalletImport._saveWallet(hdElectrumSeedLegacy);
      }
    } catch (_) {}

    // is it AEZEED?
    try {
      const aezeed = new HDAezeedWallet();
      aezeed.setSecret(importText);
      if (await aezeed.validateMnemonicAsync()) {
        // not fetching txs or balances, fuck it, yolo, life is too short
        return WalletImport._saveWallet(aezeed);
      } else {
        // there is a chance that a password is required
        if (await aezeed.mnemonicInvalidPassword()) {
          const password = await prompt(loc.wallets.enter_bip38_password, '', false);
          if (!password) {
            // no passord is basically cancel whole aezeed import process
            throw new Error(loc._.bad_password);
          }

          const mnemonics = importText.split(':')[0];
          return WalletImport.processImportText(mnemonics + ':' + password);
        }
      }
    } catch (_) {}

    const hd2 = new HDSegwitP2SHWallet();
    hd2.setSecret(importText);
    if (hd2.validateMnemonic()) {
      await hd2.fetchBalance();
      if (hd2.getBalance() > 0) {
        // await hd2.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
        return WalletImport._saveWallet(hd2);
      }
    }

    const hd3 = new HDLegacyP2PKHWallet();
    hd3.setSecret(importText);
    if (hd3.validateMnemonic()) {
      await hd3.fetchBalance();
      if (hd3.getBalance() > 0) {
        // await hd3.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
        return WalletImport._saveWallet(hd3);
      }
    }

    // no balances? how about transactions count?

    if (hd1.validateMnemonic()) {
      await hd1.fetchTransactions();
      if (hd1.getTransactions().length !== 0) {
        return WalletImport._saveWallet(hd1);
      }
    }
    if (hd2.validateMnemonic()) {
      await hd2.fetchTransactions();
      if (hd2.getTransactions().length !== 0) {
        return WalletImport._saveWallet(hd2);
      }
    }
    if (hd3.validateMnemonic()) {
      await hd3.fetchTransactions();
      if (hd3.getTransactions().length !== 0) {
        return WalletImport._saveWallet(hd3);
      }
    }
    if (hd4.validateMnemonic()) {
      await hd4.fetchTransactions();
      if (hd4.getTransactions().length !== 0) {
        return WalletImport._saveWallet(hd4);
      }
    }

    // is it even valid? if yes we will import as:
    if (hd4.validateMnemonic()) {
      return WalletImport._saveWallet(hd4);
    }

    // not valid? maybe its a watch-only address?

    const watchOnly = new WatchOnlyWallet();
    watchOnly.setSecret(importText);
    if (watchOnly.valid()) {
      // await watchOnly.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
      await watchOnly.fetchBalance();
      return WalletImport._saveWallet(watchOnly, additionalProperties);
    }

    // nope?

    // TODO: try a raw private key

    throw new Error('Could not recognize format');
  };

  return null;
}

export default WalletImport;
