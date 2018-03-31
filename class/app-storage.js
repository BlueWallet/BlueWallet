import { AsyncStorage } from 'react-native';
import { LegacyWallet, SegwitP2SHWallet, SegwitBech32Wallet } from './';
let encryption = require('../encryption');

export class AppStorage {
  static FLAG_ENCRYPTED = 'data_encrypted';

  constructor() {
    /** {Array.<AbstractWallet>} */
    this.wallets = [];
    this.tx_metadata = {};
    this.cachedPassword = false;
    this.settings = {
      brandingColor: '#00aced',
      buttonBackground: '#00aced',
      buttonDangedBackground: '#F40349',
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
    await AsyncStorage.setItem('data', data);
    await AsyncStorage.setItem(AppStorage.FLAG_ENCRYPTED, '1');
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
        this.cachedPassword = password;
        data = this.decryptData(data, password);
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
        }
      }
      data = newData;
    }

    return AsyncStorage.setItem('data', JSON.stringify(data));
  }

  async fetchWalletBalances() {
    // console.warn('app - fetchWalletBalances()')
    for (let wallet of this.wallets) {
      await wallet.fetchBalance();
    }
  }

  async fetchWalletTransactions() {
    // console.warn('app - fetchWalletTransactions()')
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

  getBalance() {
    let finalBalance = 0;
    for (let wal of this.wallets) {
      finalBalance += wal.balance;
    }
    return finalBalance;
  }
}
