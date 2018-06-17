import { AsyncStorage } from 'react-native';
import { LegacyWallet, SegwitP2SHWallet, SegwitBech32Wallet } from './';
let encryption = require('../encryption');

export class AppStorage {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static LANG = 'lang';

  constructor() {
    /** {Array.<AbstractWallet>} */
    this.wallets = [];
    this.tx_metadata = {};
    this.cachedPassword = false;
    this.settings = {
      brandingColor: '#008dc2',
      foregroundColor: '#ffffff',
      buttonBackground: '#008dc2',
    };
  }

  async storageIsEncrypted() {
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
            case 'segwitBech32':
              unserializedWallet = SegwitBech32Wallet.fromJson(key);
              break;
            case 'segwitP2SH':
              unserializedWallet = SegwitP2SHWallet.fromJson(key);
              break;
            case 'legacy':
            default:
              unserializedWallet = LegacyWallet.fromJson(key);
              break;
          }
          // done
          this.wallets.push(unserializedWallet);
          this.tx_metadata = data.tx_metadata;
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
   * @returns Result of AsyncStorage save
   */
  async saveToDisk() {
    let walletsToSave = [];
    for (let key of this.wallets) {
      walletsToSave.push(JSON.stringify(key));
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
          newData.push(
            encryption.encrypt(JSON.stringify(data), this.cachedPassword),
          );
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
   *
   * @return {Promise.<void>}
   */
  async fetchWalletBalances() {
    for (let wallet of this.wallets) {
      await wallet.fetchBalance();
    }
  }

  /**
   * Fetches from remote endpoint all transactions for each wallet.
   * Returns void.
   * To access transactions - get them from each respective wallet.
   *
   * @return {Promise.<void>}
   */
  async fetchWalletTransactions() {
    for (let wallet of this.wallets) {
      await wallet.fetchTransactions();
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
   * Getter for all transactions in all wallets
   *
   * @return {Array}
   */
  getTransactions() {
    let txs = [];
    for (let wallet of this.wallets) {
      txs = txs.concat(wallet.transactions);
    }
    return txs;
  }

  saveWallets() {}

  listTXs() {}

  listUnconfirmed() {}

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
