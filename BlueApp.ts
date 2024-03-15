import AsyncStorage from '@react-native-async-storage/async-storage';
import createHash from 'create-hash';
import { Platform } from 'react-native';
import DefaultPreference from 'react-native-default-preference';
import * as Keychain from 'react-native-keychain';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import Realm from 'realm';

import BlueElectrum from './blue_modules/BlueElectrum';
import { initCurrencyDaemon } from './blue_modules/currency';
import {
  HDAezeedWallet,
  HDLegacyBreadwalletWallet,
  HDLegacyElectrumSeedP2PKHWallet,
  HDLegacyP2PKHWallet,
  HDSegwitBech32Wallet,
  HDSegwitElectrumSeedP2WPKHWallet,
  HDSegwitP2SHWallet,
  LegacyWallet,
  LightningCustodianWallet,
  LightningLdkWallet,
  MultisigHDWallet,
  SLIP39LegacyP2PKHWallet,
  SLIP39SegwitBech32Wallet,
  SLIP39SegwitP2SHWallet,
  SegwitBech32Wallet,
  SegwitP2SHWallet,
  WatchOnlyWallet,
} from './class/';
import Biometric from './class/biometrics';
import { randomBytes } from './class/rng';
import { TWallet, Transaction } from './class/wallets/types';
import presentAlert from './components/Alert';
import loc from './loc';

const prompt = require('./helpers/prompt');
const encryption = require('./blue_modules/encryption');

let usedBucketNum: boolean | number = false;
let savingInProgress = 0; // its both a flag and a counter of attempts to write to disk
BlueElectrum.connectMain();

export type TTXMetadata = {
  [txid: string]: {
    memo?: string;
    txhex?: string;
  };
};

type TRealmTransaction = {
  internal: boolean;
  index: number;
  tx: string;
};

const isReactNative = typeof navigator !== 'undefined' && navigator?.product === 'ReactNative';

export class AppStorage {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static LNDHUB = 'lndhub';
  static ADVANCED_MODE_ENABLED = 'advancedmodeenabled';
  static DO_NOT_TRACK = 'donottrack';
  static HANDOFF_STORAGE_KEY = 'HandOff';

  static keys2migrate = [AppStorage.HANDOFF_STORAGE_KEY, AppStorage.DO_NOT_TRACK, AppStorage.ADVANCED_MODE_ENABLED];

  public cachedPassword?: false | string;
  public tx_metadata: TTXMetadata;
  public wallets: TWallet[];

  constructor() {
    this.wallets = [];
    this.tx_metadata = {};
    this.cachedPassword = false;
  }

  async migrateKeys() {
    // do not migrate keys if we are not in RN env
    if (!isReactNative) {
      return;
    }

    for (const key of AppStorage.keys2migrate) {
      try {
        const value = await RNSecureKeyStore.get(key);
        if (value) {
          await AsyncStorage.setItem(key, value);
          await RNSecureKeyStore.remove(key);
        }
      } catch (_) {}
    }
  }

