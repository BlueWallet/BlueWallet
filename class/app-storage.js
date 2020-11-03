import AsyncStorage from '@react-native-community/async-storage';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';

import logger from '../logger';
import {
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  WatchOnlyWallet,
  LegacyWallet,
  SegwitP2SHWallet,
  SegwitBech32Wallet,
  HDSegwitBech32Wallet,
  HDSegwitP2SHArWallet,
  HDSegwitP2SHAirWallet,
  Authenticator,
} from './';

const encryption = require('../encryption');

export class AppStorage {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static LANG = 'lang';
  static ELECTRUM_HOST = 'electrum_host';
  static ELECTRUM_TCP_PORT = 'electrum_tcp_port';

  constructor() {
    /** {Array.<AbstractWallet>} */
    this.wallets = [];
    this.authenticators = [];
    this.tx_metadata = {};
    this.cachedPassword = false;
    this.settings = {
      brandingColor: '#ffffff',
      foregroundColor: '#0c2550',
      buttonBackgroundColor: '#ccddf9',
      buttonTextColor: '#0c2550',
      buttonAlternativeTextColor: '#2f5fb3',
      buttonDisabledBackgroundColor: '#eef0f4',
      buttonDisabledTextColor: '#9aa0aa',
      inputBorderColor: '#d2d2d2',
      inputBackgroundColor: '#f5f5f5',
      alternativeTextColor: '#9aa0aa',
      alternativeTextColor2: '#0f5cc0',
      buttonBlueBackgroundColor: '#ccddf9',
      incomingBackgroundColor: '#d2f8d6',
      incomingForegroundColor: '#37c0a1',
      outgoingBackgroundColor: '#f8d2d2',
      outgoingForegroundColor: '#d0021b',
      successColor: '#37c0a1',
      failedColor: '#ff0000',
      shadowColor: '#000000',
      inverseForegroundColor: '#ffffff',
      hdborderColor: '#68BBE1',
      hdbackgroundColor: '#ECF9FF',
      lnborderColor: '#F7C056',
      lnbackgroundColor: '#FFFAEF',
    };
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
      return RNSecureKeyStore.set(key, value, {
        accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
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

  async storageIsEncrypted() {
    let data;
    try {
      data = await this.getItem(AppStorage.FLAG_ENCRYPTED);
    } catch (error) {
      return false;
    }

    return !!data;
  }

  /**
   * Iterates through all values of `data` trying to
   * decrypt each one, and returns first one successfully decrypted
   *
   * @param data String (serialized array)
   * @param password
   */
  decryptData(data, password) {
    data = JSON.parse(data);
    let decrypted;
    for (const value of data) {
      try {
        decrypted = encryption.decrypt(value, password);
      } catch (e) {
        logger.error('app-storage', `decryptData: ${e.message}`);
      }

      if (decrypted) {
        return decrypted;
      }
    }

    return false;
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
        const { authenticators } = data;
        this.authenticators = authenticators?.map(a => Authenticator.fromJson(a)) || [];

        if (!data.wallets) return false;
        const wallets = data.wallets;
        for (const key of wallets) {
          // deciding which type is wallet and instatiating correct object
          const tempObj = JSON.parse(key);
          let unserializedWallet;
          switch (tempObj.type) {
            case SegwitBech32Wallet.type:
              unserializedWallet = SegwitBech32Wallet.fromJson(key);
              break;
            case SegwitP2SHWallet.type:
              unserializedWallet = SegwitP2SHWallet.fromJson(key);
              break;
            case WatchOnlyWallet.type:
              unserializedWallet = WatchOnlyWallet.fromJson(key);
              unserializedWallet.init();
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
            case HDSegwitP2SHArWallet.type:
              unserializedWallet = HDSegwitP2SHArWallet.fromJson(key);
              break;
            case HDSegwitP2SHAirWallet.type:
              unserializedWallet = HDSegwitP2SHAirWallet.fromJson(key);
              break;
            case LegacyWallet.type:
            default:
              unserializedWallet = LegacyWallet.fromJson(key);
          }
          // done
          if (!this.wallets.some(wallet => wallet.getSecret() === unserializedWallet.secret)) {
            this.wallets.push(unserializedWallet);
            this.tx_metadata = data.tx_metadata;
          }
        }
        return true;
      } else {
        return false; // failed loading data or loading/decryptin data
      }
    } catch (error) {
      logger.error('app-storage', `loadFromDisk: ${error.message}`);
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

  addAuthenticator(a) {
    this.authenticators = [...(this.authenticators || []), a];
  }
  updateAuthenticator(authenticatorUpdate) {
    let updatedAuthenticator = null;
    this.authenticators = this.authenticators.map(authenticator => {
      if (authenticator.id === authenticatorUpdate.id) {
        updatedAuthenticator = authenticatorUpdate;
        return authenticatorUpdate;
      }
      return authenticator;
    });
    if (updatedAuthenticator === null) {
      throw new Error(`Couldn't update authenticator: ${JSON.stringify(authenticatorUpdate)}`);
    }
    return updatedAuthenticator;
  }

  addWallet(w) {
    this.wallets = [...this.wallets, w];
  }

  updateWallet(walletUpdate) {
    let updatedWallet = null;
    this.wallets = this.wallets.map(wallet => {
      if (wallet.id === walletUpdate.id) {
        updatedWallet = walletUpdate;
        return walletUpdate;
      }
      return wallet;
    });
    if (updatedWallet === null) {
      throw new Error(`Couldn't update wallet: ${JSON.stringify(walletUpdate)}`);
    }
    return updatedWallet;
  }

  stringifyArray(data) {
    const arr = [];
    for (const key of data) {
      if (typeof key === 'boolean') continue;
      if (key.prepareForSerialization) key.prepareForSerialization();
      arr.push(JSON.stringify({ ...key, type: key.type }));
    }
    return arr;
  }

  /**
   * Serializes and saves to storage object data.
   * If cached password is saved - finds the correct bucket
   * to save to, encrypts and then saves.
   *
   * @returns {Promise} Result of storage save
   */
  async saveToDisk() {
    const walletsToSave = this.stringifyArray(this.wallets);
    const authenticatorsToSave = this.stringifyArray(this.authenticators);

    let data = {
      wallets: walletsToSave,
      authenticators: authenticatorsToSave,
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

    return this.setItem('data', JSON.stringify(data));
  }

  /**
   * For each wallet, fetches balance from remote endpoint.
   * Use getter for a specific wallet to get actual balance.
   * Returns void.
   * If index is present then fetch only from this specific wallet
   *
   * @return {Promise.<void>}
   */
  fetchWalletBalances() {
    return Promise.all(this.wallets.map(w => w.fetchBalance()));
  }

  fetchWalletUtxos() {
    return Promise.all(this.wallets.map(w => w.fetchUtxos()));
  }
  /**
   * Fetches from remote endpoint all transactions for each wallet.
   * Returns void.
   * To access transactions - get them from each respective wallet.
   * If index is present then fetch only from this specific wallet.
   *
   * @param index {Integer=} Index of the wallet in this.wallets array,
   *                        blank to fetch from all wallets
   * @return {Promise.<void>}
   */
  fetchWalletTransactions() {
    return Promise.all(this.wallets.map(w => w.fetchTransactions()));
  }
  getAuthenticators() {
    return this.authenticators || [];
  }

  removeAuthenticatorById(id) {
    let authenticator = null;
    this.authenticators = this.authenticators.filter(a => {
      if (a.id === id) {
        authenticator = a;
        return false;
      }
      return true;
    });
    if (authenticator === null) {
      throw new Error(`Couldn't find authenticator with id: ${id}`);
    }
    return authenticator;
  }

  removeWalletById(id) {
    let wallet = null;
    this.wallets = this.wallets.filter(w => {
      if (w.id === id) {
        wallet = w;
        return false;
      }
      return true;
    });
    if (wallet === null) {
      throw new Error(`Couldn't find wallet with id: ${id}`);
    }
    return wallet;
  }
  /**
   *
   * @returns {Array.<AbstractWallet>}
   */
  getWallets() {
    return this.wallets;
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
