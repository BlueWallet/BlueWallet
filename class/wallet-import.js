/* global alert */
import {
  AppStorage,
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
} from '.';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import loc from '../loc';
const EV = require('../blue_modules/events');
const A = require('../blue_modules/analytics');
const BlueApp: AppStorage = require('../BlueApp');
const bip38 = require('../blue_modules/bip38');
const wif = require('wif');
const prompt = require('../blue_modules/prompt');
const notifications = require('../blue_modules/notifications');
const encryption = require('../blue_modules/encryption');

export default class WalletImport {
  queue = [];
  /**
   *
   * @param w {AbstractWallet}
   * @param additionalProperties key-values passed from outside. Used only to set up `masterFingerprint` property for watch-only wallet
   * @returns {Promise<void>}
   * @private
   */
  static async _saveWallet(w, additionalProperties) {
    try {
      const wallet = BlueApp.getWallets().some(wallet => wallet.getSecret() === w.secret && wallet.type !== PlaceholderWallet.type);
      if (wallet) {
        if (WalletImport.shared.queue.length === 0) {
          alert('This wallet has been previously imported.');
          WalletImport.removePlaceholderWallet();
        }
      } else {
        const emptyWalletLabel = new LegacyWallet().getLabel();
        ReactNativeHapticFeedback.trigger('notificationSuccess', { ignoreAndroidSystemSettings: false });
        if (w.getLabel() === emptyWalletLabel) w.setLabel(loc.wallets.import_imported + ' ' + w.typeReadable);
        w.setUserHasSavedExport(true);
        if (additionalProperties) {
          for (const [key, value] of Object.entries(additionalProperties)) {
            if (key !== 'secret') {
              w[key] = value;
            }
          }
        }
        WalletImport.removePlaceholderWallet();
        BlueApp.wallets.push(w);
        await BlueApp.saveToDisk();
        A(A.ENUM.CREATED_WALLET);
        WalletImport.shared.queue = WalletImport.shared.queue.filter(wallet => wallet.secret !== w.getSecret());
        if (WalletImport.shared.queue.length === 0) {
          alert(loc.wallets.import_success);
        }
        notifications.majorTomToGroundControl(w.getAllExternalAddresses(), [], []);
      }
      EV(EV.enum.WALLETS_COUNT_CHANGED);
    } catch (e) {
      if (WalletImport.shared.queue.length === 0) {
        alert(e);
      }
      console.log(e);
    }
    WalletImport.removePlaceholderWallet();
  }

  static removePlaceholderWallet() {
    const placeholderWalletIndex = BlueApp.wallets.findIndex(wallet => wallet.type === PlaceholderWallet.type);
    if (placeholderWalletIndex > -1) {
      BlueApp.wallets.splice(placeholderWalletIndex, 1);
    }
    EV(EV.enum.WALLETS_COUNT_CHANGED);
  }

