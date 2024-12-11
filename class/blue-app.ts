import AsyncStorage from '@react-native-async-storage/async-storage';
import createHash from 'create-hash';
import DefaultPreference from 'react-native-default-preference';
import RNFS from 'react-native-fs';
import Keychain from 'react-native-keychain';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import Realm from 'realm';

import * as encryption from '../blue_modules/encryption';
import presentAlert from '../components/Alert';
import { randomBytes } from './rng';
import { HDAezeedWallet } from './wallets/hd-aezeed-wallet';
import { HDLegacyBreadwalletWallet } from './wallets/hd-legacy-breadwallet-wallet';
import { HDLegacyElectrumSeedP2PKHWallet } from './wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { HDLegacyP2PKHWallet } from './wallets/hd-legacy-p2pkh-wallet';
import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { HDSegwitElectrumSeedP2WPKHWallet } from './wallets/hd-segwit-electrum-seed-p2wpkh-wallet';
import { HDSegwitP2SHWallet } from './wallets/hd-segwit-p2sh-wallet';
import { LegacyWallet } from './wallets/legacy-wallet';
import { LightningCustodianWallet } from './wallets/lightning-custodian-wallet';
import { MultisigHDWallet } from './wallets/multisig-hd-wallet';
import { SegwitBech32Wallet } from './wallets/segwit-bech32-wallet';
import { SegwitP2SHWallet } from './wallets/segwit-p2sh-wallet';
import { SLIP39LegacyP2PKHWallet, SLIP39SegwitBech32Wallet, SLIP39SegwitP2SHWallet } from './wallets/slip39-wallets';
import { ExtendedTransaction, Transaction, TWallet } from './wallets/types';
import { WatchOnlyWallet } from './wallets/watch-only-wallet';
import { getLNDHub } from '../helpers/lndHub';

let usedBucketNum: boolean | number = false;
let savingInProgress = 0; // its both a flag and a counter of attempts to write to disk

export type TTXMetadata = {
  [txid: string]: {
    memo?: string;
  };
};

export type TCounterpartyMetadata = {
  /**
   * our contact identifier, such as bip47 payment code
   */
  [counterparty: string]: {
    /**
     * custom human-readable name we assign ourselves
     */
    label: string;
    /**
     * some counterparties cannot be deleted because they sent a notif tx onchain, so we just mark them as hidden when user deletes
     */
    hidden?: boolean;
  };
};

type TRealmTransaction = {
  internal: boolean;
  index: number;
  tx: string;
};

type TBucketStorage = {
  wallets: string[]; // array of serialized wallets, not actual wallet objects
  tx_metadata: TTXMetadata;
  counterparty_metadata: TCounterpartyMetadata;
};

const isReactNative = typeof navigator !== 'undefined' && navigator?.product === 'ReactNative';

export class BlueApp {
  static FLAG_ENCRYPTED = 'data_encrypted';
  static LNDHUB = 'lndhub';
  static DO_NOT_TRACK = 'donottrack';
  static HANDOFF_STORAGE_KEY = 'HandOff';

  private static _instance: BlueApp | null = null;

  static keys2migrate = [BlueApp.HANDOFF_STORAGE_KEY, BlueApp.DO_NOT_TRACK];

  public cachedPassword?: false | string;
  public tx_metadata: TTXMetadata;
  public counterparty_metadata: TCounterpartyMetadata;
  public wallets: TWallet[];

  constructor() {
    this.wallets = [];
    this.tx_metadata = {};
    this.counterparty_metadata = {};
    this.cachedPassword = false;
  }

  static getInstance(): BlueApp {
    if (!BlueApp._instance) {
      BlueApp._instance = new BlueApp();
    }

    return BlueApp._instance;
  }

