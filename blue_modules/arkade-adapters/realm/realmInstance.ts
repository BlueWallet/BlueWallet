import RNFS from 'react-native-fs';
import Realm from 'realm';
import Keychain, { ACCESSIBLE, SECURITY_LEVEL } from 'react-native-keychain';

import { ArkRealmSchemas, ARK_REALM_SCHEMA_VERSION, runArkRealmMigrations } from '@arkade-os/sdk/repositories/realm';
import { BoltzRealmSchemas } from '@arkade-os/boltz-swap/repositories/realm';
import { randomBytes } from '../../../class/rng';
import { uint8ArrayToHex, hexToUint8Array } from '../../uint8array-extras';
import { ArkSwapNotificationSuppressionSchema } from './notificationSuppressionRepository';

const AllArkadeSchemas = [...ArkRealmSchemas, ...BoltzRealmSchemas, ArkSwapNotificationSuppressionSchema];

// App-owned schemas added on top of the SDK's. Bump when an app-owned schema
// changes; SDK bumps are handled by ARK_REALM_SCHEMA_VERSION. Realm requires
// a strictly increasing schemaVersion when objects are added; computing
// `SDK + offset` keeps the local additions ahead of any future SDK bump.
const LOCAL_ARK_SCHEMA_OFFSET = 1;
const ARKADE_REALM_SCHEMA_VERSION = ARK_REALM_SCHEMA_VERSION + LOCAL_ARK_SCHEMA_OFFSET;

const realmInstances: Map<string, Realm> = new Map();
const openInFlight: Map<string, Promise<Realm>> = new Map();

// Files live in a dedicated subdirectory so BlueApp.moveRealmFilesToCacheDirectory()
// — which sweeps top-level *.realm files from Documents into the OS-purgeable cache
// — never sees them. RNFS.readDir is non-recursive, so the subdirectory is invisible
// to that scan. Ark Realm holds non-recoverable swap/claim data and must stay in
// Documents.
const arkadeDir = (): string => `${RNFS.DocumentDirectoryPath}/arkade`;
const realmPathFor = (namespace: string): string => `${arkadeDir()}/arkade-${namespace}.realm`;
const keychainServiceFor = (namespace: string): string => `arkade_realm_${namespace}`;

async function ensureArkadeDir(): Promise<void> {
  const dir = arkadeDir();
  if (!(await RNFS.exists(dir))) await RNFS.mkdir(dir);
}

