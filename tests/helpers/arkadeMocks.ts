/**
 * Reusable test helpers around the Arkade Realm + Keychain Jest mocks installed
 * in tests/setup.js. The mock factories themselves must live in setup.js
 * because Jest hoists `jest.mock()` above module scope and refuses out-of-scope
 * captures, but each individual test still needs to reset the mock state and
 * inspect or seed it. Centralising those calls here avoids per-test
 * boilerplate and keeps the shape stable as the harness grows.
 *
 * Three sets of adjacent module-private caches need resetting between tests:
 *   - The Realm adapter's `realmInstances` / `openInFlight` (closed via
 *     closeAllArkadeRealms + the __testing__ accessor).
 *   - The wallet module's `staticWalletCache`, `staticSwapsCache`,
 *     `initInFlight`, `boardingLock` (exposed via wallet `__testing__`).
 *   - The mock backing stores in setup.js (Realm files-on-disk, Keychain
 *     credential map, FS existence set).
 * Without all three, a test that opens a Realm leaks a closed instance into
 * the next test, which then sees a ghost cached entry that fails the
 * `isClosed` short-circuit asynchronously.
 */

import { closeAllArkadeRealms, __testing__ as realmTesting } from '../../blue_modules/arkade-adapters/realm/realmInstance';
import { __testing__ as walletTesting } from '../../class/wallets/lightning-ark-wallet';

const Realm = require('realm');

const Keychain = require('react-native-keychain');

const RNFS = require('react-native-fs');

/**
 * Reset every piece of mock state the Arkade test harness depends on:
 * - mocked Realm files-on-disk + open instances
 * - mocked Keychain credential store
 * - mocked react-native-fs existence set
 * - LightningArkWallet's process-wide caches and in-flight init promises
 *
 * Call from `beforeEach`.
 */
export function resetArkadeTestState(): void {
  // Drop adapter-level Realm instance refs first. closeAllArkadeRealms walks
  // realmInstances and closes each, which would no-op against the mock but
  // also removes them from the map. openInFlight isn't touched by the close
  // helpers (it self-clears in the success/error path) so we clear it
  // explicitly to drop any test-leaked promise.
  closeAllArkadeRealms();
  realmTesting.openInFlight.clear();

  Realm.__mockRealmHelpers.reset();
  Keychain.__mockKeychainHelpers.reset();
  RNFS.__mockFsHelpers.reset();

  for (const k of Object.keys(walletTesting.staticWalletCache)) delete walletTesting.staticWalletCache[k];
  for (const k of Object.keys(walletTesting.staticSwapsCache)) delete walletTesting.staticSwapsCache[k];
  walletTesting.initInFlight.clear();
  walletTesting.restoreInFlight.clear();
  for (const k of Object.keys(walletTesting.boardingLock)) delete walletTesting.boardingLock[k];
}

/**
 * Clear all `mock.calls` history on the spies the Ark tests inspect.
 * Useful when a test wants to assert call counts after a setup phase that
 * also exercised the mocks.
 */
export function clearArkadeMockCallHistory(): void {
  Realm.open.mockClear();
  Realm.exists.mockClear();
  Realm.deleteFile.mockClear();
  Keychain.setGenericPassword.mockClear();
  Keychain.getGenericPassword.mockClear();
  Keychain.resetGenericPassword.mockClear();
  Keychain.getSecurityLevel.mockClear();
}

/** Direct accessors for tests that need to inspect/seed mock state. */
export const arkadeMockState = {
  realmFiles: () => Realm.__mockRealmHelpers.files as Set<string>,
  realmInstances: () => Realm.__mockRealmHelpers.store as Map<string, unknown>,
  keychainStore: () => Keychain.__mockKeychainHelpers.store as Map<string, { username: string; password: string; service: string }>,
  /** Seed a Keychain entry directly, e.g. to simulate a leaked-from-previous-run state. */
  seedKeychain(service: string, password: string): void {
    Keychain.__mockKeychainHelpers.store.set(service, { username: service, password, service });
  },
};
