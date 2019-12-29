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
} from '../class';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
const EV = require('../events');
const A = require('../analytics');
/** @type {AppStorage} */
const BlueApp = require('../BlueApp');
const loc = require('../loc');

export default class WalletImport {
  static async _saveWallet(w) {
    try {
      const wallet = BlueApp.getWallets().some(wallet => wallet.getSecret() === w.secret && wallet.type !== PlaceholderWallet.type);
      if (wallet) {
        alert('This wallet has been previously imported.');
        WalletImport.removePlaceholderWallet();
      } else {
        alert(loc.wallets.import.success);
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        w.setLabel(loc.wallets.import.imported + ' ' + w.typeReadable);
        w.setUserHasSavedExport(true);
        WalletImport.removePlaceholderWallet();
        BlueApp.wallets.push(w);
        await BlueApp.saveToDisk();
        A(A.ENUM.CREATED_WALLET);
      }
      EV(EV.enum.WALLETS_COUNT_CHANGED);
    } catch (_e) {}
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

  static async processImportText(importText) {
    if (WalletImport.isCurrentlyImportingWallet()) {
      return;
    }
    const placeholderWallet = WalletImport.addPlaceholderWallet(importText);
    // Plan:
    // 0. check if its HDSegwitBech32Wallet (BIP84)
    // 1. check if its HDSegwitP2SHWallet (BIP49)
    // 2. check if its HDLegacyP2PKHWallet (BIP44)
    // 3. check if its HDLegacyBreadwalletWallet (no BIP, just "m/0")
    // 4. check if its Segwit WIF (P2SH)
    // 5. check if its Legacy WIF
    // 6. check if its address (watch-only wallet)
    // 7. check if its private key (segwit address P2SH) TODO
    // 7. check if its private key (legacy address) TODO

    try {
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
          await hd4.fetchTransactions();
          return WalletImport._saveWallet(hd4);
        }
      }

      let segwitWallet = new SegwitP2SHWallet();
      segwitWallet.setSecret(importText);
      if (segwitWallet.getAddress()) {
        // ok its a valid WIF

        let legacyWallet = new LegacyWallet();
        legacyWallet.setSecret(importText);

        await legacyWallet.fetchBalance();
        if (legacyWallet.getBalance() > 0) {
          // yep, its legacy we're importing
          await legacyWallet.fetchTransactions();
          return WalletImport._saveWallet(legacyWallet);
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
          await hd1.fetchTransactions();
          return WalletImport._saveWallet(hd1);
        }
      }

      let hd2 = new HDSegwitP2SHWallet();
      hd2.setSecret(importText);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          await hd2.fetchTransactions();
          return WalletImport._saveWallet(hd2);
        }
      }

      let hd3 = new HDLegacyP2PKHWallet();
      hd3.setSecret(importText);
      if (hd3.validateMnemonic()) {
        await hd3.fetchBalance();
        if (hd3.getBalance() > 0) {
          await hd3.fetchTransactions();
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
        await watchOnly.fetchTransactions();
        await watchOnly.fetchBalance();
        return WalletImport._saveWallet(watchOnly);
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
