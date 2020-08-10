/* global alert */
import AsyncStorage from '@react-native-community/async-storage';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import {
  HDLegacyBreadwalletWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  WatchOnlyWallet,
  LegacyWallet,
  SegwitP2SHWallet,
  SegwitBech32Wallet,
  HDSegwitBech32Wallet,
  PlaceholderWallet,
  LightningCustodianWallet,
  HDLegacyElectrumSeedP2PKHWallet,
  HDSegwitElectrumSeedP2WPKHWallet,
} from './';
import WatchConnectivity from '../WatchConnectivity';
import DeviceQuickActions from './quick-actions';
const encryption = require('../blue_modules/encryption');

export class AppStorage {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static LANG = 'lang';
  static EXCHANGE_RATES = 'currency';
  static LNDHUB = 'lndhub';
  static ELECTRUM_HOST = 'electrum_host';
  static ELECTRUM_TCP_PORT = 'electrum_tcp_port';
  static ELECTRUM_SSL_PORT = 'electrum_ssl_port';
  static PREFERRED_CURRENCY = 'preferredCurrency';
  static ADVANCED_MODE_ENABLED = 'advancedmodeenabled';
  static DELETE_WALLET_AFTER_UNINSTALL = 'deleteWalletAfterUninstall';
  static HODL_HODL_API_KEY = 'HODL_HODL_API_KEY';
  static HODL_HODL_SIGNATURE_KEY = 'HODL_HODL_SIGNATURE_KEY';
  static HODL_HODL_CONTRACTS = 'HODL_HODL_CONTRACTS';

  constructor() {
    /** {Array.<AbstractWallet>} */
    this.wallets = [];
    this.tx_metadata = {};
    this.cachedPassword = false;
  }

