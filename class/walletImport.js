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
} from '../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
const EV = require('../events');
const A = require('../analytics');
/** @type {AppStorage} */
const BlueApp = require('../BlueApp');
const loc = require('../loc');
const bip38 = require('../blue_modules/bip38');
const wif = require('wif');
const prompt = require('../prompt');

export default class WalletImport {
  /**
   *
   * @param w
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   * @returns {Promise<void>}
   * @private
   */
  static async _saveWallet(w, additionalProperties) {
    try {
      const wallet = BlueApp.getWallets().some(wallet => wallet.getSecret() === w.secret && wallet.type !== PlaceholderWallet.type);
      if (wallet) {
        alert('This wallet has been previously imported.');
        WalletImport.removePlaceholderWallet();
      } else {
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        w.setLabel(loc.wallets.import.imported + ' ' + w.typeReadable);
        w.setUserHasSavedExport(true);
        if (additionalProperties) {
          for (const [key, value] of Object.entries(additionalProperties)) {
            w[key] = value;
          }
        }
        WalletImport.removePlaceholderWallet();
        BlueApp.wallets.push(w);
        await BlueApp.saveToDisk();
        A(A.ENUM.CREATED_WALLET);
        alert(loc.wallets.import.success);
      }
      EV(EV.enum.WALLETS_COUNT_CHANGED);
    } catch (e) {
      alert(e);
      console.log(e);
      WalletImport.removePlaceholderWallet();
      EV(EV.enum.WALLETS_COUNT_CHANGED);
    }
  }

  static removePlaceholderWallet() {
    const placeholderWalletIndex = BlueApp.wallets.findIndex(wallet => wallet.type === PlaceholderWallet.type);
    if (placeholderWalletIndex > -1) {
      BlueApp.wallets.splice(placeholderWalletIndex, 1);
    }
  }

  static addPlaceholderWallet(importText, isFailure = false) {
    const wallet = new PlaceholderWallet();
    wallet.setSecret(importText);
    wallet.setIsFailure(isFailure);
    BlueApp.wallets.push(wallet);
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    return wallet;
  }

  static isCurrentlyImportingWallet() {
    return BlueApp.getWallets().some(wallet => wallet.type === PlaceholderWallet.type);
  }

  /**
   *
   * @param importText
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   * @returns {Promise<void>}
   */
  static async processImportText(importText, additionalProperties) {
    if (WalletImport.isCurrentlyImportingWallet()) {
      return;
    }
    const placeholderWallet = WalletImport.addPlaceholderWallet(importText);
    // Plan:
    // -2. check if BIP38 encrypted
    // -1. check lightning custodian
    // 0. check if its HDSegwitBech32Wallet (BIP84)
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 3.1 check HD Electrum legacy
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO

    try {
      if (importText.startsWith('6P')) {
        let password = false;
        do {
          password = await prompt('This looks like password-protected private key (BIP38)', 'Enter password to decrypt', false);
        } while (!password);

        let decryptedKey = await bip38.decrypt(importText, password, status => {
          console.warn(status.percent + '%');
        });

        if (decryptedKey) {
          importText = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);
        }
      }

      // is it lightning custodian?
      if (importText.indexOf('blitzhub://') !== -1 || importText.indexOf('lndhub://') !== -1) {
        let lnd = new LightningCustodianWallet();
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

      let hd4 = new HDSegwitBech32Wallet();
      hd4.setSecret(importText);
      if (hd4.validateMnemonic()) {
        await hd4.fetchBalance();
        if (hd4.getBalance() > 0) {
          // await hd4.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
          return WalletImport._saveWallet(hd4);
        }
      }

      let segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(importText);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        let legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(importText);

        let segwitBech32Wallet = new SegwitBech32Wallet();
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

      let legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(importText);
      if (legacyWallet.getAddress()) {
        await legacyWallet.fetchBalance();
        await legacyWallet.fetchTransactions();
        return WalletImport._saveWallet(legacyWallet);
      }

      // if we're here - nope, its not a valid WIF

      let hd1 = new HDLegacyBreadwalletWallet();
      hd1.setSecret(importText);
      if (hd1.validateMnemonic()) {
        await hd1.fetchBalance();
        if (hd1.getBalance() > 0) {
          // await hd1.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
          return WalletImport._saveWallet(hd1);
        }
      }

      try {
        let hdElectrumSeedLegacy = new HDSegwitElectrumSeedP2WPKHWallet();
        hdElectrumSeedLegacy.setSecret(importText);
        if (await hdElectrumSeedLegacy.wasEverUsed()) {
          // not fetching txs or balances, fuck it, yolo, life is too short
          return WalletImport._saveWallet(hdElectrumSeedLegacy);
        }
      } catch (_) {}

      try {
        let hdElectrumSeedLegacy = new HDLegacyElectrumSeedP2PKHWallet();
        hdElectrumSeedLegacy.setSecret(importText);
        if (await hdElectrumSeedLegacy.wasEverUsed()) {
          // not fetching txs or balances, fuck it, yolo, life is too short
          return WalletImport._saveWallet(hdElectrumSeedLegacy);
        }
      } catch (_) {}

      let hd2 = new HDSegwitP2SHWallet();
      hd2.setSecret(importText);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          // await hd2.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
          return WalletImport._saveWallet(hd2);
        }
      }

      let hd3 = new HDLegacyP2PKHWallet();
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

      let watchOnly = new WatchOnlyWallet();
      watchOnly.setSecret(importText);
      if (watchOnly.valid()) {
        // await watchOnly.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
        await watchOnly.fetchBalance();
        return WalletImport._saveWallet(watchOnly, additionalProperties);
      }

      // nope?

      // TODO: try a raw private key
    } catch (Err) {
      WalletImport.removePlaceholderWallet(placeholderWallet);
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      console.warn(Err);
    }
    WalletImport.removePlaceholderWallet();
    WalletImport.addPlaceholderWallet(importText, true);
    ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
    EV(EV.enum.WALLETS_COUNT_CHANGED);
    alert(loc.wallets.import.error);
  }
}