  static addPlaceholderWallet(importText, isFailure = false) {
    if (WalletImport.shared.queue.length === 0) {
      const wallet = new PlaceholderWallet();
      wallet.setSecret(importText);
      wallet.setIsFailure(isFailure);
      BlueApp.wallets.push(wallet);
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      return wallet;
    }
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
    if (WalletImport.isCurrentlyImportingWallet() && WalletImport.shared.queue.length === 0) {
      return;
    }
    WalletImport.addPlaceholderWallet(importText);
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

        const decryptedKey = await bip38.decrypt(importText, password, status => {
          console.warn(status.percent + '%');
        });

        if (decryptedKey) {
          importText = wif.encode(0x80, decryptedKey.privateKey, decryptedKey.compressed);
        }
      } else if (importText.startsWith('bluewallet:import?data=')) {
        const data = importText.split('bluewallet:import?data=')[1];
        let password = false;
        do {
          password = await prompt('Import Wallets', 'Enter password to decrypt');
        } while (!password);

        const decrypted = await encryption.decrypt(data, password);
        if (decrypted) {
          WalletImport.shared.queue = JSON.parse(decrypted);
          WalletImport.shared.queue.forEach(async wallet => {
            if (wallet.type === LightningCustodianWallet.type) {
              await WalletImport.processImportText(wallet.secret + '@' + wallet.baseURI, { ...wallet });
            } else {
              await WalletImport.processImportText(wallet.secret, { ...wallet });
            }
          });
        } else {
          WalletImport.shared.queue = [];
        }
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
        return WalletImport._saveWallet(lnd, additionalProperties);
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
          return WalletImport._saveWallet(legacyWallet, additionalProperties);
        } else if (segwitBech32Wallet.getBalance() > 0) {
          // yep, its single-address bech32 wallet
          await segwitBech32Wallet.fetchTransactions();
          return WalletImport._saveWallet(segwitBech32Wallet, additionalProperties);
        } else {
          // by default, we import wif as Segwit P2SH
          await segwitWallet.fetchBalance();
          await segwitWallet.fetchTransactions();
          return WalletImport._saveWallet(segwitWallet, additionalProperties);
        }
      }

      // case - WIF is valid, just has uncompressed pubkey

      const legacyWallet = new LegacyWallet();
      legacyWallet.setSecret(importText);
      if (legacyWallet.getAddress()) {
        await legacyWallet.fetchBalance();
        await legacyWallet.fetchTransactions();
        return WalletImport._saveWallet(legacyWallet, additionalProperties);
      }

      // if we're here - nope, its not a valid WIF

      const hd1 = new HDLegacyBreadwalletWallet();
      hd1.setSecret(importText);
      if (hd1.validateMnemonic()) {
        await hd1.fetchBalance();
        if (hd1.getBalance() > 0) {
          // await hd1.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
          return WalletImport._saveWallet(hd1, additionalProperties);
        }
      }

      try {
        const hdElectrumSeedLegacy = new HDSegwitElectrumSeedP2WPKHWallet();
        hdElectrumSeedLegacy.setSecret(importText);
        if (await hdElectrumSeedLegacy.wasEverUsed()) {
          // not fetching txs or balances, fuck it, yolo, life is too short
          return WalletImport._saveWallet(hdElectrumSeedLegacy, additionalProperties);
        }
      } catch (_) {}

      try {
        const hdElectrumSeedLegacy = new HDLegacyElectrumSeedP2PKHWallet();
        hdElectrumSeedLegacy.setSecret(importText);
        if (await hdElectrumSeedLegacy.wasEverUsed()) {
          // not fetching txs or balances, fuck it, yolo, life is too short
          return WalletImport._saveWallet(hdElectrumSeedLegacy, additionalProperties);
        }
      } catch (_) {}

      const hd2 = new HDSegwitP2SHWallet();
      hd2.setSecret(importText);
      if (hd2.validateMnemonic()) {
        await hd2.fetchBalance();
        if (hd2.getBalance() > 0) {
          // await hd2.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
          return WalletImport._saveWallet(hd2, additionalProperties);
        }
      }

      const hd3 = new HDLegacyP2PKHWallet();
      hd3.setSecret(importText);
      if (hd3.validateMnemonic()) {
        await hd3.fetchBalance();
        if (hd3.getBalance() > 0) {
          // await hd3.fetchTransactions(); // experiment: dont fetch tx now. it will import faster. user can refresh his wallet later
          return WalletImport._saveWallet(hd3, additionalProperties);
        }
      }

      // no balances? how about transactions count?

      if (hd1.validateMnemonic()) {
        await hd1.fetchTransactions();
        if (hd1.getTransactions().length !== 0) {
          return WalletImport._saveWallet(hd1, additionalProperties);
        }
      }
      if (hd2.validateMnemonic()) {
        await hd2.fetchTransactions();
        if (hd2.getTransactions().length !== 0) {
          return WalletImport._saveWallet(hd2, additionalProperties);
        }
      }
      if (hd3.validateMnemonic()) {
        await hd3.fetchTransactions();
        if (hd3.getTransactions().length !== 0) {
          return WalletImport._saveWallet(hd3, additionalProperties);
        }
      }
      if (hd4.validateMnemonic()) {
        await hd4.fetchTransactions();
        if (hd4.getTransactions().length !== 0) {
          return WalletImport._saveWallet(hd4, additionalProperties);
        }
      }

      // is it even valid? if yes we will import as:
      if (hd4.validateMnemonic()) {
        return WalletImport._saveWallet(hd4, additionalProperties);
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
    } catch (Err) {
      WalletImport.removePlaceholderWallet();
      console.warn(Err);
    }
    if (WalletImport.shared.queue.length === 0) {
      WalletImport.addPlaceholderWallet(importText, true);
      ReactNativeHapticFeedback.trigger('notificationError', { ignoreAndroidSystemSettings: false });
      EV(EV.enum.WALLETS_COUNT_CHANGED);
      alert(loc.wallets.import_error);
    }
    WalletImport.shared.queue = WalletImport.shared.queue.filter(wallet => wallet.secret !== importText);
  }
}

WalletImport.shared = new WalletImport();
