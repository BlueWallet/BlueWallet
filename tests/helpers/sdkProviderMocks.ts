/**
 * Spy installers for the Arkade SDK provider classes that
 * `LightningArkWallet.init()` reaches over the network for.
 *
 * Tests call `installSdkProviderSpies()` in `beforeEach` and
 * `restoreSdkProviderSpies()` in `afterEach`. The spies stub the methods
 * `Wallet.create` calls during init (`getInfo`, `getDelegateInfo`). Market
 * discovery needs no stub: the bundled solver card is validated locally, so
 * an unreachable registry degrades to the bundled-only set. With these in
 * place `init()` runs offline and the wallet's address derivation is fully
 * deterministic.
 *
 * We spy on `RestArkProvider.prototype` rather than `ExpoArkProvider.prototype`
 * because Expo* extend Rest* — installing the stub on the parent prototype
 * covers both.
 */

import { ContractManager, RestArkProvider, RestDelegateProvider, VtxoManager } from '@arkade-os/sdk';

/** Snapshot of `https://arkade.computer/v1/info` for offline tests. */
export const FAKE_ASP_INFO = {
  signerPubkey: '022b74c2011af089c849383ee527c72325de52df6a788428b68d49e9174053aaba',
  forfeitPubkey: '03b43a8363118c084a04d4f6a50ebfa58e81957f8cceceb2aee0ab64c9fd2d9977',
  forfeitAddress: 'bc1qzzdzp5c443vsetzatf2ra6hku322y7e5aq50rs',
  checkpointTapscript: '039e0440b27520b43a8363118c084a04d4f6a50ebfa58e81957f8cceceb2aee0ab64c9fd2d9977ac',
  network: 'bitcoin' as const,
  sessionDuration: 60,
  unilateralExitDelay: 605184,
  boardingExitDelay: 7776256,
  utxoMinAmount: 330,
  utxoMaxAmount: -1,
  vtxoMinAmount: 1,
  vtxoMaxAmount: -1,
  dust: 330,
  fees: {
    intentFee: { offchainInput: '', offchainOutput: '', onchainInput: '', onchainOutput: '200.0' },
    txFeeRate: 0,
  },
  scheduledSession: null,
  deprecatedSigners: [],
  serviceStatus: {},
  digest: 'test-digest',
  maxTxWeight: 40000,
  maxOpReturnOutputs: 2,
};

/**
 * Test-only delegate pubkey. Does not need to match the production delegator
 * — the derivation test pins the wallet's algorithm, not the production
 * service. The value is the secp256k1 generator G in 33-byte compressed form
 * (private key = 1) so it is always on-curve and the SDK's taproot validation
 * accepts it.
 */
export const FAKE_DELEGATE_PUBKEY = '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

export const FAKE_DELEGATE_INFO = {
  pubkey: FAKE_DELEGATE_PUBKEY,
  fee: '0',
  delegatorAddress: 'bc1qzzdzp5c443vsetzatf2ra6hku322y7e5aq50rs',
};

/**
 * Install Jest spies on the SDK provider prototypes so init() runs offline.
 * Returns nothing; cleanup happens via `restoreSdkProviderSpies()`.
 */
export function installSdkProviderSpies(): void {
  jest.spyOn(RestArkProvider.prototype, 'getInfo').mockResolvedValue(FAKE_ASP_INFO as any);
  jest.spyOn(RestDelegateProvider.prototype, 'getDelegateInfo').mockResolvedValue(FAKE_DELEGATE_INFO as any);

  // VtxoManager auto-runs `initializeSubscription()` from its constructor,
  // which schedules a setTimeout polling loop AND awaits getContractManager
  // (which opens a ContractWatcher SSE subscription via subscribeForScripts).
  // Neither shuts down without a `dispose()` call, so a Jest worker that
  // runs Wallet.create through to completion hangs after the test asserts.
  // Stub the entry point to a resolved no-op; the wallet's address-derivation
  // path doesn't need either side effect.
  jest.spyOn(VtxoManager.prototype as any, 'initializeSubscription').mockResolvedValue(undefined);

  // Any code path that calls `wallet.getContractManager()` lazily constructs
  // a ContractManager whose `initialize()` opens a ContractWatcher SSE stream
  // (via `indexerProvider.getSubscription`) and runs a delta sync against the
  // indexer. Both leave handles or pending fetches that block Jest from
  // exiting. Unit tests that only exercise address derivation never trigger
  // this, but tests that call `fetchBalance` / `fetchTransactions` /
  // `getTransactionHistory` after init do. Stub initialize to a no-op so the
  // manager exists with no watched contracts — the manager-querying methods
  // then return empty results without touching the network.
  jest.spyOn(ContractManager.prototype as any, 'initialize').mockResolvedValue(undefined);
}

export function restoreSdkProviderSpies(): void {
  jest.restoreAllMocks();
}

let backgroundLoopSpies: jest.SpiedFunction<any>[] = [];

export function restoreSdkBackgroundLoopStubs(): void {
  for (const spy of backgroundLoopSpies) spy.mockRestore();
  backgroundLoopSpies = [];
}

/**
 * Stub only the SDK background subscriptions that Jest cannot shut down
 * cleanly (VtxoManager polling, ContractWatcher SSE). Real HTTP calls
 * (getInfo, getTransactionHistory, etc.) still run — use in env-gated
 * integration tests that hit production services.
 */
export function installSdkBackgroundLoopStubs(): void {
  restoreSdkBackgroundLoopStubs();
  backgroundLoopSpies = [
    jest.spyOn(VtxoManager.prototype as any, 'initializeSubscription').mockResolvedValue(undefined),
    jest.spyOn(ContractManager.prototype as any, 'initialize').mockResolvedValue(undefined),
  ];
}