  /**
   * Wrapper for storage call. Secure store works only in RN environment. AsyncStorage is
   * used for cli/tests
   *
   * @param key
   * @param value
   * @returns {Promise<any>|Promise<any> | Promise<void> | * | Promise | void}
   */
  setItem(key, value) {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return RNSecureKeyStore.set(key, value, { accessible: ACCESSIBLE.WHEN_UNLOCKED });
    } else {
      return AsyncStorage.setItem(key, value);
    }
  }

  /**
   * Wrapper for storage call. Secure store works only in RN environment. AsyncStorage is
   * used for cli/tests
   *
   * @param key
   * @returns {Promise<any>|*}
   */
  getItem(key) {
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
      return RNSecureKeyStore.get(key);
    } else {
      return AsyncStorage.getItem(key);
    }
  }

  async setResetOnAppUninstallTo(value) {
    await this.setItem(AppStorage.DELETE_WALLET_AFTER_UNINSTALL, value ? '1' : '');
    try {
      RNSecureKeyStore.setResetOnAppUninstallTo(value);
    } catch (Error) {
      console.warn(Error);
    }
  }

  async storageIsEncrypted() {
    let data;
    try {
      data = await this.getItem(AppStorage.FLAG_ENCRYPTED);
    } catch (error) {
      return false;
    }

    return !!data;
  }

  async isPasswordInUse(password) {
    try {
      let data = await this.getItem('data');
      data = this.decryptData(data, password);
      return !!data;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Iterates through all values of `data` trying to
   * decrypt each one, and returns first one successfully decrypted
   *
   * @param data {string} Serialized array
   * @param password
   * @returns {boolean|string} Either STRING of storage data (which is stringified JSON) or FALSE, which means failure
   */
  decryptData(data, password) {
    data = JSON.parse(data);
    let decrypted;
    for (const value of data) {
      try {
        decrypted = encryption.decrypt(value, password);
      } catch (e) {
        console.log(e.message);
      }

      if (decrypted) {
        return decrypted;
      }
    }

    return false;
  }

  async decryptStorage(password) {
    if (password === this.cachedPassword) {
      this.cachedPassword = undefined;
      await this.setResetOnAppUninstallTo(true);
      await this.saveToDisk();
      this.wallets = [];
      this.tx_metadata = [];
      return this.loadFromDisk();
    } else {
      throw new Error('Wrong password. Please, try again.');
    }
  }

  async isDeleteWalletAfterUninstallEnabled() {
    let deleteWalletsAfterUninstall;
    try {
      deleteWalletsAfterUninstall = await this.getItem(AppStorage.DELETE_WALLET_AFTER_UNINSTALL);
    } catch (_e) {
      deleteWalletsAfterUninstall = true;
    }
    return !!deleteWalletsAfterUninstall;
  }

  async encryptStorage(password) {
    // assuming the storage is not yet encrypted
    await this.saveToDisk();
    let data = await this.getItem('data');
    // TODO: refactor ^^^ (should not save & load to fetch data)

    const encrypted = encryption.encrypt(data, password);
    data = [];
    data.push(encrypted); // putting in array as we might have many buckets with storages
    data = JSON.stringify(data);
    this.cachedPassword = password;
    await this.setItem('data', data);
    await this.setItem(AppStorage.FLAG_ENCRYPTED, '1');
    DeviceQuickActions.clearShortcutItems();
    DeviceQuickActions.removeAllWallets();
  }

  /**
   * Cleans up all current application data (wallets, tx metadata etc)
   * Encrypts the bucket and saves it storage
   *
   * @returns {Promise.<boolean>} Success or failure
   */
  async createFakeStorage(fakePassword) {
    this.wallets = [];
    this.tx_metadata = {};

    const data = {
      wallets: [],
      tx_metadata: {},
    };

    let buckets = await this.getItem('data');
    buckets = JSON.parse(buckets);
    buckets.push(encryption.encrypt(JSON.stringify(data), fakePassword));
    this.cachedPassword = fakePassword;
    const bucketsString = JSON.stringify(buckets);
    await this.setItem('data', bucketsString);
    return (await this.getItem('data')) === bucketsString;
  }

  /**
   * Loads from storage all wallets and
   * maps them to `this.wallets`
   *
   * @param password If present means storage must be decrypted before usage
   * @returns {Promise.<boolean>}
   */
  async loadFromDisk(password) {
    try {
      let data = await this.getItem('data');
      if (password) {
        data = this.decryptData(data, password);
        if (data) {
          // password is good, cache it
          this.cachedPassword = password;
        }
      }
      if (data !== null) {
        data = JSON.parse(data);
        if (!data.wallets) return false;
        const wallets = data.wallets;
        for (const key of wallets) {
          // deciding which type is wallet and instatiating correct object
          const tempObj = JSON.parse(key);
          let unserializedWallet;
          switch (tempObj.type) {
            case PlaceholderWallet.type:
              continue;
            case SegwitBech32Wallet.type:
              unserializedWallet = SegwitBech32Wallet.fromJson(key);
              break;
            case SegwitP2SHWallet.type:
              unserializedWallet = SegwitP2SHWallet.fromJson(key);
              break;
            case WatchOnlyWallet.type:
              unserializedWallet = WatchOnlyWallet.fromJson(key);
              unserializedWallet.init();
              if (unserializedWallet.isHd() && !unserializedWallet.isXpubValid()) {
                continue;
              }
              break;
            case HDLegacyP2PKHWallet.type:
              unserializedWallet = HDLegacyP2PKHWallet.fromJson(key);
              break;
            case HDSegwitP2SHWallet.type:
              unserializedWallet = HDSegwitP2SHWallet.fromJson(key);
              break;
            case HDSegwitBech32Wallet.type:
              unserializedWallet = HDSegwitBech32Wallet.fromJson(key);
              break;
            case HDLegacyBreadwalletWallet.type:
              unserializedWallet = HDLegacyBreadwalletWallet.fromJson(key);
              break;
            case HDLegacyElectrumSeedP2PKHWallet.type:
              unserializedWallet = HDLegacyElectrumSeedP2PKHWallet.fromJson(key);
              break;
            case HDSegwitElectrumSeedP2WPKHWallet.type:
              unserializedWallet = HDSegwitElectrumSeedP2WPKHWallet.fromJson(key);
              break;
            case LightningCustodianWallet.type: {
              /** @type {LightningCustodianWallet} */
              unserializedWallet = LightningCustodianWallet.fromJson(key);
              let lndhub = false;
              try {
                lndhub = await AsyncStorage.getItem(AppStorage.LNDHUB);
              } catch (Error) {
                console.warn(Error);
              }

              if (unserializedWallet.baseURI) {
                unserializedWallet.setBaseURI(unserializedWallet.baseURI); // not really necessary, just for the sake of readability
                console.log('using saved uri for for ln wallet:', unserializedWallet.baseURI);
              } else if (lndhub) {
                console.log('using wallet-wide settings ', lndhub, 'for ln wallet');
                unserializedWallet.setBaseURI(lndhub);
              } else {
                console.log('using default', LightningCustodianWallet.defaultBaseUri, 'for ln wallet');
                unserializedWallet.setBaseURI(LightningCustodianWallet.defaultBaseUri);
              }
              unserializedWallet.init();
              break;
            }
            case LegacyWallet.type:
            default:
              unserializedWallet = LegacyWallet.fromJson(key);
              break;
          }
          // done
          if (!this.wallets.some(wallet => wallet.getSecret() === unserializedWallet.secret)) {
            this.wallets.push(unserializedWallet);
            this.tx_metadata = data.tx_metadata;
          }
        }
        WatchConnectivity.shared.wallets = this.wallets;
        WatchConnectivity.shared.tx_metadata = this.tx_metadata;
        WatchConnectivity.shared.fetchTransactionsFunction = async () => {
          await this.fetchWalletTransactions();
          await this.saveToDisk();
        };
        await WatchConnectivity.shared.sendWalletsToWatch();

        const isStorageEncrypted = await this.storageIsEncrypted();
        if (isStorageEncrypted) {
          DeviceQuickActions.clearShortcutItems();
          DeviceQuickActions.removeAllWallets();
        } else {
          DeviceQuickActions.setWallets(this.wallets);
          DeviceQuickActions.setQuickActions();
        }
        return true;
      } else {
        return false; // failed loading data or loading/decryptin data
      }
    } catch (error) {
      console.warn(error.message);
      return false;
    }
  }

  /**
   * Lookup wallet in list by it's secret and
   * remove it from `this.wallets`
   *
   * @param wallet {AbstractWallet}
   */
  deleteWallet(wallet) {
    const secret = wallet.getSecret();
    const tempWallets = [];

    for (const value of this.wallets) {
      if (value.getSecret() === secret) {
        // the one we should delete
        // nop
      } else {
        // the one we must keep
        tempWallets.push(value);
      }
    }
    this.wallets = tempWallets;
  }

  /**
   * Serializes and saves to storage object data.
   * If cached password is saved - finds the correct bucket
   * to save to, encrypts and then saves.
   *
   * @returns {Promise} Result of storage save
   */
  async saveToDisk() {
    const walletsToSave = [];
    for (const key of this.wallets) {
      if (typeof key === 'boolean' || key.type === PlaceholderWallet.type) continue;
      if (key.prepareForSerialization) key.prepareForSerialization();
      walletsToSave.push(JSON.stringify({ ...key, type: key.type }));
    }
    let data = {
      wallets: walletsToSave,
      tx_metadata: this.tx_metadata,
    };

    if (this.cachedPassword) {
      // should find the correct bucket, encrypt and then save
      let buckets = await this.getItem('data');
      buckets = JSON.parse(buckets);
      const newData = [];
      for (const bucket of buckets) {
        const decrypted = encryption.decrypt(bucket, this.cachedPassword);
        if (!decrypted) {
          // no luck decrypting, its not our bucket
          newData.push(bucket);
        } else {
          // decrypted ok, this is our bucket
          // we serialize our object's data, encrypt it, and add it to buckets
          newData.push(encryption.encrypt(JSON.stringify(data), this.cachedPassword));
          await this.setItem(AppStorage.FLAG_ENCRYPTED, '1');
        }
      }
      data = newData;
    } else {
      await this.setItem(AppStorage.FLAG_ENCRYPTED, ''); // drop the flag
    }
    WatchConnectivity.shared.wallets = this.wallets;
    WatchConnectivity.shared.tx_metadata = this.tx_metadata;
    WatchConnectivity.shared.sendWalletsToWatch();
    DeviceQuickActions.setWallets(this.wallets);
    DeviceQuickActions.setQuickActions();
    try {
      return await this.setItem('data', JSON.stringify(data));
    } catch (error) {
      alert(error.message);
    }
  }

  /**
   * For each wallet, fetches balance from remote endpoint.
   * Use getter for a specific wallet to get actual balance.
   * Returns void.
   * If index is present then fetch only from this specific wallet
   *
   * @return {Promise.<void>}
   */
  async fetchWalletBalances(index) {
    console.log('fetchWalletBalances for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      let c = 0;
      for (const wallet of this.wallets.filter(wallet => wallet.type !== PlaceholderWallet.type)) {
        if (c++ === index) {
          await wallet.fetchBalance();
        }
      }
    } else {
      for (const wallet of this.wallets.filter(wallet => wallet.type !== PlaceholderWallet.type)) {
        await wallet.fetchBalance();
      }
    }
  }

  /**
   * Fetches from remote endpoint all transactions for each wallet.
   * Returns void.
   * To access transactions - get them from each respective wallet.
   * If index is present then fetch only from this specific wallet.
   *
   * @param index {Integer} Index of the wallet in this.wallets array,
   *                        blank to fetch from all wallets
   * @return {Promise.<void>}
   */
  async fetchWalletTransactions(index) {
    console.log('fetchWalletTransactions for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      let c = 0;
      for (const wallet of this.wallets.filter(wallet => wallet.type !== PlaceholderWallet.type)) {
        if (c++ === index) {
          await wallet.fetchTransactions();
          if (wallet.fetchPendingTransactions) {
            await wallet.fetchPendingTransactions();
          }
          if (wallet.fetchUserInvoices) {
            await wallet.fetchUserInvoices();
          }
        }
      }
    } else {
      for (const wallet of this.wallets) {
        await wallet.fetchTransactions();
        if (wallet.fetchPendingTransactions) {
          await wallet.fetchPendingTransactions();
        }
        if (wallet.fetchUserInvoices) {
          await wallet.fetchUserInvoices();
        }
      }
    }
  }

  /**
   *
   * @returns {Array.<AbstractWallet>}
   */
  getWallets() {
    return this.wallets;
  }

  /**
   * Getter for all transactions in all wallets.
   * But if index is provided - only for wallet with corresponding index
   *
   * @param index {Integer|null} Wallet index in this.wallets. Empty (or null) for all wallets.
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @param includeWalletsWithHideTransactionsEnabled {Boolean} Wallets' _hideTransactionsInWalletsList property determines wether the user wants this wallet's txs hidden from the main list view.
   * @return {Array}
   */
  getTransactions(index, limit = Infinity, includeWalletsWithHideTransactionsEnabled = false) {
    if (index || index === 0) {
      let txs = [];
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          txs = txs.concat(wallet.getTransactions());
        }
      }
      return txs;
    }

    let txs = [];
    for (const wallet of this.wallets.filter(w => includeWalletsWithHideTransactionsEnabled || !w.getHideTransactionsInWalletsList())) {
      const walletTransactions = wallet.getTransactions();
      for (const t of walletTransactions) {
        t.walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
      }
      txs = txs.concat(walletTransactions);
    }

    for (const t of txs) {
      t.sort_ts = +new Date(t.received);
    }

    return txs
      .sort(function (a, b) {
        return b.sort_ts - a.sort_ts;
      })
      .slice(0, limit);
  }

  /**
   * Getter for a sum of all balances of all wallets
   *
   * @return {number}
   */
  getBalance() {
    let finalBalance = 0;
    for (const wal of this.wallets) {
      finalBalance += wal.getBalance();
    }
    return finalBalance;
  }

  async getHodlHodlApiKey() {
    try {
      return await this.getItem(AppStorage.HODL_HODL_API_KEY);
    } catch (_) {}
    return false;
  }

  async getHodlHodlSignatureKey() {
    try {
      return await this.getItem(AppStorage.HODL_HODL_SIGNATURE_KEY);
    } catch (_) {}
    return false;
  }

  /**
   * Since we cant fetch list of contracts from hodlhodl api yet, we have to keep track of it ourselves
   *
   * @returns {Promise<string[]>} String ids of contracts in an array
   */
  async getHodlHodlContracts() {
    try {
      const json = await this.getItem(AppStorage.HODL_HODL_CONTRACTS);
      return JSON.parse(json);
    } catch (_) {}
    return [];
  }

  async addHodlHodlContract(id) {
    let json;
    try {
      json = await this.getItem(AppStorage.HODL_HODL_CONTRACTS);
      json = JSON.parse(json);
    } catch (_) {
      json = [];
    }

    json.push(id);
    return this.setItem(AppStorage.HODL_HODL_CONTRACTS, JSON.stringify(json));
  }

  async setHodlHodlApiKey(key, sigKey) {
    if (sigKey) await this.setItem(AppStorage.HODL_HODL_SIGNATURE_KEY, sigKey);
    return this.setItem(AppStorage.HODL_HODL_API_KEY, key);
  }

  async isAdancedModeEnabled() {
    try {
      return !!(await this.getItem(AppStorage.ADVANCED_MODE_ENABLED));
    } catch (_) {}
    return false;
  }

  async setIsAdancedModeEnabled(value) {
    await this.setItem(AppStorage.ADVANCED_MODE_ENABLED, value ? '1' : '');
  }

  /**
   * Simple async sleeper function
   *
   * @param ms {number} Milliseconds to sleep
   * @returns {Promise<Promise<*> | Promise<*>>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