async function loadOrCreateEncryptionKey(namespace: string): Promise<Uint8Array> {
  const service = keychainServiceFor(namespace);

  const credentials = await Keychain.getGenericPassword({ service });
  if (credentials) return hexToUint8Array(credentials.password);

  const buf = await randomBytes(64);
  const password = uint8ArrayToHex(buf);

  // Accessibility: match the rest of the app's secret accessibility. RNSecureKeyStore
  // in class/blue-app.ts and hooks/useBiometrics.ts both use WHEN_UNLOCKED_THIS_DEVICE_ONLY;
  // the default of AFTER_FIRST_UNLOCK would expose the Realm key while the device is locked.
  //
  // Security level: preflight via getSecurityLevel() rather than try/catch around
  // SECURE_HARDWARE. getSecurityLevel returns null on iOS (where the option is moot)
  // and the highest supported level on Android. We only opt into SECURE_HARDWARE when
  // the device actually backs it; otherwise let react-native-keychain pick its default.
  // Catching every setGenericPassword error and silently retrying with ANY (the previous
  // shape) downgrades on unrelated failures — preflight surfaces those instead.
  const supportedLevel = await Keychain.getSecurityLevel();
  const opts: Parameters<typeof Keychain.setGenericPassword>[2] = {
    service,
    accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
  if (supportedLevel === SECURITY_LEVEL.SECURE_HARDWARE) {
    opts.securityLevel = SECURITY_LEVEL.SECURE_HARDWARE;
  }
  await Keychain.setGenericPassword(service, password, opts);

  return hexToUint8Array(password);
}

/**
 * Returns a per-wallet Realm instance keyed by `namespace`. Each Ark wallet
 * gets its own encrypted Realm file and its own Keychain entry so wallets
 * never collide on WalletState/contracts/swaps and storage buckets stay
 * isolated.
 *
 * Concurrent callers for the same namespace receive the same in-flight
 * promise. Errors are surfaced to the caller; the in-flight entry is cleared
 * so a later retry can succeed.
 */
export async function getArkadeRealm(namespace: string): Promise<Realm> {
  const cached = realmInstances.get(namespace);
  if (cached && !cached.isClosed) return cached;
  if (cached && cached.isClosed) realmInstances.delete(namespace);

  const inFlight = openInFlight.get(namespace);
  if (inFlight) return inFlight;

  const opening = (async () => {
    await ensureArkadeDir();

    const encryptionKey = await loadOrCreateEncryptionKey(namespace);

    const realm = await Realm.open({
      schema: AllArkadeSchemas as unknown as Realm.ObjectSchema[],
      schemaVersion: ARKADE_REALM_SCHEMA_VERSION,
      onMigration: (oldRealm, newRealm) => {
        runArkRealmMigrations(oldRealm, newRealm);
      },
      path: realmPathFor(namespace),
      encryptionKey,
      excludeFromIcloudBackup: true,
    });

    realmInstances.set(namespace, realm);
    return realm;
  })();

  openInFlight.set(namespace, opening);
  try {
    return await opening;
  } finally {
    openInFlight.delete(namespace);
  }
}

/**
 * Close the cached Realm for `namespace`, if any. The file and Keychain
 * entry are preserved.
 */
export function closeArkadeRealm(namespace: string): void {
  const realm = realmInstances.get(namespace);
  if (realm && !realm.isClosed) {
    realm.removeAllListeners();
    realm.close();
  }
  realmInstances.delete(namespace);
}

/**
 * Close every cached Arkade Realm instance. Used on app shutdown / sign out.
 */
export function closeAllArkadeRealms(): void {
  for (const ns of Array.from(realmInstances.keys())) {
    closeArkadeRealm(ns);
  }
}

/**
 * Delete the Realm file and the Keychain entry for `namespace`. Used when
 * an Ark wallet is removed. Failures are logged but do not throw — leaving
 * an orphan file or Keychain entry is preferable to crashing the app's
 * delete path. Ark Realm failures stay scoped to the Ark wallet path.
 *
 * The Keychain encryption key is reset only when the Realm file is gone
 * (or never existed). Resetting the key while the encrypted file remains
 * would leave the user unable to open the orphan on a future re-import:
 * a fresh random key would be generated and the old file's ciphertext
 * could not be decrypted.
 */
export async function deleteArkadeRealm(namespace: string): Promise<void> {
  closeArkadeRealm(namespace);

  const path = realmPathFor(namespace);
  let realmRemoved = false;
  try {
    // Realm.deleteFile is sync and removes the .realm + .lock + .management
    // siblings in one call. It is forgiving when the file does not exist
    // (no-op), but we guard via Realm.exists to keep behavior explicit.
    if (Realm.exists(path)) {
      Realm.deleteFile({ path });
    }
    realmRemoved = true;
  } catch (e: any) {
    console.log(`[ArkadeRealm] Realm.deleteFile failed for ${path}:`, e?.message ?? e);
  }

  // Best-effort sweep of any sibling files Realm.deleteFile might have left
  // behind. These are not load-bearing for re-import; failures are tolerated.
  for (const suffix of ['.note']) {
    const sibling = `${path}${suffix}`;
    try {
      if (await RNFS.exists(sibling)) await RNFS.unlink(sibling);
    } catch (e: any) {
      console.log(`[ArkadeRealm] failed to delete ${sibling}:`, e?.message ?? e);
    }
  }

  if (!realmRemoved) {
    console.log(
      `[ArkadeRealm] keeping encryption key for ${namespace} because Realm file cleanup failed; key preserved so a future delete retry can still decrypt the orphan`,
    );
    return;
  }

  try {
    await Keychain.resetGenericPassword({ service: keychainServiceFor(namespace) });
  } catch (e: any) {
    console.log(`[ArkadeRealm] failed to reset keychain for ${namespace}:`, e?.message ?? e);
  }
}

// Exported for tests only.
export const __testing__ = {
  realmInstances,
  openInFlight,
  realmPathFor,
  keychainServiceFor,
};