  async migrateKeys() {
    // do not migrate keys if we are not in RN env
    if (!isReactNative) {
      return;
    }

    for (const key of BlueApp.keys2migrate) {
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
      data = await this.getItemWithFallbackToRealm(BlueApp.FLAG_ENCRYPTED);
    } catch (error: any) {
      console.warn('error reading `' + BlueApp.FLAG_ENCRYPTED + '` key:', error.message);
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
      this.cachedPassword = undefined;
      await this.saveToDisk();
      this.wallets = [];
      this.tx_metadata = {};
      this.counterparty_metadata = {};
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
    await this.setItem(BlueApp.FLAG_ENCRYPTED, '1');
  };

  /**
   * Cleans up all current application data (wallets, tx metadata etc)
   * Encrypts the bucket and saves it storage
   */
  createFakeStorage = async (fakePassword: string): Promise<boolean> => {
    usedBucketNum = false; // resetting currently used bucket so we wont overwrite it
    this.wallets = [];
    this.tx_metadata = {};
    this.counterparty_metadata = {};

    const data: TBucketStorage = {
      wallets: [],
      tx_metadata: {},
      counterparty_metadata: {},
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
  async getRealmForTransactions() {
    const cacheFolderPath = RNFS.CachesDirectoryPath; // Path to cache folder
    const password = this.hashIt(this.cachedPassword || 'fyegjitkyf[eqjnc.lf');
    const buf = Buffer.from(this.hashIt(password) + this.hashIt(password), 'hex');
    const encryptionKey = Int8Array.from(buf);
    const fileName = this.hashIt(this.hashIt(password)) + '-wallettransactions.realm';
    const path = `${cacheFolderPath}/${fileName}`; // Use cache folder path

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
      excludeFromIcloudBackup: true,
    });
  }

  /**
   * Returns instace of the Realm database, which is encrypted by random bytes stored in keychain.
   * Database file is static.
   *
   * @returns {Promise<Realm>}
   */
  async openRealmKeyValue(): Promise<Realm> {
    const cacheFolderPath = RNFS.CachesDirectoryPath; // Path to cache folder
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
    const path = `${cacheFolderPath}/keyvalue.realm`; // Use cache folder path

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
      excludeFromIcloudBackup: true,
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
    // Wrap inside a try so if anything goes wrong it wont block loadFromDisk from continuing
    try {
      await this.moveRealmFilesToCacheDirectory();
    } catch (error: any) {
      console.warn('moveRealmFilesToCacheDirectory error:', error.message);
    }
    let dataRaw = await this.getItemWithFallbackToRealm('data');
    if (password) {
      dataRaw = this.decryptData(dataRaw, password);
      if (dataRaw) {
        // password is good, cache it
        this.cachedPassword = password;
      }
    }
    if (dataRaw !== null) {
      let realm;
      try {
        realm = await this.getRealmForTransactions();
      } catch (error: any) {
        presentAlert({ message: error.message });
      }
      const data: TBucketStorage = JSON.parse(dataRaw);
      if (!data.wallets) return false;
      const wallets = data.wallets;
      for (const key of wallets) {
        // deciding which type is wallet and instantiating correct object
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
              lndhub = await getLNDHub();
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
          case 'lightningLdk':
            // since ldk wallets are deprecated and removed, we need to handle a case when such wallet still exists in storage
            unserializedWallet = new HDSegwitBech32Wallet();
            unserializedWallet.setSecret(tempObj.secret.replace('ldk://', ''));
            break;
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
          this.counterparty_metadata = data.counterparty_metadata;
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
      const walletsToSave: string[] = []; // serialized wallets
      let realm;
      try {
        realm = await this.getRealmForTransactions();
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

      let data: TBucketStorage | string[] /* either a bucket, or an array of encrypted buckets */ = {
        wallets: walletsToSave,
        tx_metadata: this.tx_metadata,
        counterparty_metadata: this.counterparty_metadata,
      };

      if (this.cachedPassword) {
        // should find the correct bucket, encrypt and then save
        let buckets = await this.getItemWithFallbackToRealm('data');
        buckets = JSON.parse(buckets);
        const newData: string[] = []; // serialized buckets
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

        data = newData;
      }

      await this.setItem('data', JSON.stringify(data));
      await this.setItem(BlueApp.FLAG_ENCRYPTED, this.cachedPassword ? '1' : '');

      // now, backing up same data in realm:
      const realmkeyValue = await this.openRealmKeyValue();
      this.saveToRealmKeyValue(realmkeyValue, 'data', JSON.stringify(data));
      this.saveToRealmKeyValue(realmkeyValue, BlueApp.FLAG_ENCRYPTED, this.cachedPassword ? '1' : '');
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
   * @param index {number|undefined} Wallet index in this.wallets. Empty (or undef) for all wallets.
   * @param limit {number} How many txs return, starting from the earliest. Default: all of them.
   * @param includeWalletsWithHideTransactionsEnabled {boolean} Wallets' _hideTransactionsInWalletsList property determines wether the user wants this wallet's txs hidden from the main list view.
   */
  getTransactions = (
    index?: number,
    limit: number = Infinity,
    includeWalletsWithHideTransactionsEnabled: boolean = false,
  ): ExtendedTransaction[] => {
    if (index || index === 0) {
      let txs: Transaction[] = [];
      let c = 0;
      for (const wallet of this.wallets) {
        if (c++ === index) {
          txs = txs.concat(wallet.getTransactions());

          const txsRet: ExtendedTransaction[] = [];
          const walletID = wallet.getID();
          const walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
          txs.map(tx =>
            txsRet.push({
              ...tx,
              walletID,
              walletPreferredBalanceUnit,
            }),
          );
          return txsRet;
        }
      }
    }

    const txs: ExtendedTransaction[] = [];
    for (const wallet of this.wallets.filter(w => includeWalletsWithHideTransactionsEnabled || !w.getHideTransactionsInWalletsList())) {
      const walletTransactions: Transaction[] = wallet.getTransactions();
      const walletID = wallet.getID();
      const walletPreferredBalanceUnit = wallet.getPreferredBalanceUnit();
      for (const t of walletTransactions) {
        txs.push({
          ...t,
          walletID,
          walletPreferredBalanceUnit,
        });
      }
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

  isHandoffEnabled = async (): Promise<boolean> => {
    try {
      return !!(await AsyncStorage.getItem(BlueApp.HANDOFF_STORAGE_KEY));
    } catch (_) {}
    return false;
  };

  setIsHandoffEnabled = async (value: boolean): Promise<void> => {
    await AsyncStorage.setItem(BlueApp.HANDOFF_STORAGE_KEY, value ? '1' : '');
  };

  isDoNotTrackEnabled = async (): Promise<boolean> => {
    try {
      const keyExists = await AsyncStorage.getItem(BlueApp.DO_NOT_TRACK);
      if (keyExists !== null) {
        const doNotTrackValue = !!keyExists;
        if (doNotTrackValue) {
          await DefaultPreference.setName('group.io.bluewallet.bluewallet');
          await DefaultPreference.set(BlueApp.DO_NOT_TRACK, '1');
          AsyncStorage.removeItem(BlueApp.DO_NOT_TRACK);
        } else {
          return Boolean(await DefaultPreference.get(BlueApp.DO_NOT_TRACK));
        }
      }
    } catch (_) {}
    const doNotTrackValue = await DefaultPreference.get(BlueApp.DO_NOT_TRACK);
    return doNotTrackValue === '1' || false;
  };

  setDoNotTrack = async (value: boolean) => {
    await DefaultPreference.setName('group.io.bluewallet.bluewallet');
    if (value) {
      await DefaultPreference.set(BlueApp.DO_NOT_TRACK, '1');
    } else {
      await DefaultPreference.clear(BlueApp.DO_NOT_TRACK);
    }
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

  async moveRealmFilesToCacheDirectory() {
    const documentPath = RNFS.DocumentDirectoryPath; // Path to documentPath folder
    const cachePath = RNFS.CachesDirectoryPath; // Path to cachePath folder
    try {
      if (!(await RNFS.exists(documentPath))) return; // If the documentPath directory does not exist, return (nothing to move)
      const files = await RNFS.readDir(documentPath); // Read all files in documentPath directory
      if (Array.isArray(files) && files.length === 0) return; // If there are no files, return (nothing to move)
      const appRealmFiles = files.filter(
        file => file.name.endsWith('.realm') || file.name.endsWith('.realm.lock') || file.name.includes('.realm.management'),
      );

      for (const file of appRealmFiles) {
        const filePath = `${documentPath}/${file.name}`;
        const newFilePath = `${cachePath}/${file.name}`;
        const fileExists = await RNFS.exists(filePath); // Check if the file exists
        const cacheFileExists = await RNFS.exists(newFilePath); // Check if the file already exists in the cache directory

        if (fileExists) {
          if (cacheFileExists) {
            await RNFS.unlink(newFilePath); // Delete the file in the cache directory if it exists
            console.log(`Existing file removed from cache: ${newFilePath}`);
          }
          await RNFS.moveFile(filePath, newFilePath); // Move the file
          console.log(`Moved Realm file: ${filePath} to ${newFilePath}`);
        } else {
          console.log(`File does not exist: ${filePath}`);
        }
      }
    } catch (error) {
      console.error('Error moving Realm files:', error);
      throw new Error(`Error moving Realm files: ${(error as Error).message}`);
    }
  }
}
