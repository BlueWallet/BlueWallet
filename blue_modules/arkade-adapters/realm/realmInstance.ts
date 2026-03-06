import RNFS from 'react-native-fs';
import Realm from 'realm';
import Keychain from 'react-native-keychain';

import { ArkRealmSchemas } from '@arkade-os/sdk/repositories/realm';
import { BoltzRealmSchemas } from '@arkade-os/boltz-swap/repositories/realm';
import { randomBytes } from '../../../class/rng';
import { uint8ArrayToHex, hexToUint8Array } from '../../uint8array-extras';

const AllArkadeSchemas = [...ArkRealmSchemas, ...BoltzRealmSchemas];

let realmInstance: Realm | null = null;

/**
 * Returns a lazy singleton Realm instance for Arkade data, encrypted with
 * a random key stored in the device keychain. The database file lives in
 * CachesDirectoryPath alongside the existing key-value Realm.
 */
export async function getArkadeRealm(): Promise<Realm> {
  if (realmInstance && !realmInstance.isClosed) {
    return realmInstance;
  }

  const cacheFolderPath = RNFS.CachesDirectoryPath;
  const service = 'arkade_realm_encryption_key';
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
  const path = `${cacheFolderPath}/arkade.realm`;

  // @ts-ignore schema doesn't match Realm's schema type
  realmInstance = await Realm.open({
    // @ts-ignore schema doesn't match Realm's schema type
    schema: AllArkadeSchemas,
    path,
    encryptionKey,
    excludeFromIcloudBackup: true,
  });

  return realmInstance;
}

/**
 * Close the cached Arkade Realm instance and release its resources.
 */
export function closeArkadeRealm(): void {
  if (realmInstance && !realmInstance.isClosed) {
    realmInstance.close();
  }
  realmInstance = null;
}