  /**
   * Wrapper for storage call. Secure store works only in RN environment. AsyncStorage is
   * used for cli/tests
   */
  setItem = (key: string, value: any): Promise<any> => {
    if (isReactNative) {
      return RNSecureKeyStore.set(key, value, { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    } else {
      return AsyncStorage.setItem(key, value);
    }
  };

  /**
   * Wrapper for storage call. Secure store works only in RN environment. AsyncStorage is
   * used for cli/tests
   */
  getItem = (key: string): Promise<any> => {
    if (isReactNative) {
      return RNSecureKeyStore.get(key);
    } else {
      return AsyncStorage.getItem(key);
    }
  };

  getItemWithFallbackToRealm = async (key: string): Promise<any | null> => {
    let value;
    try {
      return await this.getItem(key);
    } catch (error: any) {
      console.warn('error reading', key, error.message);
      console.warn('fallback to realm');
      const realmKeyValue = await this.openRealmKeyValue();
      const obj = realmKeyValue.objectForPrimaryKey('KeyValue', key); // search for a realm object with a primary key
      value = obj?.value;
      realmKeyValue.close();
      if (value) {
        // @ts-ignore value.length
        console.warn('successfully recovered', value.length, 'bytes from realm for key', key);
        return value;
      }
      return null;
    }
  };

  storageIsEncrypted = async (): Promise<boolean> => {
    let data;
    try {
      data = await this.getItemWithFallbackToRealm(AppStorage.FLAG_ENCRYPTED);
    } catch (error: any) {
      console.warn('error reading `' + AppStorage.FLAG_ENCRYPTED + '` key:', error.message);
      return false;
    }

    return Boolean(data);
  };

  isPasswordInUse = async (password: string) => {
    try {
      let data = await this.getItem('data');
      data = this.decryptData(data, password);
      return Boolean(data);
    } catch (_e) {
      return false;
    }
  };

  /**
   * Iterates through all values of `data` trying to
   * decrypt each one, and returns first one successfully decrypted
   */
  decryptData(data: string, password: string): boolean | string {
    data = JSON.parse(data);
    let decrypted;
    let num = 0;
    for (const value of data) {
      decrypted = encryption.decrypt(value, password);

      if (decrypted) {
        usedBucketNum = num;
        return decrypted;
      }
      num++;
    }

    return false;
  }

  decryptStorage = async (password: string): Promise<boolean> => {
    if (password === this.cachedPassword) {
      this.cachedPassword = undefined; // maybe reset to false ?
      await this.saveToDisk();
      this.wallets = [];
      this.tx_metadata = {};
      return this.loadFromDisk();
    } else {
      throw new Error('Incorrect password. Please, try again.');
    }
  };

  encryptStorage = async (password: string): Promise<void> => {
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
  };

  /**
   * Cleans up all current application data (wallets, tx metadata etc)
   * Encrypts the bucket and saves it storage
   */
  createFakeStorage = async (fakePassword: string): Promise<boolean> => {
    usedBucketNum = false; // resetting currently used bucket so we wont overwrite it
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
  };

  hashIt = (s: string): string => {
    return createHash('sha256').update(s).digest().toString('hex');
  };

  /**
   * Returns instace of the Realm database, which is encrypted either by cached user's password OR default password.
   * Database file is deterministically derived from encryption key.
   */
  async getRealm() {
    const password = this.hashIt(this.cachedPassword || 'fyegjitkyf[eqjnc.lf');
    const buf = Buffer.from(this.hashIt(password) + this.hashIt(password), 'hex');
    const encryptionKey = Int8Array.from(buf);
    const path = this.hashIt(this.hashIt(password)) + '-wallettransactions.realm';

    const schema = [
      {
        name: 'WalletTransactions',
        properties: {
          walletid: { type: 'string', indexed: true },
          internal: 'bool?', // true - internal, false - external
          index: 'int?',
          tx: 'string', // stringified json
        },
      },
    ];
    // @ts-ignore schema doesn't match Realm's schema type
    return Realm.open({
      // @ts-ignore schema doesn't match Realm's schema type
      schema,
      path,
      encryptionKey,
    });
  }

  /**
   * Returns instace of the Realm database, which is encrypted by device unique id
   * Database file is static.
   *
   * @returns {Promise<Realm>}
   */
  async openRealmKeyValue(): Promise<Realm> {
    const service = 'realm_encryption_key';
    let password;
    const credentials = await Keychain.getGenericPassword({ service });
    if (credentials) {
      password = credentials.password;
    } else {
      const buf = await randomBytes(64);
      password = buf.toString('hex');
      await Keychain.setGenericPassword(service, password, { service });
    }

    const buf = Buffer.from(password, 'hex');
    const encryptionKey = Int8Array.from(buf);
    const path = 'keyvalue.realm';

    const schema = [
      {
        name: 'KeyValue',
        primaryKey: 'key',
        properties: {
          key: { type: 'string', indexed: true },
          value: 'string', // stringified json, or whatever
        },
      },
    ];
    // @ts-ignore schema doesn't match Realm's schema type
    return Realm.open({
      // @ts-ignore schema doesn't match Realm's schema type
      schema,
      path,
      encryptionKey,
    });
  }

  saveToRealmKeyValue(realmkeyValue: Realm, key: string, value: any) {
    realmkeyValue.write(() => {
      realmkeyValue.create(
        'KeyValue',
        {
          key,
          value,
        },
        Realm.UpdateMode.Modified,
      );
    });
  }

  /**
   * Loads from storage all wallets and
   * maps them to `this.wallets`
   *
   * @param password If present means storage must be decrypted before usage
   * @returns {Promise.<boolean>}
   */
  async loadFromDisk(password?: string): Promise<boolean> {
    let data = await this.getItemWithFallbackToRealm('data');
    if (password) {
      data = this.decryptData(data, password);
      if (data) {
        // password is good, cache it
        this.cachedPassword = password;
      }
    }
    if (data !== null) {
      let realm;
      try {
        realm = await this.getRealm();
      } catch (error: any) {
        presentAlert({ message: error.message });
      }
      data = JSON.parse(data);
      if (!data.wallets) return false;
      const wallets = data.wallets;
      for (const key of wallets) {
        // deciding which type is wallet and instatiating correct object
        const tempObj = JSON.parse(key);
        let unserializedWallet: TWallet;
        switch (tempObj.type) {
          case SegwitBech32Wallet.type:
            unserializedWallet = SegwitBech32Wallet.fromJson(key) as unknown as SegwitBech32Wallet;
            break;
          case SegwitP2SHWallet.type:
            unserializedWallet = SegwitP2SHWallet.fromJson(key) as unknown as SegwitP2SHWallet;
            break;
          case WatchOnlyWallet.type:
            unserializedWallet = WatchOnlyWallet.fromJson(key) as unknown as WatchOnlyWallet;
            unserializedWallet.init();
            if (unserializedWallet.isHd() && !unserializedWallet.isXpubValid()) {
              continue;
            }
            break;
          case HDLegacyP2PKHWallet.type:
            unserializedWallet = HDLegacyP2PKHWallet.fromJson(key) as unknown as HDLegacyP2PKHWallet;
            break;
          case HDSegwitP2SHWallet.type:
            unserializedWallet = HDSegwitP2SHWallet.fromJson(key) as unknown as HDSegwitP2SHWallet;
            break;
          case HDSegwitBech32Wallet.type:
            unserializedWallet = HDSegwitBech32Wallet.fromJson(key) as unknown as HDSegwitBech32Wallet;
            break;
          case HDLegacyBreadwalletWallet.type:
            unserializedWallet = HDLegacyBreadwalletWallet.fromJson(key) as unknown as HDLegacyBreadwalletWallet;
            break;
          case HDLegacyElectrumSeedP2PKHWallet.type:
            unserializedWallet = HDLegacyElectrumSeedP2PKHWallet.fromJson(key) as unknown as HDLegacyElectrumSeedP2PKHWallet;
            break;
          case HDSegwitElectrumSeedP2WPKHWallet.type:
            unserializedWallet = HDSegwitElectrumSeedP2WPKHWallet.fromJson(key) as unknown as HDSegwitElectrumSeedP2WPKHWallet;
            break;
          case MultisigHDWallet.type:
            unserializedWallet = MultisigHDWallet.fromJson(key) as unknown as MultisigHDWallet;
            break;
          case HDAezeedWallet.type:
            unserializedWallet = HDAezeedWallet.fromJson(key) as unknown as HDAezeedWallet;
            // migrate password to this.passphrase field
            // remove this code somewhere in year 2022
            if (unserializedWallet.secret.includes(':')) {
              const [mnemonic, passphrase] = unserializedWallet.secret.split(':');
              unserializedWallet.secret = mnemonic;
              unserializedWallet.passphrase = passphrase;
            }

            break;
          case LightningLdkWallet.type:
            unserializedWallet = LightningLdkWallet.fromJson(key) as unknown as LightningLdkWallet;
            break;
          case SLIP39SegwitP2SHWallet.type:
            unserializedWallet = SLIP39SegwitP2SHWallet.fromJson(key) as unknown as SLIP39SegwitP2SHWallet;
            break;
          case SLIP39LegacyP2PKHWallet.type:
            unserializedWallet = SLIP39LegacyP2PKHWallet.fromJson(key) as unknown as SLIP39LegacyP2PKHWallet;
            break;
          case SLIP39SegwitBech32Wallet.type:
            unserializedWallet = SLIP39SegwitBech32Wallet.fromJson(key) as unknown as SLIP39SegwitBech32Wallet;
            break;
          case LightningCustodianWallet.type: {
            unserializedWallet = LightningCustodianWallet.fromJson(key) as unknown as LightningCustodianWallet;
            let lndhub: false | any = false;
            try {
              lndhub = await AsyncStorage.getItem(AppStorage.LNDHUB);
            } catch (error) {
              console.warn(error);
            }

            if (unserializedWallet.baseURI) {
              unserializedWallet.setBaseURI(unserializedWallet.baseURI); // not really necessary, just for the sake of readability
              console.log('using saved uri for for ln wallet:', unserializedWallet.baseURI);
            } else if (lndhub) {
              console.log('using wallet-wide settings ', lndhub, 'for ln wallet');
              unserializedWallet.setBaseURI(lndhub);
            } else {
              console.log('wallet does not have a baseURI. Continuing init...');
            }
            unserializedWallet.init();
            break;
          }
          case LegacyWallet.type:
          default:
            unserializedWallet = LegacyWallet.fromJson(key) as unknown as LegacyWallet;
            break;
        }

        try {
          if (realm) this.inflateWalletFromRealm(realm, unserializedWallet);
        } catch (error: any) {
          presentAlert({ message: error.message });
        }

        // done
        const ID = unserializedWallet.getID();
        if (!this.wallets.some(wallet => wallet.getID() === ID)) {
          this.wallets.push(unserializedWallet);
          this.tx_metadata = data.tx_metadata;
        }
      }
      if (realm) realm.close();
      return true;
    } else {
      return false; // failed loading data or loading/decryptin data
    }
  }

  /**
   * Lookup wallet in list by it's secret and
   * remove it from `this.wallets`
   *
   * @param wallet {AbstractWallet}
   */
  deleteWallet = (wallet: TWallet): void => {
    const ID = wallet.getID();
    const tempWallets = [];

    if (wallet.type === LightningLdkWallet.type) {
      const ldkwallet = wallet;
      ldkwallet.stop().then(ldkwallet.purgeLocalStorage).catch(alert);
    }

    for (const value of this.wallets) {
      if (value.getID() === ID) {
        // the one we should delete
        // nop
      } else {
        // the one we must keep
        tempWallets.push(value);
      }
    }
    this.wallets = tempWallets;
  };

  inflateWalletFromRealm(realm: Realm, walletToInflate: TWallet) {
    const transactions = realm.objects('WalletTransactions');
    const transactionsForWallet = transactions.filtered(`walletid = "${walletToInflate.getID()}"`) as unknown as TRealmTransaction[];
    for (const tx of transactionsForWallet) {
      if (tx.internal === false) {
        if ('_hdWalletInstance' in walletToInflate && walletToInflate._hdWalletInstance) {
          const hd = walletToInflate._hdWalletInstance;
          hd._txs_by_external_index[tx.index] = hd._txs_by_external_index[tx.index] || [];
          const transaction = JSON.parse(tx.tx);
          hd._txs_by_external_index[tx.index].push(transaction);
        } else {
          walletToInflate._txs_by_external_index[tx.index] = walletToInflate._txs_by_external_index[tx.index] || [];
          const transaction = JSON.parse(tx.tx);
          (walletToInflate._txs_by_external_index[tx.index] as Transaction[]).push(transaction);
        }
      } else if (tx.internal === true) {
        if ('_hdWalletInstance' in walletToInflate && walletToInflate._hdWalletInstance) {
          const hd = walletToInflate._hdWalletInstance;
          hd._txs_by_internal_index[tx.index] = hd._txs_by_internal_index[tx.index] || [];
          const transaction = JSON.parse(tx.tx);
          hd._txs_by_internal_index[tx.index].push(transaction);
        } else {
          walletToInflate._txs_by_internal_index[tx.index] = walletToInflate._txs_by_internal_index[tx.index] || [];
          const transaction = JSON.parse(tx.tx);
          (walletToInflate._txs_by_internal_index[tx.index] as Transaction[]).push(transaction);
        }
      } else {
        if (!Array.isArray(walletToInflate._txs_by_external_index)) walletToInflate._txs_by_external_index = [];
        walletToInflate._txs_by_external_index = walletToInflate._txs_by_external_index || [];
        const transaction = JSON.parse(tx.tx);
        (walletToInflate._txs_by_external_index as Transaction[]).push(transaction);
      }
    }
  }

  offloadWalletToRealm(realm: Realm, wallet: TWallet): void {
    const id = wallet.getID();
    const walletToSave = ('_hdWalletInstance' in wallet && wallet._hdWalletInstance) || wallet;

    if (Array.isArray(walletToSave._txs_by_external_index)) {
      // if this var is an array that means its a single-address wallet class, and this var is a flat array
      // with transactions
      realm.write(() => {
        // cleanup all existing transactions for the wallet first
        const walletTransactionsToDelete = realm.objects('WalletTransactions').filtered(`walletid = '${id}'`);
        realm.delete(walletTransactionsToDelete);

        // @ts-ignore walletToSave._txs_by_external_index is array
        for (const tx of walletToSave._txs_by_external_index) {
          realm.create(
            'WalletTransactions',
            {
              walletid: id,
              tx: JSON.stringify(tx),
            },
            Realm.UpdateMode.Modified,
          );
        }
      });

      return;
    }

    /// ########################################################################################################

    if (walletToSave._txs_by_external_index) {
      realm.write(() => {
        // cleanup all existing transactions for the wallet first
        const walletTransactionsToDelete = realm.objects('WalletTransactions').filtered(`walletid = '${id}'`);
        realm.delete(walletTransactionsToDelete);

        // insert new ones:
        for (const index of Object.keys(walletToSave._txs_by_external_index)) {
          // @ts-ignore index is number
          const txs = walletToSave._txs_by_external_index[index];
          for (const tx of txs) {
            realm.create(
              'WalletTransactions',
              {
                walletid: id,
                internal: false,
                index: parseInt(index, 10),
                tx: JSON.stringify(tx),
              },
              Realm.UpdateMode.Modified,
            );
          }
        }

        for (const index of Object.keys(walletToSave._txs_by_internal_index)) {
          // @ts-ignore index is number
          const txs = walletToSave._txs_by_internal_index[index];
          for (const tx of txs) {
            realm.create(
              'WalletTransactions',
              {
                walletid: id,
                internal: true,
                index: parseInt(index, 10),
                tx: JSON.stringify(tx),
              },
              Realm.UpdateMode.Modified,
            );
          }
        }
      });
    }
  }

  /**
   * Serializes and saves to storage object data.
   * If cached password is saved - finds the correct bucket
   * to save to, encrypts and then saves.
   *
   * @returns {Promise} Result of storage save
   */
  async saveToDisk(): Promise<void> {
    if (savingInProgress) {
      console.warn('saveToDisk is in progress');
      if (++savingInProgress > 10) presentAlert({ message: 'Critical error. Last actions were not saved' }); // should never happen
      await new Promise(resolve => setTimeout(resolve, 1000 * savingInProgress)); // sleep
      return this.saveToDisk();
    }
    savingInProgress = 1;

    try {
      const walletsToSave = [];
      let realm;
      try {
        realm = await this.getRealm();
      } catch (error: any) {
        presentAlert({ message: error.message });
      }
      for (const key of this.wallets) {
        if (typeof key === 'boolean') continue;
        key.prepareForSerialization();
        // @ts-ignore wtf is wallet.current? Does it even exist?
        delete key.current;
        const keyCloned = Object.assign({}, key); // stripped-down version of a wallet to save to secure keystore
        if ('_hdWalletInstance' in key) {
          const k = keyCloned as any & WatchOnlyWallet;
          k._hdWalletInstance = Object.assign({}, key._hdWalletInstance);
          k._hdWalletInstance._txs_by_external_index = {};
          k._hdWalletInstance._txs_by_internal_index = {};
        }
        if (realm) this.offloadWalletToRealm(realm, key);
        // stripping down:
        if (key._txs_by_external_index) {
          keyCloned._txs_by_external_index = {};
          keyCloned._txs_by_internal_index = {};
        }

        if ('_bip47_instance' in keyCloned) {
          delete keyCloned._bip47_instance; // since it wont be restored into a proper class instance
        }

        walletsToSave.push(JSON.stringify({ ...keyCloned, type: keyCloned.type }));
      }
      if (realm) realm.close();
      let data = {
        wallets: walletsToSave,
        tx_metadata: this.tx_metadata,
      };

      if (this.cachedPassword) {
        // should find the correct bucket, encrypt and then save
        let buckets = await this.getItemWithFallbackToRealm('data');
        buckets = JSON.parse(buckets);
        const newData = [];
        let num = 0;
        for (const bucket of buckets) {
          let decrypted;
          // if we had `usedBucketNum` during loadFromDisk(), no point to try to decode each bucket to find the one we
          // need, we just to find bucket with the same index
          if (usedBucketNum !== false) {
            if (num === usedBucketNum) {
              decrypted = true;
            }
            num++;
          } else {
            // we dont have `usedBucketNum` for whatever reason, so lets try to decrypt each bucket after bucket
            // till we find the right one
            decrypted = encryption.decrypt(bucket, this.cachedPassword);
          }

          if (!decrypted) {
            // no luck decrypting, its not our bucket
            newData.push(bucket);
          } else {
            // decrypted ok, this is our bucket
            // we serialize our object's data, encrypt it, and add it to buckets
            newData.push(encryption.encrypt(JSON.stringify(data), this.cachedPassword));
          }
        }
        // @ts-ignore bla bla bla
        data = newData;
      }

      await this.setItem('data', JSON.stringify(data));
      await this.setItem(AppStorage.FLAG_ENCRYPTED, this.cachedPassword ? '1' : '');

      // now, backing up same data in realm:
      const realmkeyValue = await this.openRealmKeyValue();
      this.saveToRealmKeyValue(realmkeyValue, 'data', JSON.stringify(data));
      this.saveToRealmKeyValue(realmkeyValue, AppStorage.FLAG_ENCRYPTED, this.cachedPassword ? '1' : '');
      realmkeyValue.close();
    } catch (error: any) {
      console.error('save to disk exception:', error.message);
      presentAlert({ message: 'save to disk exception: ' + error.message });
      if (error.message.includes('Realm file decryption failed')) {
        console.warn('purging realm key-value database file');
        this.purgeRealmKeyValueFile();
      }
    } finally {
      savingInProgress = 0;
    }
  }

  /**
   * For each wallet, fetches balance from remote endpoint.
   * Use getter for a specific wallet to get actual balance.
   * Returns void.
   * If index is present then fetch only from this specific wallet
   */
  fetchWalletBalances = async (index?: number): Promise<void> => {
    console.log('fetchWalletBalances for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          await wallet.fetchBalance();
        }
      }
    } else {
      for (const wallet of this.wallets) {
        console.log('fetching balance for', wallet.getLabel());
        await wallet.fetchBalance();
      }
    }
  };

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
  fetchWalletTransactions = async (index?: number) => {
    console.log('fetchWalletTransactions for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          await wallet.fetchTransactions();

          if ('fetchPendingTransactions' in wallet) {
            await wallet.fetchPendingTransactions();
            await wallet.fetchUserInvoices();
          }
        }
      }
    } else {
      for (const wallet of this.wallets) {
        await wallet.fetchTransactions();
        if ('fetchPendingTransactions' in wallet) {
          await wallet.fetchPendingTransactions();
          await wallet.fetchUserInvoices();
        }
      }
    }
  };

  fetchSenderPaymentCodes = async (index?: number) => {
    console.log('fetchSenderPaymentCodes for wallet#', typeof index === 'undefined' ? '(all)' : index);
    if (index || index === 0) {
      const wallet = this.wallets[index];
      try {
        if (!(wallet.allowBIP47() && wallet.isBIP47Enabled() && 'fetchBIP47SenderPaymentCodes' in wallet)) return;
        await wallet.fetchBIP47SenderPaymentCodes();
      } catch (error) {
        console.error('Failed to fetch sender payment codes for wallet', index, error);
      }
    } else {
      for (const wallet of this.wallets) {
        try {
          if (!(wallet.allowBIP47() && wallet.isBIP47Enabled() && 'fetchBIP47SenderPaymentCodes' in wallet)) continue;
          await wallet.fetchBIP47SenderPaymentCodes();
        } catch (error) {
          console.error('Failed to fetch sender payment codes for wallet', wallet.label, error);
        }
      }
    }
  };

  getWallets = (): TWallet[] => {
    return this.wallets;
  };

  /**
   * Getter for all transactions in all wallets.
   * But if index is provided - only for wallet with corresponding index
   *
   * @param index {Integer|null} Wallet index in this.wallets. Empty (or null) for all wallets.
   * @param limit {Integer} How many txs return, starting from the earliest. Default: all of them.
   * @param includeWalletsWithHideTransactionsEnabled {Boolean} Wallets' _hideTransactionsInWalletsList property determines wether the user wants this wallet's txs hidden from the main list view.
   */
  getTransactions = (
    index?: number,
    limit: number = Infinity,
    includeWalletsWithHideTransactionsEnabled: boolean = false,
  ): Transaction[] => {
    if (index || index === 0) {
      let txs: Transaction[] = [];
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          txs = txs.concat(wallet.getTransactions());
        }
      }
      return txs;
    }

    let txs: Transaction[] = [];
    for (const wallet of this.wallets.filter(w => includeWalletsWithHideTransactionsEnabled || !w.getHideTransactionsInWalletsList())) {
      const walletTransactions = wallet.getTransactions();
      const walletID = wallet.getID();
      for (const t of walletTransactions) {
        t.walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
        t.walletID = walletID;
      }
      txs = txs.concat(walletTransactions);
    }

    return txs
      .sort((a, b) => {
        const bTime = new Date(b.received!).getTime();
        const aTime = new Date(a.received!).getTime();
        return bTime - aTime;
      })
      .slice(0, limit);
  };

  /**
   * Getter for a sum of all balances of all wallets
   */
  getBalance = (): number => {
    let finalBalance = 0;
    for (const wal of this.wallets) {
      finalBalance += wal.getBalance();
    }
    return finalBalance;
  };

  isAdvancedModeEnabled = async (): Promise<boolean> => {
    try {
      return !!(await AsyncStorage.getItem(AppStorage.ADVANCED_MODE_ENABLED));
    } catch (_) {}
    return false;
  };

  setIsAdvancedModeEnabled = async (value: boolean) => {
    await AsyncStorage.setItem(AppStorage.ADVANCED_MODE_ENABLED, value ? '1' : '');
  };

  isHandoffEnabled = async (): Promise<boolean> => {
    try {
      return !!(await AsyncStorage.getItem(AppStorage.HANDOFF_STORAGE_KEY));
    } catch (_) {}
    return false;
  };

  setIsHandoffEnabled = async (value: boolean): Promise<void> => {
    await AsyncStorage.setItem(AppStorage.HANDOFF_STORAGE_KEY, value ? '1' : '');
  };

  isDoNotTrackEnabled = async (): Promise<boolean> => {
    try {
      return !!(await AsyncStorage.getItem(AppStorage.DO_NOT_TRACK));
    } catch (_) {}
    return false;
  };

  setDoNotTrack = async (value: string) => {
    await AsyncStorage.setItem(AppStorage.DO_NOT_TRACK, value ? '1' : '');
    await DefaultPreference.setName('group.io.bluewallet.bluewallet');
    await DefaultPreference.set(AppStorage.DO_NOT_TRACK, value ? '1' : '');
  };

  /**
   * Simple async sleeper function
   */
  sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  purgeRealmKeyValueFile() {
    const path = 'keyvalue.realm';
    return Realm.deleteFile({
      path,
    });
  }
}

