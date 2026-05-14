import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';
import RNSecureKeyStore, { ACCESSIBLE } from 'react-native-secure-key-store';
import Realm from 'realm';

import * as encryption from '../blue_modules/encryption';
import { randomBytes } from './rng';

import { HDSegwitBech32Wallet } from './wallets/hd-segwit-bech32-wallet';
import { LegacyWallet } from './wallets/legacy-wallet';
import { WatchOnlyWallet } from './wallets/watch-only-wallet';
import { HDTaprootWallet } from './wallets/hd-taproot-wallet';
import { HDSegwitP2SHWallet } from './wallets/hd-segwit-p2sh-wallet';
import { HDLegacyP2PKHWallet } from './wallets/hd-legacy-p2pkh-wallet';

import { TWallet } from './wallets/types';
import { hexToUint8Array, uint8ArrayToHex } from '../blue_modules/uint8array-extras';

let savingInProgress = 0;

export type TTXMetadata = {
  [txid: string]: { memo?: string };
};

export type TCounterpartyMetadata = {
  [counterparty: string]: { label: string; hidden?: boolean };
};

type TBucketStorage = {
  wallets: string[];
  tx_metadata: TTXMetadata;
  counterparty_metadata: TCounterpartyMetadata;
};

const isReactNative = typeof navigator !== 'undefined' && navigator?.product === 'ReactNative';

export class BlueApp {
  static FLAG_ENCRYPTED = 'data_encrypted';

  private static _instance: BlueApp | null = null;

  public cachedPassword?: false | string;
  public tx_metadata: TTXMetadata = {};
  public counterparty_metadata: TCounterpartyMetadata = {};
  public wallets: TWallet[] = [];

  static getInstance(): BlueApp {
    if (!BlueApp._instance) BlueApp._instance = new BlueApp();
    return BlueApp._instance;
  }

  async loadFromDisk(password?: string): Promise<boolean> {
    let dataRaw = await this.getItem('data');
    if (password) {
      dataRaw = this.decryptData(dataRaw, password);
      if (dataRaw) this.cachedPassword = password;
    }

    if (dataRaw) {
      const data: TBucketStorage = JSON.parse(dataRaw);

      for (const key of data.wallets) {
        const tempObj = JSON.parse(key);
        let wallet: TWallet;

        switch (tempObj.type) {
          case HDSegwitBech32Wallet.type:
            wallet = HDSegwitBech32Wallet.fromJson(key) as HDSegwitBech32Wallet;
            break;
          case HDTaprootWallet.type:
            wallet = HDTaprootWallet.fromJson(key) as HDTaprootWallet;
            break;
          case HDSegwitP2SHWallet.type:
            wallet = HDSegwitP2SHWallet.fromJson(key) as HDSegwitP2SHWallet;
            break;
          case HDLegacyP2PKHWallet.type:
            wallet = HDLegacyP2PKHWallet.fromJson(key) as HDLegacyP2PKHWallet;
            break;
          case WatchOnlyWallet.type:
            wallet = WatchOnlyWallet.fromJson(key) as WatchOnlyWallet;
            break;
          case LegacyWallet.type:
          default:
            wallet = LegacyWallet.fromJson(key) as LegacyWallet;
            break;
        }

        if (!this.wallets.some(w => w.getID() === wallet.getID())) {
          this.wallets.push(wallet);
        }
      }

      this.tx_metadata = data.tx_metadata || {};
      this.counterparty_metadata = data.counterparty_metadata || {};
      return true;
    }
    return false;
  }

  decryptData(data: string, password: string): string | false {
    try {
      const buckets = JSON.parse(data);
      for (const bucket of buckets) {
        const decrypted = encryption.decrypt(bucket, password);
        if (decrypted) return decrypted;
      }
    } catch (_) {}
    return false;
  }

  async saveToDisk(): Promise<void> {
    if (savingInProgress) return;
    savingInProgress = 1;

    try {
      const walletsToSave = this.wallets.map(w => JSON.stringify({ ...w, type: (w as any).type }));

      const data: TBucketStorage = {
        wallets: walletsToSave,
        tx_metadata: this.tx_metadata,
        counterparty_metadata: this.counterparty_metadata,
      };

      await this.setItem('data', JSON.stringify(data));
      await this.setItem(BlueApp.FLAG_ENCRYPTED, this.cachedPassword ? '1' : '');
    } catch (e) {
      console.error(e);
    } finally {
      savingInProgress = 0;
    }
  }

  getWallets = () => this.wallets;
  getBalance = () => this.wallets.reduce((sum, w) => sum + w.getBalance(), 0);

  setItem = (key: string, value: any) => 
    isReactNative 
      ? RNSecureKeyStore.set(key, value, { accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY })
      : AsyncStorage.setItem(key, value);

  getItem = (key: string) => 
    isReactNative 
      ? RNSecureKeyStore.get(key) 
      : AsyncStorage.getItem(key);
}

export default BlueApp;