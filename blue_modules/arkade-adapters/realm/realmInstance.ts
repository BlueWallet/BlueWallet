import RNFS from 'react-native-fs';
import Realm from 'realm';
import Keychain from 'react-native-keychain';

import { ArkRealmSchemas } from '@arkade-os/sdk/repositories/realm';
import { BoltzRealmSchemas } from '@arkade-os/boltz-swap/repositories/realm';
import { randomBytes } from '../../../class/rng';
import { uint8ArrayToHex, hexToUint8Array } from '../../uint8array-extras';

const AllArkadeSchemas = [...ArkRealmSchemas, ...BoltzRealmSchemas];

const realmInstances: Map<string, Realm> = new Map();

/**
 * Returns a per-wallet Realm instance keyed by `namespace` (a hash of the
 * wallet secret). Each wallet gets its own encrypted Realm file and its
 * own keychain entry, so:
 *
 * - Multiple wallets never collide on WalletState or contracts.
 * - Plausible-deniability storage buckets stay isolated — a hidden
 *   wallet's Ark data lives in a separate file with a separate key.
 */
export async function getArkadeRealm(namespace: string): Promise<Realm> {
  const cached = realmInstances.get(namespace);
  if (cached && !cached.isClosed) {
    return cached;
  }

  const cacheFolderPath = RNFS.CachesDirectoryPath;
  const service = `arkade_realm_${namespace}`;
  let password: string;

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
  const path = `${cacheFolderPath}/arkade-${namespace}.realm`;

  // @ts-ignore schema doesn't match Realm's schema type
  const realm = await Realm.open({
    // @ts-ignore schema doesn't match Realm's schema type
    schema: AllArkadeSchemas,
    path,
    encryptionKey,
    excludeFromIcloudBackup: true,
  });

  realmInstances.set(namespace, realm);
  return realm;
}

/**
 * Close all cached Arkade Realm instances and release their resources.
 */
export function closeArkadeRealm(): void {
  for (const [key, realm] of realmInstances) {
    if (!realm.isClosed) {
      realm.close();
    }
    realmInstances.delete(key);
  }
}
