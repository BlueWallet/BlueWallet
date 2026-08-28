import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';
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
import { LightningArkWallet } from './wallets/lightning-ark-wallet.ts';
import { hexToUint8Array, uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import { HDTaprootWallet } from './wallets/hd-taproot-wallet';
import {
  APP_DATA_SCHEMA_VERSION,
  AppDataSchemas,
  isAppDataInitialized,
  isUtxoDataInitialized,
  activityRowToTransaction,
  queryWalletActivityForWallets,
  pruneCanonicalWalletData,
  readMetadata,
  replaceCanonicalData,
  replaceCanonicalWalletTransactions,
  replaceCanonicalWalletUtxos,
  scrubWalletUtxoSecrets,
} from '../blue_modules/realm/appDataRepository';

let usedBucketNum: boolean | number = false;

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
  /** Present only in storage written before metadata moved to Realm. */
  tx_metadata?: TTXMetadata;
  /** Present only in storage written before metadata moved to Realm. */
  counterparty_metadata?: TCounterpartyMetadata;
};

const isReactNative = typeof navigator !== 'undefined' && navigator?.product === 'ReactNative';
const APP_DATA_DEFAULT_PASSWORD = 'fyegjitkyf[eqjnc.lf';

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
  private appDataRealm?: Realm;
  private appDataRealmIdentity?: string;
  private appDataRealmPromise?: Promise<Realm>;
  private appDataRealmListeners = new Set<(realm: Realm | undefined) => void>();
  private retiredAppDataRealms = new Set<Realm>();
  private appDataRealmReleaseWaiters = new Map<Realm, Set<() => void>>();
  private walletStorageSaveQueue: Promise<void> = Promise.resolve();

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
      return RNSecureKeyStore.set(key, value, {
        accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
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
    try {
      return await this.getItem(key);
    } catch (error: any) {
      console.warn('error reading', key, error.message);
      console.warn('fallback to realm');
      const realmKeyValue = await this.openRealmKeyValue();
      try {
        const value = realmKeyValue.objectForPrimaryKey<{ key: string; value: string }>('KeyValue', key)?.value;
        if (value) {
          console.warn('successfully recovered', value.length, 'bytes from realm for key', key);
          return value;
        }
        return null;
      } finally {
        realmKeyValue.close();
      }
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
      await this.copyAppDataRealmToBucket(false);
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
    await this.setItem('data', data);
    await this.setItem(BlueApp.FLAG_ENCRYPTED, '1');

    await this.copyAppDataRealmToBucket(password);
    await this.clearAndDeleteDefaultAppDataRealm();
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
    return uint8ArrayToHex(sha256(s));
  };

  private getAppDataRealmConfig(passwordOverride: false | string | undefined = this.cachedPassword) {
    const password = this.hashIt(passwordOverride || APP_DATA_DEFAULT_PASSWORD);
    const buf = hexToUint8Array(this.hashIt(password) + this.hashIt(password));
    const encryptionKey = Int8Array.from(buf);
    const fileName = this.hashIt(this.hashIt(password));
    return { encryptionKey, fileName };
  }

  getAppDataRealmIdentity = (): string => this.getAppDataRealmConfig().fileName;

  subscribeToAppDataRealm = (listener: (realm: Realm | undefined) => void): (() => void) => {
    this.appDataRealmListeners.add(listener);
    listener(this.appDataRealm && !this.appDataRealm.isClosed ? this.appDataRealm : undefined);
    return () => {
      this.appDataRealmListeners.delete(listener);
      if (this.appDataRealmListeners.size === 0) {
        for (const realm of Array.from(this.retiredAppDataRealms)) this.releaseAppDataRealm(realm);
      }
    };
  };

  private publishAppDataRealm(realm: Realm | undefined): void {
    for (const listener of this.appDataRealmListeners) listener(realm);
  }

  /** Closes a superseded Realm after React has committed the replacement provider value. */
  releaseAppDataRealm = (realm: Realm): void => {
    if (realm === this.appDataRealm) return;
    this.retiredAppDataRealms.delete(realm);
    if (!realm.isClosed) realm.close();
    const waiters = this.appDataRealmReleaseWaiters.get(realm);
    this.appDataRealmReleaseWaiters.delete(realm);
    for (const resolve of waiters ?? []) resolve();
  };

  /** Waits until React has committed the replacement Realm before touching the retired file. */
  private waitForAppDataRealmRelease(realm: Realm): Promise<void> {
    if (realm.isClosed || !this.retiredAppDataRealms.has(realm)) return Promise.resolve();
    if (this.appDataRealmListeners.size === 0) {
      this.releaseAppDataRealm(realm);
      return Promise.resolve();
    }

    return new Promise(resolve => {
      const waiters = this.appDataRealmReleaseWaiters.get(realm) ?? new Set<() => void>();
      waiters.add(resolve);
      this.appDataRealmReleaseWaiters.set(realm, waiters);
    });
  }

  private async releaseRetiredAppDataRealmsAtPath(path: string): Promise<void> {
    const realms = Array.from(this.retiredAppDataRealms).filter(realm => realm.path === path);
    await Promise.all(realms.map(realm => this.waitForAppDataRealmRelease(realm)));
  }

  private getAppDataRealmPath(fileName: string): string {
    return `${RNFS.DocumentDirectoryPath}/app-data/${fileName}-appdata.realm`;
  }

  /** Copies canonical data between encryption buckets without routing it through wallet memory. */
  private async copyAppDataRealmToBucket(password: false | string): Promise<void> {
    const sourceRealm = await this.getRealmForTransactions();
    const { encryptionKey, fileName } = this.getAppDataRealmConfig(password);
    const path = this.getAppDataRealmPath(fileName);
    if (sourceRealm.path === path) {
      this.cachedPassword = password;
      return;
    }

    await this.releaseRetiredAppDataRealmsAtPath(path);
    if (Realm.exists({ path })) Realm.deleteFile({ path });
    sourceRealm.writeCopyTo({ path, encryptionKey });
    this.cachedPassword = password;
    await this.getRealmForTransactions();
  }

  /** Clears and removes the known-key Realm. Throws unless no readable canonical data remains there. */
  private async clearAndDeleteDefaultAppDataRealm(): Promise<void> {
    const { encryptionKey, fileName } = this.getAppDataRealmConfig(false);
    if (this.appDataRealmIdentity === fileName) return;
    const path = this.getAppDataRealmPath(fileName);
    if (!Realm.exists({ path })) return;

    await this.releaseRetiredAppDataRealmsAtPath(path);

    let clearingError: unknown;
    try {
      const legacyRealm = await Realm.open({
        schema: AppDataSchemas,
        schemaVersion: APP_DATA_SCHEMA_VERSION,
        path,
        encryptionKey,
        excludeFromIcloudBackup: true,
      });
      scrubWalletUtxoSecrets(legacyRealm);
      legacyRealm.write(() => legacyRealm.deleteAll());
      legacyRealm.close();
    } catch (error) {
      clearingError = error;
    }

    let deletionError: unknown;
    try {
      Realm.deleteFile({ path });
    } catch (error) {
      deletionError = error;
    }
    if (Realm.exists({ path })) {
      const failure = deletionError ?? clearingError;
      const detail = failure instanceof Error ? `: ${failure.message}` : '';
      throw new Error(`Failed to clear and delete the previous known-key app-data Realm${detail}`);
    }
  }

  /**
   * Opens the durable, encrypted source of truth for transactions and their metadata.
   * Its filename and key remain bucket-specific to preserve plausible deniability.
   */
  async getRealmForTransactions(): Promise<Realm> {
    const { encryptionKey, fileName } = this.getAppDataRealmConfig();
    if (this.appDataRealmIdentity === fileName && this.appDataRealm && !this.appDataRealm.isClosed) return this.appDataRealm;
    if (this.appDataRealmIdentity === fileName && this.appDataRealmPromise) return await this.appDataRealmPromise;

    const previousRealm = this.appDataRealm;
    if (previousRealm) this.retiredAppDataRealms.add(previousRealm);
    this.appDataRealm = undefined;
    this.appDataRealmIdentity = fileName;

    const opening = (async () => {
      const directory = `${RNFS.DocumentDirectoryPath}/app-data`;
      if (!(await RNFS.exists(directory))) await RNFS.mkdir(directory);
      const realm = await Realm.open({
        schema: AppDataSchemas,
        schemaVersion: APP_DATA_SCHEMA_VERSION,
        path: this.getAppDataRealmPath(fileName),
        encryptionKey,
        excludeFromIcloudBackup: true,
      });
      scrubWalletUtxoSecrets(realm);
      return realm;
    })();
    this.appDataRealmPromise = opening;
    try {
      const realm = await opening;
      if (this.appDataRealmIdentity !== fileName) {
        realm.close();
        return await this.getRealmForTransactions();
      }
      this.appDataRealm = realm;
      this.publishAppDataRealm(realm);
      if (this.appDataRealmListeners.size === 0 && previousRealm) this.releaseAppDataRealm(previousRealm);
      return realm;
    } catch (error) {
      if (this.appDataRealmIdentity === fileName) {
        this.publishAppDataRealm(undefined);
        if (previousRealm) this.releaseAppDataRealm(previousRealm);
      }
      throw error;
    } finally {
      if (this.appDataRealmPromise === opening) this.appDataRealmPromise = undefined;
    }
  }

  /** Opens the pre-v8 transaction cache for one-time migration only. */
  private async getLegacyRealmForTransactions() {
    const { encryptionKey, fileName } = this.getAppDataRealmConfig();
    const path = `${RNFS.CachesDirectoryPath}/${fileName}-wallettransactions.realm`;

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
      password = uint8ArrayToHex(buf);
      await Keychain.setGenericPassword(service, password, { service });
    }

    const buf = hexToUint8Array(password);
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
      let realm: Realm | undefined;
      let legacyRealm: Realm | undefined;
      let canonicalDataExists = false;
      let canonicalUtxoDataExists = false;
      try {
        realm = await this.getRealmForTransactions();
        canonicalDataExists = isAppDataInitialized(realm);
        canonicalUtxoDataExists = isUtxoDataInitialized(realm);
        if (!canonicalDataExists) legacyRealm = await this.getLegacyRealmForTransactions();
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
          case HDTaprootWallet.type:
            unserializedWallet = HDTaprootWallet.fromJson(key) as unknown as HDTaprootWallet;
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
          case LightningArkWallet.type:
            unserializedWallet = LightningArkWallet.fromJson(key) as unknown as LightningArkWallet;
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
          if (!canonicalDataExists && legacyRealm) this.inflateWalletFromLegacyRealm(legacyRealm, unserializedWallet);
        } catch (error: any) {
          presentAlert({ message: error.message });
        }

        // done
        const ID = unserializedWallet.getID();
        if (!this.wallets.some(wallet => wallet.getID() === ID)) {
          this.wallets.push(unserializedWallet);
        }
      }
      legacyRealm?.close();

      if (realm && canonicalDataExists) {
        const metadata = readMetadata(realm);
        this.tx_metadata = metadata.txMetadata;
        this.counterparty_metadata = metadata.counterpartyMetadata;
        if (!canonicalUtxoDataExists) replaceCanonicalWalletUtxos(realm, this.wallets);
      } else {
        this.tx_metadata = data.tx_metadata ?? {};
        this.counterparty_metadata = data.counterparty_metadata ?? {};
        if (realm) replaceCanonicalData(realm, this.wallets, this.tx_metadata, this.counterparty_metadata);
      }
      if (this.cachedPassword) await this.clearAndDeleteDefaultAppDataRealm();
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

  addWallet = (wallet: TWallet): void => {
    this.wallets.push(wallet);
  };

  replaceWallet = (walletId: string, wallet: TWallet): void => {
    this.wallets = this.wallets.map(existing => (existing.getID() === walletId ? wallet : existing));
  };

  /** Purges canonical transaction rows and resets the wallet engine's fetch cache in one operation. */
  purgeWalletTransactions = async (walletId: string): Promise<void> => {
    const wallet = this.wallets.find(candidate => candidate.getID() === walletId);
    if (!wallet) return;

    const transactionWallet = (('_hdWalletInstance' in wallet && wallet._hdWalletInstance) || wallet) as any;
    transactionWallet._txs_by_external_index = {};
    transactionWallet._txs_by_internal_index = {};
    transactionWallet._balances_by_external_index = {};
    transactionWallet._balances_by_internal_index = {};
    transactionWallet._lastTxFetch = 0;
    transactionWallet._lastBalanceFetch = 0;

    if (wallet.type === LightningCustodianWallet.type) {
      const lightningWallet = wallet as LightningCustodianWallet;
      lightningWallet.pending_transactions_raw = [];
      lightningWallet.transactions_raw = [];
      lightningWallet.user_invoices_raw = [];
    }

    const realm = await this.getRealmForTransactions();
    realm.write(() => {
      realm.delete(realm.objects('WalletActivity').filtered('walletId == $0', walletId));
      realm.delete(realm.objects('WalletTransaction').filtered('walletId == $0', walletId));
    });
    await this.saveToDisk();
  };

  inflateWalletFromLegacyRealm(realm: Realm, walletToInflate: TWallet) {
    const transactions = realm.objects('WalletTransactions');
    const transactionsForWallet = transactions.filtered('walletid == $0', walletToInflate.getID()) as unknown as TRealmTransaction[];
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
        // Legacy single-address wallets - store under index 0
        walletToInflate._txs_by_external_index = walletToInflate._txs_by_external_index || {};
        walletToInflate._txs_by_external_index[0] = walletToInflate._txs_by_external_index[0] || [];
        const transaction = JSON.parse(tx.tx);
        walletToInflate._txs_by_external_index[0].push(transaction);
      }
    }
  }

  /**
   * Serializes and saves to storage object data.
   * If cached password is saved - finds the correct bucket
   * to save to, encrypts and then saves.
   *
   * @returns {Promise} Result of storage save
   */
  saveToDisk(): Promise<void> {
    const save = this.walletStorageSaveQueue.then(
      () => this.performWalletStorageSave(),
      () => this.performWalletStorageSave(),
    );
    // Keep later saves usable after a failed write while returning the actual
    // failure to the caller that requested this save.
    this.walletStorageSaveQueue = save.catch(() => undefined);
    return save;
  }

  private async performWalletStorageSave(): Promise<void> {
    try {
      const walletsToSave: string[] = []; // serialized wallets
      for (const key of this.wallets) {
        if (typeof key === 'boolean') continue;
        const keyCloned = Object.assign(Object.create(Object.getPrototypeOf(key)), key) as TWallet;
        if ('_hdWalletInstance' in key && key._hdWalletInstance) {
          const k = keyCloned as any & WatchOnlyWallet;
          k._hdWalletInstance = Object.assign(Object.create(Object.getPrototypeOf(key._hdWalletInstance)), key._hdWalletInstance);
        }
        keyCloned.prepareForSerialization();
        // @ts-ignore wtf is wallet.current? Does it even exist?
        delete keyCloned.current;
        if ('_hdWalletInstance' in keyCloned && keyCloned._hdWalletInstance) {
          const k = keyCloned as any & WatchOnlyWallet;
          k._hdWalletInstance._txs_by_external_index = {};
          k._hdWalletInstance._txs_by_internal_index = {};
          k._hdWalletInstance._utxo = [];
          k._hdWalletInstance._utxoMetadata = {};
        }
        // stripping down:
        if (key._txs_by_external_index) {
          keyCloned._txs_by_external_index = {};
          keyCloned._txs_by_internal_index = {};
        }
        keyCloned._utxo = [];
        keyCloned._utxoMetadata = {};
        if (key.type === LightningCustodianWallet.type) {
          const lightningClone = keyCloned as LightningCustodianWallet;
          lightningClone.pending_transactions_raw = [];
          lightningClone.transactions_raw = [];
          lightningClone.user_invoices_raw = [];
        }

        if ('_bip47_instance' in keyCloned) {
          delete keyCloned._bip47_instance; // since it wont be restored into a proper class instance
        }

        walletsToSave.push(JSON.stringify({ ...keyCloned, type: keyCloned.type }));
      }

      let data: TBucketStorage | string[] /* either a bucket, or an array of encrypted buckets */ = {
        wallets: walletsToSave,
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
      try {
        realmkeyValue.write(() => {
          realmkeyValue.create('KeyValue', { key: 'data', value: JSON.stringify(data) }, Realm.UpdateMode.Modified);
          realmkeyValue.create(
            'KeyValue',
            { key: BlueApp.FLAG_ENCRYPTED, value: this.cachedPassword ? '1' : '' },
            Realm.UpdateMode.Modified,
          );
        });
      } finally {
        realmkeyValue.close();
      }

      // Persist the wallet bucket before deleting orphaned canonical rows. If
      // wallet storage fails, a wallet must not reappear on restart without the
      // transaction history that belonged to it.
      const realm = await this.getRealmForTransactions();
      if (!isAppDataInitialized(realm)) {
        const metadata = readMetadata(realm);
        replaceCanonicalData(realm, this.wallets, metadata.txMetadata, metadata.counterpartyMetadata);
      }
      pruneCanonicalWalletData(realm, new Set(this.wallets.map(wallet => wallet.getID())));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('save to disk exception:', message);
      presentAlert({ message: 'save to disk exception: ' + message });
      if (message.includes('Realm file decryption failed')) {
        console.warn('purging realm key-value database file');
        this.purgeRealmKeyValueFile();
      }
      throw error;
    }
  }

  /**
   * For each wallet, fetches balance from remote endpoint.
   * Use getter for a specific wallet to get actual balance.
   * Returns void.
   * If walletId is present then fetch only that wallet. Wallet identity is used
   * instead of array position because display order is canonical in Realm and
   * may differ from the secure wallet registry's serialization order.
   */
  fetchWalletBalances = async (walletId?: string): Promise<void> => {
    console.log('fetchWalletBalances for wallet', walletId ?? '(all)');
    const wallets = walletId ? [this.getWalletById(walletId)] : this.wallets;
    await Promise.all(
      wallets.map(async wallet => {
        if (!wallet) throw new Error(`Wallet not found: ${walletId}`);
        console.log('fetching balance for', wallet.getLabel());
        await wallet.fetchBalance();
      }),
    );
  };

  /**
   * Fetches from remote endpoint all transactions for each wallet.
   * Returns void.
   * To access transactions - get them from each respective wallet.
   * If walletId is present then fetch only that wallet.
   *
   * @param walletId Wallet identifier, blank to fetch from all wallets
   * @return {Promise.<void>}
   */
  fetchWalletTransactions = async (walletId?: string): Promise<void> => {
    console.log('fetchWalletTransactions for wallet', walletId ?? '(all)');
    const wallets = walletId ? [this.getWalletById(walletId)] : this.wallets;
    await Promise.all(
      wallets.map(async wallet => {
        if (!wallet) throw new Error(`Wallet not found: ${walletId}`);
        await wallet.fetchTransactions();
        if ('fetchPendingTransactions' in wallet) {
          await wallet.fetchPendingTransactions();
          await wallet.fetchUserInvoices();
        }
        // The network snapshot becomes canonical before this method resolves;
        // live Realm queries then update every mounted screen on the nav stack.
        await this.persistWalletTransactions([wallet]);
      }),
    );
  };

  persistWalletTransactions = async (wallets: TWallet[]): Promise<void> => {
    const realm = await this.getRealmForTransactions();
    const { txMetadata } = readMetadata(realm);
    replaceCanonicalWalletTransactions(realm, wallets, txMetadata);
  };

  persistWalletUtxos = async (wallets: TWallet[]): Promise<void> => {
    const realm = await this.getRealmForTransactions();
    replaceCanonicalWalletUtxos(realm, wallets);
  };

  fetchWalletUtxos = async (walletId: string): Promise<void> => {
    const wallet = this.getWalletById(walletId);
    if (!wallet) throw new Error(`Wallet not found: ${walletId}`);
    await wallet.fetchUtxo();
    await this.persistWalletUtxos([wallet]);
  };

  fetchSenderPaymentCodes = async (walletId?: string) => {
    console.log('fetchSenderPaymentCodes for wallet', walletId ?? '(all)');
    if (walletId) {
      const wallet = this.getWalletById(walletId);
      if (!wallet) throw new Error(`Wallet not found: ${walletId}`);
      try {
        if (!(wallet.allowBIP47() && wallet.isBIP47Enabled() && 'fetchBIP47SenderPaymentCodes' in wallet)) return;
        await wallet.fetchBIP47SenderPaymentCodes();
      } catch (error) {
        console.error('Failed to fetch sender payment codes for wallet', walletId, error);
      }
    } else {
      await Promise.all(
        this.wallets.map(async wallet => {
          try {
            if (!(wallet.allowBIP47() && wallet.isBIP47Enabled() && 'fetchBIP47SenderPaymentCodes' in wallet)) return;
            await wallet.fetchBIP47SenderPaymentCodes();
          } catch (error) {
            console.error('Failed to fetch sender payment codes for wallet', wallet.label, error);
          }
        }),
      );
    }
  };

  getWallets = (): TWallet[] => {
    return this.wallets;
  };

  getWalletById = (walletId: string): TWallet | undefined => {
    return this.wallets.find(wallet => wallet.getID() === walletId);
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
    if (!this.appDataRealm || this.appDataRealm.isClosed) return [];
    const selectedWallet = index || index === 0 ? this.wallets[index] : undefined;
    const selectedWallets = selectedWallet ? [selectedWallet] : index === undefined ? this.wallets : [];
    const visibleWallets = selectedWallets.filter(
      w => includeWalletsWithHideTransactionsEnabled || index !== undefined || !w.getHideTransactionsInWalletsList(),
    );
    const walletById = new Map(visibleWallets.map(wallet => [wallet.getID(), wallet]));
    const rows = queryWalletActivityForWallets(
      this.appDataRealm,
      visibleWallets.map(wallet => wallet.getID()),
      '',
      limit,
    );
    const transactions: ExtendedTransaction[] = [];
    for (const row of rows) {
      const wallet = walletById.get(row.walletId);
      if (!wallet) continue;
      transactions.push({
        ...activityRowToTransaction(row),
        walletID: row.walletId,
        walletPreferredBalanceUnit: wallet.getPreferredBalanceUnit(),
      });
    }
    return transactions;
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
