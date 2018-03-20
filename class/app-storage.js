import { AsyncStorage } from 'react-native'

export class AppStorage {
  constructor() {
    /** {Array.<AbstractWallet>} */
    this.wallets = [];
    this.tx_metadata = {};
    this.settings = {
      brandingColor: '#00aced',
      buttonBackground: '#00aced',
      buttonDangedBackground: '#F40349',
    };
  }

  async loadFromDisk() {
    try {
      let data = await AsyncStorage.getItem('data');
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

  saveToDisk() {
    let walletsToSave = [];
    for (let key of this.wallets) {
      walletsToSave.push(JSON.stringify(key));
    }

    let data = {
      wallets: walletsToSave,
      tx_metadata: this.tx_metadata,
    };

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
