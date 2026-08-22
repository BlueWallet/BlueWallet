import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '@noble/hashes/sha256';
import DefaultPreference from 'react-native-default-preference';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Keychain, { ACCESSIBLE as KEYCHAIN_ACCESSIBLE, ACCESS_CONTROL, hasGenericPassword } from 'react-native-keychain';
import Realm from 'realm';

import * as encryption from '../blue_modules/encryption';
import presentAlert from '../components/Alert';
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
import { clearLegacySecureStorage, getLegacySecureValue, removeLegacySecureValue } from '../blue_modules/legacy-secure-storage';
import { randomBytes } from './rng';
import { decryptWalletData, encryptWalletData, isWalletDataEnvelope, WALLET_DATA_KEY_LENGTH } from '../blue_modules/wallet-data-envelope';
import { getAndroidKeystoreOptions, getIosKeychainAccessibilityOptions, getKeychainAccessControl } from '../blue_modules/keychain-policy';

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

export type KeychainSecurityOption = 'biometricsOrPasscode' | 'devicePasscode';

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

export class BlueApp {
  static LNDHUB = 'lndhub';
  static DO_NOT_TRACK = 'donottrack';
  static HANDOFF_STORAGE_KEY = 'HandOff';
  static STORAGE_KEYCHAIN_SERVICE_PREFIX = 'BlueWalletStorage.';
  static STORAGE_PASSWORD_KEYCHAIN_PREFIX = 'BlueWalletStoragePassword.';
  static BIOMETRIC_AUTH_SERVICE = 'BlueWalletBiometricAuthentication';
  static DEVICE_PASSCODE_AUTH_SERVICE = 'BlueWalletDevicePasscodeAuthenticationV1';
  static SENSITIVE_ACTIONS_POLICY_SERVICE = 'BlueWalletSensitiveActionsPolicyV1';
  static SENSITIVE_ACTIONS_BIOMETRIC_SERVICE = 'BlueWalletSensitiveActionsBiometricV1';
  static SENSITIVE_ACTIONS_PASSCODE_SERVICE = 'BlueWalletSensitiveActionsPasscodeV1';

  static BIOMETRIC_DATA_PROTECTION_SERVICE = 'BlueWalletBiometricDataProtectionV1';

  static DEVICE_PASSCODE_DATA_PROTECTION_SERVICE = 'BlueWalletDevicePasscodeDataProtectionV1';
  static DATA_ENCRYPTION_KEY_SERVICE = 'BlueWalletDataEncryptionKeyV2';
  static DATA_KEY_BACKUP_SERVICE = 'BlueWalletDataEncryptionKeyBackupV2';
  static DATA_KEY_TRANSACTION_SERVICE = 'BlueWalletDataEncryptionKeyTransactionV2';
  static WALLET_DATA_SECONDARY_SERVICE = 'BlueWalletStorage.data.v2.secondary';
  static WALLET_DATA_MANIFEST_SERVICE = 'BlueWalletStorage.data.v2.manifest';

  static LEGACY_REALM_KEY_VALUE_SERVICE = 'realm_encryption_key';
  static IOS_INSTALLATION_MARKER = 'BlueWallet.iOSInstallationMarker.v1';
  static IOS_INSTALLATION_SENTINEL_SERVICE = 'BlueWalletInstallationSentinelV1';
  static LEGACY_SECURE_STORAGE_SERVICE = 'RNSecureKeyStoreKeyChain';
  static LEGACY_FLAG_ENCRYPTED = 'data_encrypted';

  private static _instance: BlueApp | null = null;

  static keys2migrate = [BlueApp.HANDOFF_STORAGE_KEY, BlueApp.DO_NOT_TRACK];
  static secureStorageKeys = ['Biometrics', 'data'];

  public cachedPassword?: false | string;
  public tx_metadata: TTXMetadata;
  public counterparty_metadata: TCounterpartyMetadata;
  public wallets: TWallet[];
  private biometricUnlockedData?: string;
  private dataEncryptionKey?: Uint8Array;
  private iosInstallationCheck?: Promise<void>;

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

  static storageKeychainService(key: string): string {
    return `${BlueApp.STORAGE_KEYCHAIN_SERVICE_PREFIX}${key}`;
  }

  private async getKeychainStorageItem(key: string): Promise<string | null> {
    if (key === 'data' && this.biometricUnlockedData !== undefined) return this.biometricUnlockedData;

    return await this.readKeychainStorageItem(key);
  }