const BlueApp = new AppStorage();
// If attempt reaches 10, a wipe keychain option will be provided to the user.
let unlockAttempt = 0;

export const startAndDecrypt = async (retry?: boolean): Promise<boolean> => {
  console.log('startAndDecrypt');
  if (BlueApp.getWallets().length > 0) {
    console.log('App already has some wallets, so we are in already started state, exiting startAndDecrypt');
    return true;
  }
  await BlueApp.migrateKeys();
  let password: undefined | string;
  if (await BlueApp.storageIsEncrypted()) {
    do {
      password = await prompt((retry && loc._.bad_password) || loc._.enter_password, loc._.storage_is_encrypted, false);
    } while (!password);
  }
  let success = false;
  let wasException = false;
  try {
    success = await BlueApp.loadFromDisk(password);
  } catch (error) {
    // in case of exception reading from keystore, lets retry instead of assuming there is no storage and
    // proceeding with no wallets
    console.warn('exception loading from disk:', error);
    wasException = true;
  }

  if (wasException) {
    // retrying, but only once
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // sleep
      success = await BlueApp.loadFromDisk(password);
    } catch (error) {
      console.warn('second exception loading from disk:', error);
    }
  }

  if (success) {
    console.log('loaded from disk');
    // We want to return true to let the UnlockWith screen that its ok to proceed.
    return true;
  }

  if (password) {
    // we had password and yet could not load/decrypt
    unlockAttempt++;
    if (unlockAttempt < 10 || Platform.OS !== 'ios') {
      return startAndDecrypt(true);
    } else {
      unlockAttempt = 0;
      Biometric.showKeychainWipeAlert();
      // We want to return false to let the UnlockWith screen that it is NOT ok to proceed.
      return false;
    }
  } else {
    unlockAttempt = 0;
    // Return true because there was no wallet data in keychain. Proceed.
    return true;
  }
};

initCurrencyDaemon();

export default BlueApp;
