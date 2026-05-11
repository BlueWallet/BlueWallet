import assert from 'assert';

import { LightningArkWallet, __testing__ as walletTesting } from '../../class/wallets/lightning-ark-wallet.ts';
import { __testing__ as realmTesting } from '../../blue_modules/arkade-adapters/realm/realmInstance';

const Realm = require('realm');
const Keychain = require('react-native-keychain');

const TEST_SECRET = 'arkade://abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

beforeEach(() => {
  // Clear module-private wallet caches between tests so namespaces start cold.
  for (const k of Object.keys(walletTesting.staticWalletCache)) delete walletTesting.staticWalletCache[k];
  for (const k of Object.keys(walletTesting.staticSwapsCache)) delete walletTesting.staticSwapsCache[k];
  walletTesting.initInFlight.clear();
  for (const k of Object.keys(walletTesting.boardingLock)) delete walletTesting.boardingLock[k];

  Realm.__mockRealmHelpers.reset();
  Keychain.__mockKeychainHelpers.reset();
  Realm.deleteFile.mockClear();
  Realm.exists.mockClear();
  Keychain.resetGenericPassword.mockClear();
});

describe('LightningArkWallet.onDelete', () => {
  it('clears caches and Realm/Keychain when no init is in flight', async () => {
    const w = new LightningArkWallet();
    w.setSecret(TEST_SECRET);
    const namespace = w.getNamespace();

    // Pretend a previous init populated caches.
    walletTesting.staticWalletCache[namespace] = { tag: 'wallet' } as any;
    walletTesting.staticSwapsCache[namespace] = { tag: 'swaps' } as any;
    walletTesting.boardingLock[namespace] = true;
    Keychain.__mockKeychainHelpers.store.set(realmTesting.keychainServiceFor(namespace), {
      username: 'svc',
      password: 'beef',
      service: realmTesting.keychainServiceFor(namespace),
    });

    await w.onDelete();

    assert.strictEqual(walletTesting.staticWalletCache[namespace], undefined);
    assert.strictEqual(walletTesting.staticSwapsCache[namespace], undefined);
    assert.strictEqual(walletTesting.boardingLock[namespace], undefined);
    assert.ok(!walletTesting.initInFlight.has(namespace));
    assert.strictEqual(Keychain.resetGenericPassword.mock.calls.length, 1);
  });

  it('drains in-flight init and undoes its cache resurrection (race fix)', async () => {
    const w = new LightningArkWallet();
    w.setSecret(TEST_SECRET);
    const namespace = w.getNamespace();

    // Inject a controlled in-flight init so we can interleave onDelete with its tail.
    let resolveInit!: (v: { wallet: any; arkadeSwaps: any }) => void;
    const inFlight = new Promise<{ wallet: any; arkadeSwaps: any }>(resolve => {
      resolveInit = resolve;
    });

    // Simulate the init IIFE's tail: when Wallet.create resolves, the IIFE
    // synchronously writes the static caches. We register this BEFORE onDelete
    // attaches its own .then so it fires first when inFlight settles.
    inFlight.then(({ wallet, arkadeSwaps }) => {
      walletTesting.staticWalletCache[namespace] = wallet;
      walletTesting.staticSwapsCache[namespace] = arkadeSwaps;
    });
    // Simulate init()'s outer continuation that re-assigns this._wallet on the
    // wallet instance. This is the resurrection that the bug reproduces.
    inFlight.then(({ wallet, arkadeSwaps }) => {
      (w as any)._wallet = wallet;
      (w as any)._arkadeSwaps = arkadeSwaps;
    });

    walletTesting.initInFlight.set(namespace, inFlight);

    // Kick off onDelete; before inFlight resolves, deletion must not have
    // started — onDelete is awaiting the drain.
    const onDeletePromise = w.onDelete();
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(Realm.deleteFile.mock.calls.length, 0, 'deleteArkadeRealm must not run before in-flight init settles');

    // Resolve inFlight: simulated IIFE tail writes caches, simulated init outer
    // continuation re-assigns this._wallet, then onDelete continues.
    resolveInit({ wallet: { tag: 'racy-wallet' }, arkadeSwaps: { tag: 'racy-swaps' } });

    await onDeletePromise;

    // The drain ensures caches are cleared after the resurrection, not before.
    assert.strictEqual(walletTesting.staticWalletCache[namespace], undefined, 'staticWalletCache cleared after drain');
    assert.strictEqual(walletTesting.staticSwapsCache[namespace], undefined, 'staticSwapsCache cleared after drain');
    assert.strictEqual((w as any)._wallet, undefined, 'wallet instance _wallet cleared after drain');
    assert.strictEqual((w as any)._arkadeSwaps, undefined, 'wallet instance _arkadeSwaps cleared after drain');
    assert.ok(!walletTesting.initInFlight.has(namespace), 'in-flight entry removed');
  });

  it('survives in-flight init that rejects', async () => {
    const w = new LightningArkWallet();
    w.setSecret(TEST_SECRET);
    const namespace = w.getNamespace();

    const inFlight = Promise.reject(new Error('init blew up'));
    // Attach a no-op handler so Node does not flag this as an unhandled rejection
    // before onDelete has a chance to await it.
    inFlight.catch(() => {});
    walletTesting.initInFlight.set(namespace, inFlight);

    await w.onDelete();

    assert.ok(!walletTesting.initInFlight.has(namespace));
    assert.strictEqual((w as any)._wallet, undefined);
  });

  it('is a no-op when secret is unset', async () => {
    const w = new LightningArkWallet();
    // No setSecret call; w.secret === ''.

    await w.onDelete();

    assert.strictEqual(Realm.deleteFile.mock.calls.length, 0);
    assert.strictEqual(Keychain.resetGenericPassword.mock.calls.length, 0);
  });
});
