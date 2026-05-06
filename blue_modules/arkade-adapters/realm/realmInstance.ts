import RNFS from 'react-native-fs';
import Realm from 'realm';
import Keychain, { ACCESSIBLE } from 'react-native-keychain';

import { ArkRealmSchemas, ARK_REALM_SCHEMA_VERSION, runArkRealmMigrations } from '@arkade-os/sdk/repositories/realm';
import { BoltzRealmSchemas } from '@arkade-os/boltz-swap/repositories/realm';
import { randomBytes } from '../../../class/rng';
import { uint8ArrayToHex, hexToUint8Array } from '../../uint8array-extras';

const AllArkadeSchemas = [...ArkRealmSchemas, ...BoltzRealmSchemas];

const realmInstances: Map<string, Realm> = new Map();
const openInFlight: Map<string, Promise<Realm>> = new Map();

// Files live in a dedicated subdirectory so BlueApp.moveRealmFilesToCacheDirectory()
// — which sweeps top-level *.realm files from Documents into the OS-purgeable cache
// — never sees them. RNFS.readDir is non-recursive, so the subdirectory is invisible
// to that scan. Ark Realm holds non-recoverable swap/claim data and must stay in
// Documents (Invariant 9).
const arkadeDir = (): string => `${RNFS.DocumentDirectoryPath}/arkade`;
const realmPathFor = (namespace: string): string => `${arkadeDir()}/arkade-${namespace}.realm`;
const keychainServiceFor = (namespace: string): string => `arkade_realm_${namespace}`;

async function ensureArkadeDir(): Promise<void> {
  const dir = arkadeDir();
  if (!(await RNFS.exists(dir))) await RNFS.mkdir(dir);
}

/**
 * Returns a per-wallet Realm instance keyed by `namespace`. Each Ark wallet
 * gets its own encrypted Realm file and its own Keychain entry so wallets
 * never collide on WalletState/contracts/swaps and storage buckets stay
 * isolated.
 */
export async function getArkadeRealm(namespace: string): Promise<Realm> {
  const cached = realmInstances.get(namespace);
  if (cached && !cached.isClosed) return cached;

  const inFlight = openInFlight.get(namespace);
  if (inFlight) return inFlight;

  const opening = (async () => {
    await ensureArkadeDir();

    const service = keychainServiceFor(namespace);
    let password: string;

    const credentials = await Keychain.getGenericPassword({ service });
    if (credentials) {
      password = credentials.password;
    } else {
      const buf = await randomBytes(64);
      password = uint8ArrayToHex(buf);
      // Match the rest of the app's secret accessibility (RNSecureKeyStore in
      // class/blue-app.ts and hooks/useBiometrics.ts both use WHEN_UNLOCKED_THIS_DEVICE_ONLY).
      // Default of AFTER_FIRST_UNLOCK would expose the Realm key while the device is locked.
      await Keychain.setGenericPassword(service, password, {
        service,
        accessible: ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }

    const encryptionKey = hexToUint8Array(password);

    const realm = await Realm.open({
      schema: AllArkadeSchemas as unknown as Realm.ObjectSchema[],
      schemaVersion: ARK_REALM_SCHEMA_VERSION,
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
  if (realm && !realm.isClosed) realm.close();
  realmInstances.delete(namespace);
}

/**
 * Close every cached Arkade Realm instance.
 */
export function closeAllArkadeRealms(): void {
  for (const [ns, realm] of realmInstances) {
    if (!realm.isClosed) realm.close();
    realmInstances.delete(ns);
  }
}

/**
 * Delete the Realm file and the Keychain entry for `namespace`. Used when
 * an Ark wallet is removed.
 */
export async function deleteArkadeRealm(namespace: string): Promise<void> {
  closeArkadeRealm(namespace);

  const path = realmPathFor(namespace);
  const lockPath = `${path}.lock`;
  const managementPath = `${path}.management`;
  const notePath = `${path}.note`;

  for (const p of [path, lockPath, managementPath, notePath]) {
    try {
      if (await RNFS.exists(p)) await RNFS.unlink(p);
    } catch (e: any) {
      console.log(`[ArkadeRealm] failed to delete ${p}:`, e?.message ?? e);
    }
  }

  try {
    await Keychain.resetGenericPassword({ service: keychainServiceFor(namespace) });
  } catch (e: any) {
    console.log(`[ArkadeRealm] failed to reset keychain for ${namespace}:`, e?.message ?? e);
  }
}