  private async reconcileIosInstallationState(): Promise<void> {
    const localMarker = await AsyncStorage.getItem(BlueApp.IOS_INSTALLATION_MARKER);
    const hasSentinel = await hasGenericPassword({
      service: BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE,
    });

    if (!localMarker && hasSentinel) {
      // UserDefaults/AsyncStorage is removed with the app, whereas Keychain is
      // retained by iOS. This combination therefore confirms a reinstall.
      const services = await Keychain.getAllGenericPasswordServices({
        skipUIAuth: true,
      });
      const knownServices = [
        ...BlueApp.secureStorageKeys.map(BlueApp.storageKeychainService),
        BlueApp.BIOMETRIC_AUTH_SERVICE,
        BlueApp.DEVICE_PASSCODE_AUTH_SERVICE,
        BlueApp.SENSITIVE_ACTIONS_POLICY_SERVICE,
        BlueApp.SENSITIVE_ACTIONS_BIOMETRIC_SERVICE,
        BlueApp.SENSITIVE_ACTIONS_PASSCODE_SERVICE,
        BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE,
        BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE,
        BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
        BlueApp.DATA_KEY_BACKUP_SERVICE,
        BlueApp.DATA_KEY_TRANSACTION_SERVICE,
        BlueApp.WALLET_DATA_SECONDARY_SERVICE,
        BlueApp.WALLET_DATA_MANIFEST_SERVICE,
        BlueApp.BIOMETRIC_PASSWORD_SERVICE,
        BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE,
        BlueApp.LEGACY_REALM_KEY_VALUE_SERVICE,
        BlueApp.LEGACY_SECURE_STORAGE_SERVICE,
        'BlueWalletBiometricTogglePrompt',
        'BlueWalletSecurityTogglePromptV1',
      ];
      // skipUIAuth avoids showing unlock prompts during reinstall cleanup.
      // Explicit known services cover protected entries omitted from that list.
      for (const service of new Set([...services, ...knownServices])) {
        await Keychain.resetGenericPassword({ service });
      }
      await clearLegacySecureStorage();
      this.biometricUnlockedData = undefined;
      this.dataEncryptionKey = undefined;
    }

    if (!localMarker) {
      // Write the local marker first. If creating the sentinel is interrupted,
      // the next launch repairs it without mistaking an upgrade for reinstall.
      await AsyncStorage.setItem(BlueApp.IOS_INSTALLATION_MARKER, '1');
    }

    if (
      !(await hasGenericPassword({
        service: BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE,
      }))
    ) {
      await Keychain.setGenericPassword('installation', 'installed', {
        service: BlueApp.IOS_INSTALLATION_SENTINEL_SERVICE,
        accessible: KEYCHAIN_ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }
  }

  private async ensureCurrentIosInstallation(): Promise<void> {
    if (Platform.OS !== 'ios') return;
    if (!this.iosInstallationCheck) {
      this.iosInstallationCheck = this.reconcileIosInstallationState().catch(error => {
        this.iosInstallationCheck = undefined;
        throw error;
      });
    }
    await this.iosInstallationCheck;
  }

  private async readKeychainStorageItem(key: string): Promise<string | null> {
    if (key === 'data') {
      const manifest = await this.getWalletDataManifest();
      const primaryService = BlueApp.storageKeychainService('data');
      const activeService = manifest?.active === 'secondary' ? BlueApp.WALLET_DATA_SECONDARY_SERVICE : primaryService;
      const fallbackService = activeService === primaryService ? BlueApp.WALLET_DATA_SECONDARY_SERVICE : primaryService;
      let lastError: unknown;
      const hasEnvelopeKey = await hasGenericPassword({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE });
      for (const service of manifest || hasEnvelopeKey ? [activeService, fallbackService] : [activeService]) {
        const credentials = await Keychain.getGenericPassword({
          service,
          authenticationPrompt: { title: service === activeService ? 'Unlock BlueWallet' : 'Recover BlueWallet data' },
        });
        if (!credentials) continue;
        try {
          const value = BlueApp.readKeychainEnvelope(credentials.password);
          if (!isWalletDataEnvelope(value)) {
            if (manifest) throw new Error('Invalid committed wallet-data envelope');
            return value;
          }
          const dataKey = this.dataEncryptionKey ?? (await this.readDataEncryptionKey());
          if (!dataKey) throw new Error('Wallet data-encryption key is unavailable');
          this.dataEncryptionKey = dataKey;
          return decryptWalletData(value, dataKey);
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) throw lastError;
      return null;
    }

    const credentials = await Keychain.getGenericPassword({
      service: BlueApp.storageKeychainService(key),
      authenticationPrompt: { title: 'Unlock BlueWallet' },
    });
    if (!credentials) return null;
    return BlueApp.readKeychainEnvelope(credentials.password);
  }

  private static readKeychainEnvelope(password: string): string {
    try {
      const stored = JSON.parse(password);
      if (stored?.version === 1 && typeof stored.value === 'string') return stored.value;
    } catch (_) {}

    // Allow reading entries created before the versioned envelope existed.
    return password;
  }

  private async getWalletDataManifest(): Promise<{ active: 'primary' | 'secondary'; generation: number } | null> {
    const credentials = await Keychain.getGenericPassword({ service: BlueApp.WALLET_DATA_MANIFEST_SERVICE });
    if (!credentials) return null;
    try {
      const manifest = JSON.parse(credentials.password) as { active?: unknown; generation?: unknown };
      if ((manifest.active !== 'primary' && manifest.active !== 'secondary') || !Number.isSafeInteger(manifest.generation)) {
        throw new Error('Invalid wallet-data commit manifest');
      }
      return { active: manifest.active, generation: manifest.generation as number };
    } catch (error) {
      // Both encrypted generations remain independently authenticated. A bad
      // manifest must not make them unreachable; reads try primary then the
      // secondary slot and the next successful save writes a fresh manifest.
      console.warn('[BlueApp] Ignoring invalid wallet-data manifest:', error);
      return null;
    }
  }

  async unlockKeychainDataWithBiometrics(forceAuthentication = false): Promise<boolean> {
    if (!forceAuthentication && this.biometricUnlockedData !== undefined) return true;

    await this.recoverInterruptedDataKeyChange();
    if (await hasGenericPassword({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE })) {
      console.debug('[BlueApp] Reading the protected wallet data-encryption key for app unlock:', { forceAuthentication });
      const dataKey = await this.readDataEncryptionKey(forceAuthentication);
      if (!dataKey) return false;
      this.dataEncryptionKey = dataKey;
      const data = await this.readKeychainStorageItem('data');
      if (data === null) return false;
      this.biometricUnlockedData = data;
      return true;
    }

    // One-time migration for installations where the wallet payload itself
    // carried the Keychain ACL. Authenticate that legacy item once, then move
    // protection to the dedicated data key without changing the plaintext.
    console.debug('[BlueApp] Reading legacy protected wallet data for envelope migration:', { forceAuthentication });
    const credentials = await Keychain.getGenericPassword({
      service: BlueApp.storageKeychainService('data'),
      authenticationPrompt: { title: 'Unlock BlueWallet' },
      ...(forceAuthentication ? { requireFreshAuthentication: true } : {}),
    });
    if (!credentials) return false;

    const data = BlueApp.readKeychainEnvelope(credentials.password);
    const securityOption = await this.getKeychainDataProtection();
    await this.setKeychainStorageItem('data', data, securityOption);
    this.biometricUnlockedData = data;
    return true;
  }

  lockKeychainData(): void {
    this.biometricUnlockedData = undefined;
    this.dataEncryptionKey?.fill(0);
    this.dataEncryptionKey = undefined;
  }

  clearInMemoryWalletData(): void {
    this.wallets = [];
    this.tx_metadata = {};
    this.counterparty_metadata = {};
    this.cachedPassword = false;
    this.lockKeychainData();
    usedBucketNum = false;
  }

  private static accessControlForSecurityOption(option?: KeychainSecurityOption): ACCESS_CONTROL | undefined {
    return option ? getKeychainAccessControl(option) : undefined;
  }

  private async readDataEncryptionKey(
    forceAuthentication = false,
    service = BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
  ): Promise<Uint8Array | null> {
    const credentials = await Keychain.getGenericPassword({
      service,
      authenticationPrompt: { title: 'Unlock BlueWallet' },
      ...(forceAuthentication ? { requireFreshAuthentication: true } : {}),
    });
    if (!credentials) return null;
    const key = hexToUint8Array(credentials.password);
    if (key.length !== WALLET_DATA_KEY_LENGTH) throw new Error('Invalid wallet data-encryption key');
    return key;
  }

  private async storeDataEncryptionKey(
    dataKey: Uint8Array,
    securityOption?: KeychainSecurityOption,
    service = BlueApp.DATA_ENCRYPTION_KEY_SERVICE,
  ): Promise<void> {
    if (dataKey.length !== WALLET_DATA_KEY_LENGTH) throw new Error('Invalid wallet data-encryption key');
    const accessControl = BlueApp.accessControlForSecurityOption(securityOption);
    const stored = await Keychain.setGenericPassword('wallet-data-key', uint8ArrayToHex(dataKey), {
      service,
      ...getIosKeychainAccessibilityOptions(),
      ...(accessControl ? { accessControl } : {}),
      // The envelope key always belongs in the Android Keystore, even when
      // access control is Off. The selected policy only adds user authentication.
      ...getAndroidKeystoreOptions(),
    });
    if (!stored || !(await hasGenericPassword({ service }))) throw new Error('Failed to store wallet data-encryption key');
  }

  private async getOrCreateDataEncryptionKey(securityOption?: KeychainSecurityOption): Promise<Uint8Array> {
    if (this.dataEncryptionKey) return this.dataEncryptionKey;
    const existing = await this.readDataEncryptionKey();
    if (existing) {
      this.dataEncryptionKey = existing;
      return existing;
    }
    const created = await randomBytes(WALLET_DATA_KEY_LENGTH);
    await this.storeDataEncryptionKey(created, securityOption);
    await this.setDataProtectionMarkers(securityOption);
    this.dataEncryptionKey = created;
    return created;
  }

  private async setDataProtectionMarkers(securityOption?: KeychainSecurityOption): Promise<void> {
    const selectedMarkerService =
      securityOption === 'devicePasscode'
        ? BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE
        : securityOption === 'biometricsOrPasscode'
          ? BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE
          : undefined;
    if (selectedMarkerService) {
      const stored = await Keychain.setGenericPassword('data-key', 'system-protected', {
        service: selectedMarkerService,
        accessible: KEYCHAIN_ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      if (!stored) throw new Error('Failed to persist wallet data-protection policy');
    }
    if (selectedMarkerService !== BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE) {
      await Keychain.resetGenericPassword({ service: BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE });
    }
    if (selectedMarkerService !== BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE) {
      await Keychain.resetGenericPassword({ service: BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE });
    }
  }

  private async setKeychainStorageItem(key: string, value: string, securityOption?: KeychainSecurityOption): Promise<void> {
    const manifest = key === 'data' ? await this.getWalletDataManifest() : null;
    const nextSlot = manifest?.active === 'secondary' ? 'primary' : 'secondary';
    const service =
      key === 'data'
        ? nextSlot === 'primary'
          ? BlueApp.storageKeychainService('data')
          : BlueApp.WALLET_DATA_SECONDARY_SERVICE
        : BlueApp.storageKeychainService(key);
    const dataKey = key === 'data' ? await this.getOrCreateDataEncryptionKey(securityOption) : undefined;
    const storedValue = key === 'data' ? encryptWalletData(value, dataKey!, await randomBytes(12)) : JSON.stringify({ version: 1, value });
    const stored = await Keychain.setGenericPassword(key, storedValue, {
      service,
      ...getIosKeychainAccessibilityOptions(),
      ...getAndroidKeystoreOptions(),
    });
    if (!stored) throw new Error(`Failed to store Keychain value for ${key}`);

    const storedCredentials = await Keychain.getGenericPassword({ service });
    const verifiedValue =
      key === 'data' && storedCredentials && dataKey
        ? decryptWalletData(BlueApp.readKeychainEnvelope(storedCredentials.password), dataKey)
        : await this.readKeychainStorageItem(key);
    if (verifiedValue !== value) throw new Error(`Failed to verify migrated Keychain value for ${key}`);

    if (key === 'data') {
      const manifestStored = await Keychain.setGenericPassword(
        'wallet-data-manifest',
        JSON.stringify({ active: nextSlot, generation: (manifest?.generation ?? 0) + 1 }),
        {
          service: BlueApp.WALLET_DATA_MANIFEST_SERVICE,
          ...getIosKeychainAccessibilityOptions(),
          ...getAndroidKeystoreOptions(),
        },
      );
      if (!manifestStored) throw new Error('Failed to commit wallet-data generation');
      this.biometricUnlockedData = securityOption ? value : undefined;
      if ((await this.getKeychainDataProtection()) !== securityOption) await this.setDataProtectionMarkers(securityOption);
    }
  }

  private static validatesEncryptedStoragePassword(data: string, password: string): boolean {
    try {
      const buckets = JSON.parse(data);
      if (!Array.isArray(buckets)) return false;
      return buckets.some(bucket => {
        if (typeof bucket !== 'string') return false;
        const plaintext = encryption.decrypt(bucket, password);
        if (!plaintext) return false;
        try {
          const parsed = JSON.parse(plaintext) as { wallets?: unknown };
          return Array.isArray(parsed?.wallets);
        } catch (_) {
          return false;
        }
      });
    } catch (_) {
      return false;
    }
  }

  private async migrateSecureStorageKey(key: string, storagePassword?: string): Promise<void> {
    if ((await this.getKeychainStorageItem(key)) !== null) {
      // A previous run may have committed the v2 item but failed to erase its
      // weaker legacy duplicate. Keep the v2 value authoritative and retry
      // cleanup on every migration until the native deletion is confirmed.
      if ((await getLegacySecureValue(key)) !== null) await removeLegacySecureValue(key);
      await AsyncStorage.removeItem(key);
      return;
    }

    // Prefer the old secure store over AsyncStorage. A build that could not see
    // the legacy store may have written an empty replacement to AsyncStorage.
    const legacyValue = await getLegacySecureValue(key);
    if (typeof legacyValue === 'string') {
      if (key === 'data' && BlueApp.isEncryptedStoragePayload(legacyValue)) {
        if (!storagePassword || !BlueApp.validatesEncryptedStoragePassword(legacyValue, storagePassword)) return;
        // Preserve the exact password that proved it can decrypt a wallet
        // bucket. Keychain must require that same application password on
        // future launches; never derive or substitute a migration password.
        await this.ensureStoragePasswordInKeychain(storagePassword);
      }
      const securityOption =
        key === 'data' && (await this.shouldProtectMigratedWalletData(legacyValue)) ? 'biometricsOrPasscode' : undefined;
      await this.setKeychainStorageItem(key, legacyValue, securityOption);
      await removeLegacySecureValue(key);
      await AsyncStorage.removeItem(key);
      return;
    }

    const asyncStorageValue = await AsyncStorage.getItem(key);
    if (asyncStorageValue !== null) {
      if (key === 'data' && BlueApp.isEncryptedStoragePayload(asyncStorageValue)) {
        if (!storagePassword || !BlueApp.validatesEncryptedStoragePassword(asyncStorageValue, storagePassword)) return;
        // Match the native legacy-store migration above for installations
        // whose fallback copy was left in AsyncStorage.
        await this.ensureStoragePasswordInKeychain(storagePassword);
      }
      const securityOption =
        key === 'data' && (await this.shouldProtectMigratedWalletData(asyncStorageValue)) ? 'biometricsOrPasscode' : undefined;
      await this.setKeychainStorageItem(key, asyncStorageValue, securityOption);
      await AsyncStorage.removeItem(key);
    }
  }

  private static isEncryptedStoragePayload(data: unknown): boolean {
    if (typeof data !== 'string') return false;
    try {
      const buckets = JSON.parse(data);
      return Array.isArray(buckets) && buckets.length > 0 && buckets.every(bucket => typeof bucket === 'string');
    } catch (_) {
      return false;
    }
  }

  private async shouldProtectMigratedWalletData(data: string): Promise<boolean> {
    const biometricsEnabled = (await this.getKeychainStorageItem('Biometrics')) === '1';
    return biometricsEnabled && !BlueApp.isEncryptedStoragePayload(data);
  }

  private async migrateLegacyBiometricSetting(): Promise<void> {
    const legacySetting = await this.getKeychainStorageItem('Biometrics');
    if (legacySetting === null) return;

    if (legacySetting === '1' && !(await hasGenericPassword({ service: BlueApp.BIOMETRIC_AUTH_SERVICE }))) {
      await Keychain.setGenericPassword(BlueApp.BIOMETRIC_AUTH_SERVICE, 'authentication-required', {
        service: BlueApp.BIOMETRIC_AUTH_SERVICE,
        accessible: KEYCHAIN_ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: getKeychainAccessControl('biometricsOrPasscode'),
        ...getAndroidKeystoreOptions(),
      });
    }

    // The legacy value has now been represented by a real Keychain credential.
    await this.removeItem('Biometrics');
  }

  async setKeychainDataProtection(securityOption?: KeychainSecurityOption): Promise<void> {
    let data = await this.getKeychainStorageItem('data');
    if (data === null) {
      if (this.wallets.length > 0) {
        throw new Error('Wallet data is missing while wallets remain loaded');
      }
      // A new/empty installation may enable app unlock before its first normal
      // save. Persist a real empty bucket so a successful Face ID unlock has a
      // valid data record to load and can advance the navigation gate.
      data = JSON.stringify({
        wallets: [],
        tx_metadata: this.tx_metadata ?? {},
        counterparty_metadata: this.counterparty_metadata ?? {},
      } satisfies TBucketStorage);
    }

    // Password-encrypted storage remains password-only. In that mode the
    // selected system authentication continues to guard sensitive in-app actions.
    const targetOption = BlueApp.isEncryptedStoragePayload(data) ? undefined : securityOption;
    const previousOption = await this.getKeychainDataProtection();
    if (!(await hasGenericPassword({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE }))) {
      // One-time envelope migration. The payload is encrypted once; every
      // subsequent policy change touches only the 32-byte data key.
      await this.setKeychainStorageItem('data', data, previousOption);
    }
    if (previousOption === targetOption) return;

    const dataKey = this.dataEncryptionKey ?? (await this.readDataEncryptionKey());
    if (!dataKey) throw new Error('Wallet data-encryption key is unavailable');
    this.dataEncryptionKey = dataKey;
    await this.storeDataEncryptionKey(dataKey, previousOption, BlueApp.DATA_KEY_BACKUP_SERVICE);

    const transactionStored = await Keychain.setGenericPassword(
      'data-key-rewrap',
      JSON.stringify({ previousOption: previousOption ?? 'disabled', targetOption: targetOption ?? 'disabled' }),
      {
        service: BlueApp.DATA_KEY_TRANSACTION_SERVICE,
        accessible: KEYCHAIN_ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      },
    );
    if (!transactionStored) throw new Error('Failed to record wallet data-key protection change');

    try {
      await this.storeDataEncryptionKey(dataKey, targetOption);
      await this.setDataProtectionMarkers(targetOption);
      this.biometricUnlockedData = targetOption ? data : undefined;
      await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_TRANSACTION_SERVICE });
      await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_BACKUP_SERVICE });
    } catch (error) {
      try {
        await this.storeDataEncryptionKey(dataKey, previousOption);
        await this.setDataProtectionMarkers(previousOption);
        this.biometricUnlockedData = previousOption ? data : undefined;
        await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_TRANSACTION_SERVICE });
        await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_BACKUP_SERVICE });
      } catch (rollbackError) {
        console.error('[BlueApp] Wallet data-key rollback failed; retaining the recovery key:', rollbackError);
      }
      throw error;
    }
  }

  async setKeychainDataBiometricProtection(enabled: boolean): Promise<void> {
    await this.setKeychainDataProtection(enabled ? 'biometricsOrPasscode' : undefined);
  }

  private async getDataKeyTransaction(): Promise<{
    previousOption?: KeychainSecurityOption;
    targetOption?: KeychainSecurityOption;
  } | null> {
    const credentials = await Keychain.getGenericPassword({ service: BlueApp.DATA_KEY_TRANSACTION_SERVICE });
    if (!credentials) return null;
    const transaction = JSON.parse(credentials.password) as { previousOption?: string; targetOption?: string };
    const parseOption = (option?: string): KeychainSecurityOption | undefined =>
      option === 'biometricsOrPasscode' || option === 'devicePasscode' ? option : undefined;
    return {
      previousOption: parseOption(transaction.previousOption),
      targetOption: parseOption(transaction.targetOption),
    };
  }

  private async recoverInterruptedDataKeyChange(): Promise<void> {
    const transaction = await this.getDataKeyTransaction();
    if (!transaction) {
      // A process can stop after writing the recovery copy but before writing
      // the transaction record. The primary key is still authoritative in
      // that state, so remove the orphaned duplicate on the next unlock.
      await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_BACKUP_SERVICE });
      return;
    }
    const dataKey = await this.readDataEncryptionKey(false, BlueApp.DATA_KEY_BACKUP_SERVICE);
    if (!dataKey) throw new Error('Wallet data-key recovery entry is unavailable');

    await this.storeDataEncryptionKey(dataKey, transaction.targetOption);
    await this.setDataProtectionMarkers(transaction.targetOption);
    this.dataEncryptionKey = dataKey;
    await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_TRANSACTION_SERVICE });
    await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_BACKUP_SERVICE });
  }

  async getKeychainDataProtection(): Promise<KeychainSecurityOption | undefined> {
    const keyTransaction = await this.getDataKeyTransaction();
    if (keyTransaction) return keyTransaction.targetOption ?? keyTransaction.previousOption;
    if (
      await hasGenericPassword({
        service: BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE,
      })
    )
      return 'devicePasscode';
    if (
      await hasGenericPassword({
        service: BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE,
      })
    )
      return 'biometricsOrPasscode';
    return undefined;
  }

  async getConfiguredKeychainSecurityOption(): Promise<KeychainSecurityOption | undefined> {
    const [passcodeDataProtection, biometricDataProtection, passcodeMarker, biometricMarker] = await Promise.all([
      hasGenericPassword({ service: BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE }),
      hasGenericPassword({ service: BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE }),
      hasGenericPassword({ service: BlueApp.DEVICE_PASSCODE_AUTH_SERVICE }),
      hasGenericPassword({ service: BlueApp.BIOMETRIC_AUTH_SERVICE }),
    ]);
    if (passcodeDataProtection && biometricDataProtection) throw new Error('Conflicting wallet-data security policies');
    if (!passcodeDataProtection && !biometricDataProtection && passcodeMarker && biometricMarker) {
      throw new Error('Conflicting authentication security policies');
    }

    const dataProtection = passcodeDataProtection ? 'devicePasscode' : biometricDataProtection ? 'biometricsOrPasscode' : undefined;
    // The policy recorded for the wallet data-encryption key is authoritative. An
    // interrupted policy switch can leave an obsolete auxiliary marker, but
    // that marker must never lock out data protected by a valid Keychain item.
    if (dataProtection) return dataProtection;
    if (passcodeMarker) return 'devicePasscode';
    if (biometricMarker) return 'biometricsOrPasscode';
    return undefined;
  }

  async hasKeychainDataBiometricProtection(): Promise<boolean> {
    return (await this.getKeychainDataProtection()) !== undefined;
  }

  async migrateKeys() {
    await this.ensureCurrentIosInstallation();
    await this.removeLegacyRealmKeyValueBackup();

    for (const key of BlueApp.secureStorageKeys) {
      try {
        await this.migrateSecureStorageKey(key);
      } catch (error) {
        // Never delete either source when the Keychain write cannot be verified.
        console.warn(`Failed to migrate secure-storage key ${key}:`, error);
      }
    }

    try {
      await this.migrateLegacyBiometricSetting();
    } catch (error) {
      // Preserve the old value if the protected credential could not be
      // created. A later launch can retry without silently disabling access.
      console.warn('Failed to migrate legacy biometric setting:', error);
    }

    for (const key of BlueApp.keys2migrate) {
      try {
        if ((await AsyncStorage.getItem(key)) !== null) continue;
        const value = await getLegacySecureValue(key);
        if (typeof value === 'string') {
          await AsyncStorage.setItem(key, value);
          await removeLegacySecureValue(key);
        }
      } catch (error) {
        console.warn(`Failed to migrate preference key ${key}:`, error);
      }
    }
  }

  /** Stores wallet state in a dedicated native Keychain service. */
  setItem = async (key: string, value: any): Promise<void> => {
    await this.ensureCurrentIosInstallation();
    const securityOption = key === 'data' && !this.cachedPassword ? await this.getConfiguredKeychainSecurityOption() : undefined;
    if (key === 'data' && (await hasGenericPassword({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE }))) {
      const currentOption = await this.getKeychainDataProtection();
      if (currentOption !== securityOption) await this.setKeychainDataProtection(securityOption);
    }
    await this.setKeychainStorageItem(key, String(value), securityOption);
    await removeLegacySecureValue(key);
    await AsyncStorage.removeItem(key);
  };

  /** Reads wallet state, migrating a legacy value on first access. */
  getItem = async (key: string, storagePassword?: string): Promise<any> => {
    await this.ensureCurrentIosInstallation();
    await this.migrateSecureStorageKey(key, storagePassword);
    const keychainValue = await this.getKeychainStorageItem(key);
    if (keychainValue !== null || key !== 'data') return keychainValue;

    // Encrypted legacy data intentionally remains at its source until a
    // password validates it. Return the ciphertext read-only so callers can
    // detect password storage and request that password without migrating it.
    const legacyValue = await getLegacySecureValue(key);
    if (typeof legacyValue === 'string') return legacyValue;
    return await AsyncStorage.getItem(key);
  };

  removeItem = async (key: string): Promise<void> => {
    await Keychain.resetGenericPassword({
      service: BlueApp.storageKeychainService(key),
    });
    if (key === 'data') {
      this.biometricUnlockedData = undefined;
      this.dataEncryptionKey = undefined;
      await Keychain.resetGenericPassword({ service: BlueApp.DATA_ENCRYPTION_KEY_SERVICE });
      await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_BACKUP_SERVICE });
      await Keychain.resetGenericPassword({ service: BlueApp.DATA_KEY_TRANSACTION_SERVICE });
      await Keychain.resetGenericPassword({ service: BlueApp.WALLET_DATA_SECONDARY_SERVICE });
      await Keychain.resetGenericPassword({ service: BlueApp.WALLET_DATA_MANIFEST_SERVICE });
      await Keychain.resetGenericPassword({
        service: BlueApp.BIOMETRIC_DATA_PROTECTION_SERVICE,
      });
      await Keychain.resetGenericPassword({
        service: BlueApp.DEVICE_PASSCODE_DATA_PROTECTION_SERVICE,
      });
    }
    await removeLegacySecureValue(key);
    await AsyncStorage.removeItem(key);
  };

  async removeBiometricPassword(): Promise<void> {
    await Keychain.resetGenericPassword({
      service: BlueApp.BIOMETRIC_PASSWORD_SERVICE,
    });
  }

  static BIOMETRIC_PASSWORD_SERVICE = 'BlueWalletBiometricPassword';

  storageIsEncrypted = async (): Promise<boolean> => {
    let data;
    try {
      data = await this.getItem('data');
    } catch (error: any) {
      console.warn('error reading `data` while checking storage encryption:', error.message);
      throw error;
    }

    try {
      return BlueApp.isEncryptedStoragePayload(data);
    } finally {
      // Older versions persisted a separate boolean. The payload now provides
      // the source of truth, so remove either legacy implementation lazily.
      try {
        await this.removeItem(BlueApp.LEGACY_FLAG_ENCRYPTED);
      } catch (_) {}
    }
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
      await this.removeBiometricPassword();
      await this.saveToDisk();
      await this.clearStoragePasswordsFromKeychain();
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
    // Abort before changing storage if an obsolete biometric password cannot
    // be removed. This prevents encrypted data from retaining a biometric path.
    await this.removeBiometricPassword();
    await this.saveToDisk();
    let data = await this.getItem('data');
    // TODO: refactor ^^^ (should not save & load to fetch data)

    const encrypted = encryption.encrypt(data, password);
    data = [];
    data.push(encrypted); // putting in array as we might have many buckets with storages
    data = JSON.stringify(data);
    await this.ensureStoragePasswordInKeychain(password);
    this.cachedPassword = password;
    await this.setItem('data', data);
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
    await this.ensureStoragePasswordInKeychain(fakePassword);
    await this.setItem('data', bucketsString);
    return (await this.getItem('data')) === bucketsString;
  };

  private storagePasswordKeychainOptions(password: string, service: string) {
    return {
      service,
      accessible: KEYCHAIN_ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: ACCESS_CONTROL.APPLICATION_PASSWORD,
      applicationPassword: password,
    };
  }

  private async ensureStoragePasswordInKeychain(password: string): Promise<void> {
    if (Platform.OS !== 'ios') return;

    const services = (await Keychain.getAllGenericPasswordServices({ skipUIAuth: true })).filter(service =>
      service.startsWith(BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX),
    );
    for (const service of services) {
      try {
        const credentials = await Keychain.getGenericPassword(this.storagePasswordKeychainOptions(password, service));
        if (credentials && credentials.password === password) return;
      } catch (error: any) {
        // Other plausible-deniability buckets reject this application password.
        if (`${error?.code}` !== '-25293') throw error;
      }
    }

    const service = `${BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX}${uint8ArrayToHex(await randomBytes(16))}`;
    await Keychain.setGenericPassword(service, password, this.storagePasswordKeychainOptions(password, service));
  }

  async clearStoragePasswordsFromKeychain(): Promise<void> {
    if (Platform.OS !== 'ios') return;

    const services = await Keychain.getAllGenericPasswordServices({ skipUIAuth: true });
    await Promise.all(
      services
        .filter(service => service.startsWith(BlueApp.STORAGE_PASSWORD_KEYCHAIN_PREFIX))
        .map(service => Keychain.resetGenericPassword({ service })),
    );
  }

  hashIt = (s: string): string => {
    return uint8ArrayToHex(sha256(s));
  };

  /**
   * Returns instace of the Realm database, which is encrypted either by cached user's password OR default password.
   * Database file is deterministically derived from encryption key.
   */
  async getRealmForTransactions() {
    const cacheFolderPath = RNFS.CachesDirectoryPath; // Path to cache folder
    const password = this.hashIt(this.cachedPassword || 'fyegjitkyf[eqjnc.lf');
    const buf = hexToUint8Array(this.hashIt(password) + this.hashIt(password));
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
   * Loads from storage all wallets and
   * maps them to `this.wallets`
   *
   * @param password If present means storage must be decrypted before usage
   * @returns {Promise.<boolean>}
   */
  async loadFromDisk(password?: string): Promise<boolean> {
    await this.removeLegacyRealmKeyValueBackup();

    // Wrap inside a try so if anything goes wrong it wont block loadFromDisk from continuing
    try {
      await this.moveRealmFilesToCacheDirectory();
    } catch (error: any) {
      console.warn('moveRealmFilesToCacheDirectory error:', error.message);
    }
    let dataRaw = await this.getItem('data', password);
    if (password) {
      dataRaw = this.decryptData(dataRaw, password);
      if (dataRaw) {
        // password is good, cache it
        this.cachedPassword = password;
        await this.ensureStoragePasswordInKeychain(password);
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
          if (realm) this.inflateWalletFromRealm(realm, unserializedWallet);
        } catch (error: any) {
          presentAlert({ message: error.message });
        }

        const ID = unserializedWallet.getID();
        // done
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
        // Legacy single-address wallets - store under index 0
        walletToInflate._txs_by_external_index = walletToInflate._txs_by_external_index || {};
        walletToInflate._txs_by_external_index[0] = walletToInflate._txs_by_external_index[0] || [];
        const transaction = JSON.parse(tx.tx);
        walletToInflate._txs_by_external_index[0].push(transaction);
      }
    }
  }

  offloadWalletToRealm(realm: Realm, wallet: TWallet): void {
    const id = wallet.getID();
    const walletToSave = ('_hdWalletInstance' in wallet && wallet._hdWalletInstance) || wallet;

    if (walletToSave._txs_by_external_index) {
      realm.write(() => {
        // cleanup all existing transactions for the wallet first
        const walletTransactionsToDelete = realm.objects('WalletTransactions').filtered(`walletid = '${id}'`);
        realm.delete(walletTransactionsToDelete);

        // insert new ones:
        for (const [indexStr, txs] of Object.entries(walletToSave._txs_by_external_index)) {
          for (const tx of txs) {
            realm.create(
              'WalletTransactions',
              {
                walletid: id,
                internal: false,
                index: parseInt(indexStr, 10),
                tx: JSON.stringify(tx),
              },
              Realm.UpdateMode.Modified,
            );
          }
        }

        for (const [indexStr, txs] of Object.entries(walletToSave._txs_by_internal_index)) {
          for (const tx of txs) {
            realm.create(
              'WalletTransactions',
              {
                walletid: id,
                internal: true,
                index: parseInt(indexStr, 10),
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
      if (++savingInProgress > 10)
        presentAlert({
          message: 'Critical error. Last actions were not saved',
        }); // should never happen
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
        let buckets = await this.getItem('data');
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
    } catch (error: any) {
      console.error('save to disk exception:', error.message);
      presentAlert({ message: 'save to disk exception: ' + error.message });
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
      await Promise.all(
        this.wallets.map(async wallet => {
          console.log('fetching balance for', wallet.getLabel());
          await wallet.fetchBalance();
        }),
      );
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
      await Promise.all(
        this.wallets.map(async wallet => {
          await wallet.fetchTransactions();
          if ('fetchPendingTransactions' in wallet) {
            await wallet.fetchPendingTransactions();
            await wallet.fetchUserInvoices();
          }
        }),
      );
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
        return b.timestamp - a.timestamp;
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

  private async removeLegacyRealmKeyValueBackup(): Promise<void> {
    for (const directory of [RNFS.CachesDirectoryPath, RNFS.DocumentDirectoryPath]) {
      const path = `${directory}/keyvalue.realm`;
      try {
        if (await RNFS.exists(path)) Realm.deleteFile({ path });

        if (await RNFS.exists(directory)) {
          const leftovers = (await RNFS.readDir(directory)).filter(file => file.name.startsWith('keyvalue.realm'));
          for (const file of leftovers) {
            if (await RNFS.exists(file.path)) await RNFS.unlink(file.path);
          }
        }
      } catch (error) {
        console.warn(`Failed to remove legacy Realm wallet backup at ${path}:`, error);
      }
    }

    try {
      await Keychain.resetGenericPassword({
        service: BlueApp.LEGACY_REALM_KEY_VALUE_SERVICE,
      });
    } catch (error) {
      console.warn('Failed to remove legacy Realm wallet-backup key:', error);
    }
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
