import { AsyncStorage } from 'react-native';
import {
  HDLegacyBreadwalletWallet,
  HDSegwitP2SHWallet,
  HDLegacyP2PKHWallet,
  WatchOnlyWallet,
  LegacyWallet,
  SegwitP2SHWallet,
  SegwitBech32Wallet,
} from './';
import { LightningCustodianWallet } from './lightning-custodian-wallet';
let encryption = require('../encryption');

export class AppStorage {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static LANG = 'lang';
  static EXCHANGE_RATES = 'currency';
  static LNDHUB = 'lndhub';
  static PREFERRED_CURRENCY = 'preferredCurrency';

  constructor() {
    /** {Array.<AbstractWallet>} */
    this.wallets = [];
    this.tx_metadata = {};
    this.cachedPassword = false;
    this.settings = {
      brandingColor: '#ffffff',
      foregroundColor: '#0c2550',
      buttonBackground: '#ffffff',
      buttonTextColor: '#0c2550',
    };
  }

  async storageIsEncrypted() {
    // await AsyncStorage.clear();
    let data;
    try {
      data = await AsyncStorage.getItem(AppStorage.FLAG_ENCRYPTED);
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
    for (let value of data) {
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

  async encryptStorage(password) {
    // assuming the storage is not yet encrypted
    await this.saveToDisk();
    let data = await AsyncStorage.getItem('data');
    // TODO: refactor ^^^ (should not save & load to fetch data)

    let encrypted = encryption.encrypt(data, password);
    data = [];
    data.push(encrypted); // putting in array as we might have many buckets with storages
    data = JSON.stringify(data);
    this.cachedPassword = password;
    await AsyncStorage.setItem('data', data);
    await AsyncStorage.setItem(AppStorage.FLAG_ENCRYPTED, '1');
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

    let data = {
      wallets: [],
      tx_metadata: {},
    };

    let buckets = await AsyncStorage.getItem('data');
    buckets = JSON.parse(buckets);
    buckets.push(encryption.encrypt(JSON.stringify(data), fakePassword));
    this.cachedPassword = fakePassword;

    return AsyncStorage.setItem('data', JSON.stringify(buckets));
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
      let data = await AsyncStorage.getItem('data');
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
        let wallets = data.wallets;
        for (let key of wallets) {
          // deciding which type is wallet and instatiating correct object
          let tempObj = JSON.parse(key);
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
              break;
            case HDLegacyP2PKHWallet.type:
              unserializedWallet = HDLegacyP2PKHWallet.fromJson(key);
              break;
            case HDSegwitP2SHWallet.type:
              unserializedWallet = HDSegwitP2SHWallet.fromJson(key);
              break;
            case HDLegacyBreadwalletWallet.type:
              unserializedWallet = HDLegacyBreadwalletWallet.fromJson(key);
              break;
            case LightningCustodianWallet.type:
              /** @type {LightningCustodianWallet} */
              unserializedWallet = LightningCustodianWallet.fromJson(key);
              let lndhub = false;
              try {
                lndhub = await AsyncStorage.getItem(AppStorage.LNDHUB);
              } catch (Error) {
                console.warn(Error);
              }
              if (lndhub) {
                console.log('using', lndhub, 'for lndhub wallet');
                unserializedWallet.setBaseURI(lndhub);
              } else {
                unserializedWallet.setBaseURI();
                console.log('using default uri for for lndhub wallet:', unserializedWallet.baseURI);
              }
              unserializedWallet.init();
              break;
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
        return true;
      } else {
        return false; // failed loading data or loading/decryptin data
      }
    } catch (error) {
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
    let secret = wallet.getSecret();
    let tempWallets = [];
    for (let value of this.wallets) {
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
   * @returns {Promise} Result of AsyncStorage save
   */
  async saveToDisk() {
    let walletsToSave = [];
    for (let key of this.wallets) {
      if (typeof key === 'boolean') continue;
      walletsToSave.push(JSON.stringify({ ...key, type: key.type }));
    }

    let data = {
      wallets: walletsToSave,
      tx_metadata: this.tx_metadata,
    };

    if (this.cachedPassword) {
      // should find the correct bucket, encrypt and then save
      let buckets = await AsyncStorage.getItem('data');
      buckets = JSON.parse(buckets);
      let newData = [];
      for (let bucket of buckets) {
        let decrypted = encryption.decrypt(bucket, this.cachedPassword);
        if (!decrypted) {
          // no luck decrypting, its not our bucket
          newData.push(bucket);
        } else {
          // decrypted ok, this is our bucket
          // we serialize our object's data, encrypt it, and add it to buckets
          newData.push(encryption.encrypt(JSON.stringify(data), this.cachedPassword));
          await AsyncStorage.setItem(AppStorage.FLAG_ENCRYPTED, '1');
        }
      }
      data = newData;
    } else {
      await AsyncStorage.setItem(AppStorage.FLAG_ENCRYPTED, ''); // drop the flag
    }

    return AsyncStorage.setItem('data', JSON.stringify(data));
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
    console.log('fetchWalletBalances for wallet#', index);
    if (index || index === 0) {
      let c = 0;
      for (let wallet of this.wallets) {
        if (c++ === index) {
          await wallet.fetchBalance();
        }
      }
    } else {
      for (let wallet of this.wallets) {
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
    console.log('fetchWalletTransactions for wallet#', index);
    if (index || index === 0) {
      let c = 0;
      for (let wallet of this.wallets) {
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
      for (let wallet of this.wallets) {
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
   * @param index {Integer} Wallet index in this.wallets. Empty for all wallets.
   * @return {Array}
   */
  getTransactions(index) {
    if (index || index === 0) {
      let txs = [];
      let c = 0;
      for (let wallet of this.wallets) {
        if (c++ === index) {
          txs = txs.concat(wallet.getTransactions());
        }
      }
      return txs;
    }

    let txs = [];
    for (let wallet of this.wallets) {
      let walletTransactions = wallet.getTransactions();
      for (let t of walletTransactions) {
        t.walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
      }
      txs = txs.concat(walletTransactions);
    }

    for (let t of txs) {
      t.sort_ts = +new Date(t.received);
    }

    return txs.sort(function(a, b) {
      return b.sort_ts - a.sort_ts;
    });
  }

  /**
   * Getter for a sum of all balances of all wallets
   *
   * @return {number}
   */
  getBalance() {
    let finalBalance = 0;
    for (let wal of this.wallets) {
      finalBalance += wal.balance;
    }
    return finalBalance;
  }
}
