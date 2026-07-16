import assert from 'assert';
import BackgroundFetch from 'react-native-background-fetch';
import { BoltzSwapProvider, updateChainSwapStatus, updateReverseSwapStatus, updateSubmarineSwapStatus } from '@arkade-os/boltz-swap';
import { RealmSwapRepository } from '@arkade-os/boltz-swap/repositories/realm';

import { LightningArkWallet } from '../../class/wallets/lightning-ark-wallet';
import { BlueApp } from '../../class/blue-app';
import { getArkadeRealm } from '../../blue_modules/arkade-adapters/realm/realmInstance';
import {
  getArkTaskState,
  onArkBackgroundTaskTimeout,
  reconcileArkBackgroundTaskResults,
  registerArkBackgroundTask,
  runArkBackgroundTask,
  stopArkBackgroundTask,
  __testing__ as backgroundTesting,
} from '../../blue_modules/arkade-background';

// jest.mock calls are hoisted before imports at runtime, so imports above
// receive the mocked module. Factories cannot reference outer-scope user
// variables — keep all shared mock fns inside the factory and surface them
// through the constructor or the module's exports.
jest.mock('react-native-background-fetch', () => {
  const mockApi = {
    configure: jest.fn().mockResolvedValue(2),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(true),
    finish: jest.fn(),
    registerHeadlessTask: jest.fn(),
    STATUS_RESTRICTED: 0,
    STATUS_DENIED: 1,
    STATUS_AVAILABLE: 2,
    NETWORK_TYPE_ANY: 1,
    NETWORK_TYPE_NONE: 0,
  };
  return { __esModule: true, default: mockApi, ...mockApi };
});

jest.mock('@arkade-os/boltz-swap', () => {
  const actual = jest.requireActual('@arkade-os/boltz-swap');
  const getSwapStatus = jest.fn();
  const updateReverseSwapStatusFn = jest.fn().mockResolvedValue(undefined);
  const updateSubmarineSwapStatusFn = jest.fn().mockResolvedValue(undefined);
  const updateChainSwapStatusFn = jest.fn().mockResolvedValue(undefined);
  const Provider = jest.fn().mockImplementation(() => ({ getSwapStatus }));
  // Hang the shared getSwapStatus mock off the constructor so the test can
  // reach it without referencing outer-scope variables in the factory.
  (Provider as any).__getSwapStatus = getSwapStatus;
  return {
    ...actual,
    BoltzSwapProvider: Provider,
    updateReverseSwapStatus: updateReverseSwapStatusFn,
    updateSubmarineSwapStatus: updateSubmarineSwapStatusFn,
    updateChainSwapStatus: updateChainSwapStatusFn,
  };
});

jest.mock('@arkade-os/boltz-swap/repositories/realm', () => {
  const getAllSwaps = jest.fn().mockResolvedValue([]);
  const saveSwap = jest.fn().mockResolvedValue(undefined);
  const Repo = jest.fn().mockImplementation(() => ({ getAllSwaps, saveSwap }));
  (Repo as any).__getAllSwaps = getAllSwaps;
  (Repo as any).__saveSwap = saveSwap;
  return { RealmSwapRepository: Repo };
});

jest.mock('../../blue_modules/arkade-adapters/realm/realmInstance', () => {
  return { getArkadeRealm: jest.fn() };
});

jest.mock('../../blue_modules/arkade-adapters/realm/notificationSuppressionRepository', () => {
  // Single shared instance backed by an in-memory map so the test can
  // observe the same state pollSwap manipulates. Repo construction
  // happens inside processWallet, so we surface mocked methods through
  // the constructor.
  const store = new Map<string, true>();
  const has = jest.fn((swapId: string, action: string) => store.has(`${swapId}:${action}`));
  const record = jest.fn((swapId: string, action: string) => {
    store.set(`${swapId}:${action}`, true);
  });
  const clearForSwap = jest.fn((swapId: string) => {
    for (const k of Array.from(store.keys())) if (k.startsWith(`${swapId}:`)) store.delete(k);
  });
  const clearForSwapAction = jest.fn((swapId: string, action: string) => {
    store.delete(`${swapId}:${action}`);
  });
  const Repo = jest.fn().mockImplementation(() => ({ has, record, clearForSwap, clearForSwapAction }));
  (Repo as any).__store = store;
  (Repo as any).__has = has;
  (Repo as any).__record = record;
  (Repo as any).__clearForSwap = clearForSwap;
  (Repo as any).__clearForSwapAction = clearForSwapAction;
  return { RealmNotificationSuppressionRepository: Repo, ArkSwapNotificationSuppressionSchema: {} };
});

jest.mock('../../blue_modules/arkade-notifications', () => {
  const notifyArkSwapActionable = jest.fn().mockResolvedValue(undefined);
  const resolveActionableAction = jest.fn().mockReturnValue(null);
  return {
    notifyArkSwapActionable,
    resolveActionableAction,
    ARK_SWAP_NOTIFICATION_TYPE: 100,
    ensureArkNotificationChannel: jest.fn(),
  };
});

const configureMock = BackgroundFetch.configure as unknown as jest.Mock;
const startMock = BackgroundFetch.start as unknown as jest.Mock;
const stopMock = BackgroundFetch.stop as unknown as jest.Mock;
const finishMock = BackgroundFetch.finish as unknown as jest.Mock;

const getSwapStatusMock = (BoltzSwapProvider as any).__getSwapStatus as jest.Mock;
const updateReverseSwapStatusMock = updateReverseSwapStatus as unknown as jest.Mock;
const updateSubmarineSwapStatusMock = updateSubmarineSwapStatus as unknown as jest.Mock;
const updateChainSwapStatusMock = updateChainSwapStatus as unknown as jest.Mock;

const getAllSwapsMock = (RealmSwapRepository as any).__getAllSwaps as jest.Mock;
const getArkadeRealmMock = getArkadeRealm as unknown as jest.Mock;

const suppressionMockModule = jest.requireMock('../../blue_modules/arkade-adapters/realm/notificationSuppressionRepository') as any;
const suppressionStore: Map<string, true> = suppressionMockModule.RealmNotificationSuppressionRepository.__store;
const suppressionHasMock = suppressionMockModule.RealmNotificationSuppressionRepository.__has as jest.Mock;
const suppressionRecordMock = suppressionMockModule.RealmNotificationSuppressionRepository.__record as jest.Mock;
const suppressionClearForSwapMock = suppressionMockModule.RealmNotificationSuppressionRepository.__clearForSwap as jest.Mock;
const suppressionClearForSwapActionMock = suppressionMockModule.RealmNotificationSuppressionRepository.__clearForSwapAction as jest.Mock;

const notificationsMockModule = jest.requireMock('../../blue_modules/arkade-notifications') as any;
const notifyArkSwapActionableMock = notificationsMockModule.notifyArkSwapActionable as jest.Mock;
const resolveActionableActionMock = notificationsMockModule.resolveActionableAction as jest.Mock;

const TEST_SECRET_A = 'arkade://abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const TEST_SECRET_B = 'arkade://about above absent absorb abstract absurd abuse access accident account accuse achieve';

const stubRealm = { id: 'realm' } as any;

function makeArkWallet(secret: string): LightningArkWallet {
  const w = new LightningArkWallet();
  w.setSecret(secret);
  return w;
}

beforeEach(() => {
  configureMock.mockClear();
  configureMock.mockResolvedValue(BackgroundFetch.STATUS_AVAILABLE);
  startMock.mockClear();
  startMock.mockResolvedValue(undefined);
  stopMock.mockClear();
  stopMock.mockResolvedValue(true);
  finishMock.mockClear();

  getSwapStatusMock.mockReset();
  updateReverseSwapStatusMock.mockReset();
  updateReverseSwapStatusMock.mockResolvedValue(undefined);
  updateSubmarineSwapStatusMock.mockReset();
  updateSubmarineSwapStatusMock.mockResolvedValue(undefined);
  updateChainSwapStatusMock.mockReset();
  updateChainSwapStatusMock.mockResolvedValue(undefined);

  getAllSwapsMock.mockReset();
  getAllSwapsMock.mockResolvedValue([]);

  getArkadeRealmMock.mockReset();
  getArkadeRealmMock.mockResolvedValue(stubRealm);

  suppressionStore.clear();
  suppressionHasMock.mockClear();
  suppressionRecordMock.mockClear();
  suppressionClearForSwapMock.mockClear();
  suppressionClearForSwapActionMock.mockClear();

  notifyArkSwapActionableMock.mockReset();
  notifyArkSwapActionableMock.mockResolvedValue(undefined);
  resolveActionableActionMock.mockReset();
  resolveActionableActionMock.mockReturnValue(null);

  BlueApp.getInstance().wallets = [];
  backgroundTesting.reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('registerArkBackgroundTask', () => {
  it('configures the scheduler once and records lastRegisteredAt', async () => {
    await registerArkBackgroundTask();
    assert.strictEqual(configureMock.mock.calls.length, 1);
    const cfg = configureMock.mock.calls[0][0];
    assert.strictEqual(cfg.minimumFetchInterval, 15);
    assert.strictEqual(cfg.stopOnTerminate, false);
    assert.strictEqual(cfg.startOnBoot, true);
    assert.strictEqual(cfg.enableHeadless, true);
    assert.strictEqual(cfg.requiredNetworkType, 1);
    assert.notStrictEqual(getArkTaskState().lastRegisteredAt, null);
    assert.strictEqual(getArkTaskState().availability, 'available');
  });

  it('after stop, calls BackgroundFetch.start instead of reconfiguring', async () => {
    await registerArkBackgroundTask();
    await stopArkBackgroundTask();

    configureMock.mockClear();
    startMock.mockClear();

    await registerArkBackgroundTask();

    assert.strictEqual(configureMock.mock.calls.length, 0);
    assert.strictEqual(startMock.mock.calls.length, 1);
  });

  it('records denied status without marking the scheduler configured', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    configureMock.mockResolvedValueOnce(BackgroundFetch.STATUS_DENIED);

    await registerArkBackgroundTask();

    assert.strictEqual(getArkTaskState().availability, 'denied');
    assert.strictEqual(getArkTaskState().lastRegisteredAt, null);
    assert.strictEqual(startMock.mock.calls.length, 0);
    assert.strictEqual(warnSpy.mock.calls.length, 1);

    configureMock.mockClear();
    await registerArkBackgroundTask();
    assert.strictEqual(configureMock.mock.calls.length, 1);

    warnSpy.mockRestore();
  });
});

describe('runArkBackgroundTask', () => {
  it('finishes immediately with empty wallet list', async () => {
    await runArkBackgroundTask('task-1');

    const s = getArkTaskState();
    assert.strictEqual(s.walletsScanned, 0);
    assert.strictEqual(s.swapsPolled, 0);
    assert.strictEqual(s.swapsUpdated, 0);
    assert.strictEqual(s.lastError, null);
    assert.strictEqual(finishMock.mock.calls.length, 1);
    assert.strictEqual(finishMock.mock.calls[0][0], 'task-1');
  });

  it('marks exitedDueToUnavailableStorage when getArkadeRealm throws', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];
    getArkadeRealmMock.mockRejectedValue(new Error('keychain locked'));

    await runArkBackgroundTask('task-keychain');

    const s = getArkTaskState();
    assert.strictEqual(s.exitedDueToUnavailableStorage, true);
    assert.strictEqual(s.swapsPolled, 0);
    assert.strictEqual(s.swapsUpdated, 0);
    assert.ok(s.lastError && s.lastError.includes('keychain locked'));
    assert.strictEqual(finishMock.mock.calls.length, 1);
  });

  it('polls non-terminal swaps without persisting when status matches', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const reverseSwap = { id: 'r1', type: 'reverse', status: 'swap.created' };
    const submarineSwap = { id: 's1', type: 'submarine', status: 'transaction.mempool' };
    getAllSwapsMock.mockResolvedValue([reverseSwap, submarineSwap]);
    getSwapStatusMock.mockImplementation(async (id: string) => {
      if (id === 'r1') return { status: 'swap.created' };
      if (id === 's1') return { status: 'transaction.mempool' };
      return { status: 'unknown' };
    });

    await runArkBackgroundTask('task-poll');

    const s = getArkTaskState();
    assert.strictEqual(s.walletsScanned, 1);
    assert.strictEqual(s.swapsPolled, 2);
    assert.strictEqual(s.swapsUpdated, 0);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(updateSubmarineSwapStatusMock.mock.calls.length, 0);
  });

  it('persists changed reverse-swap status through updateReverseSwapStatus', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const reverseSwap = { id: 'r1', type: 'reverse', status: 'swap.created' };
    getAllSwapsMock.mockResolvedValue([reverseSwap]);
    getSwapStatusMock.mockResolvedValue({ status: 'transaction.mempool' });

    await runArkBackgroundTask('task-r1');

    const s = getArkTaskState();
    assert.strictEqual(s.swapsPolled, 1);
    assert.strictEqual(s.swapsUpdated, 1);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls.length, 1);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls[0][0], reverseSwap);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls[0][1], 'transaction.mempool');
    assert.strictEqual(updateSubmarineSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(updateChainSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(finishMock.mock.calls.length, 1);
    assert.notStrictEqual(s.lastSwapUpdateAt, 0);
  });

  it('routes submarine status changes to updateSubmarineSwapStatus', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const submarineSwap = { id: 's1', type: 'submarine', status: 'invoice.set' };
    getAllSwapsMock.mockResolvedValue([submarineSwap]);
    getSwapStatusMock.mockResolvedValue({ status: 'invoice.failedToPay' });

    await runArkBackgroundTask('task-s1');

    assert.strictEqual(updateSubmarineSwapStatusMock.mock.calls.length, 1);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(updateChainSwapStatusMock.mock.calls.length, 0);
  });

  it('routes chain status changes to updateChainSwapStatus', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const chainSwap = { id: 'c1', type: 'chain', status: 'swap.created' };
    getAllSwapsMock.mockResolvedValue([chainSwap]);
    getSwapStatusMock.mockResolvedValue({ status: 'transaction.mempool' });

    await runArkBackgroundTask('task-c1');

    assert.strictEqual(updateChainSwapStatusMock.mock.calls.length, 1);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(updateSubmarineSwapStatusMock.mock.calls.length, 0);
  });

  it('skips terminal swaps according to the per-type final-status predicate', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const swaps = [
      { id: 'r1', type: 'reverse', status: 'invoice.settled' },
      { id: 's1', type: 'submarine', status: 'transaction.claimed' },
      { id: 'c1', type: 'chain', status: 'transaction.refunded' },
      { id: 'r2', type: 'reverse', status: 'swap.expired' },
    ];
    getAllSwapsMock.mockResolvedValue(swaps);

    await runArkBackgroundTask('task-terminal');

    assert.strictEqual(getSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(getArkTaskState().swapsPolled, 0);
    assert.strictEqual(getArkTaskState().swapsUpdated, 0);
  });

  it('continues to next swap when one getSwapStatus call fails', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    getAllSwapsMock.mockResolvedValue([
      { id: 'r1', type: 'reverse', status: 'swap.created' },
      { id: 'r2', type: 'reverse', status: 'swap.created' },
    ]);
    getSwapStatusMock.mockImplementation(async (id: string) => {
      if (id === 'r1') throw new Error('network');
      return { status: 'transaction.mempool' };
    });

    await runArkBackgroundTask('task-onefail');

    assert.strictEqual(getArkTaskState().swapsPolled, 2);
    assert.strictEqual(getArkTaskState().swapsUpdated, 1);
    assert.ok(getArkTaskState().lastError && getArkTaskState().lastError!.includes('network'));
    assert.strictEqual(finishMock.mock.calls.length, 1);
  });

  it('finishes overlapping runs immediately without starting a second scan', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    let resolveSwaps: (value: any[]) => void = () => {};
    getAllSwapsMock.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveSwaps = resolve;
        }),
    );

    const firstRun = runArkBackgroundTask('task-first');
    await Promise.resolve();
    await runArkBackgroundTask('task-second');

    assert.strictEqual(finishMock.mock.calls.length, 1);
    assert.strictEqual(finishMock.mock.calls[0][0], 'task-second');
    assert.strictEqual(getArkTaskState().walletsScanned, 1);

    resolveSwaps([]);
    await firstRun;

    assert.strictEqual(finishMock.mock.calls.length, 2);
    assert.strictEqual(finishMock.mock.calls[1][0], 'task-first');
  });

  it('times out a hung status poll before persisting and skips later swaps', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];
    getAllSwapsMock.mockResolvedValue([
      { id: 'r1', type: 'reverse', status: 'swap.created' },
      { id: 'r2', type: 'reverse', status: 'swap.created' },
    ]);
    getSwapStatusMock.mockImplementation(() => new Promise(() => {}));
    // 100ms gives enough headroom for the await chain (getArkadeRealm,
    // getAllSwaps, processWallet entry) under loaded parallel workers so
    // the first pollSwap definitely starts before the deadline; the
    // never-resolving getSwapStatus then drives the withTimeout reject path.
    backgroundTesting.setMaxRunMs(100);

    await runArkBackgroundTask('task-timeout');

    assert.strictEqual(getArkTaskState().swapsPolled, 1);
    assert.strictEqual(getArkTaskState().swapsUpdated, 0);
    assert.ok(getArkTaskState().lastError && getArkTaskState().lastError!.includes('deadline exceeded'));
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls.length, 0);
    assert.strictEqual(getSwapStatusMock.mock.calls.length, 1);
    assert.strictEqual(finishMock.mock.calls.length, 1);
  });
});

describe('onArkBackgroundTaskTimeout', () => {
  it('records lastError = timeout and calls finish', () => {
    onArkBackgroundTaskTimeout('task-to');
    assert.strictEqual(getArkTaskState().lastError, 'timeout');
    assert.strictEqual(finishMock.mock.calls.length, 1);
    assert.strictEqual(finishMock.mock.calls[0][0], 'task-to');
  });
});

describe('stopArkBackgroundTask', () => {
  it('calls BackgroundFetch.stop, clears swap cache, sets lastUnregisteredAt', async () => {
    backgroundTesting.swapStatusCache.set('ns-x', new Map([['s1', 'swap.created']]));

    await stopArkBackgroundTask();

    assert.strictEqual(stopMock.mock.calls.length, 1);
    assert.strictEqual(backgroundTesting.swapStatusCache.size, 0);
    assert.notStrictEqual(getArkTaskState().lastUnregisteredAt, null);
  });
});

describe('reconcileArkBackgroundTaskResults', () => {
  it('does not call back when no swap update happened since last reconcile', () => {
    const cb = jest.fn();
    reconcileArkBackgroundTaskResults(cb);
    assert.strictEqual(cb.mock.calls.length, 0);
  });

  it('calls back exactly once per Ark wallet whose namespace has cache entries after an update', async () => {
    const wA = makeArkWallet(TEST_SECRET_A);
    const wB = makeArkWallet(TEST_SECRET_B);
    BlueApp.getInstance().wallets = [wA as any, wB as any];

    // Trigger one persisted update for wallet A.
    getAllSwapsMock.mockResolvedValueOnce([{ id: 'r1', type: 'reverse', status: 'swap.created' }]);
    getSwapStatusMock.mockResolvedValueOnce({ status: 'transaction.mempool' });
    // Wallet B has no swaps to poll.
    getAllSwapsMock.mockResolvedValueOnce([]);

    await runArkBackgroundTask('task-reconcile');
    assert.strictEqual(getArkTaskState().swapsUpdated, 1);

    const cb = jest.fn();
    reconcileArkBackgroundTaskResults(cb);

    assert.strictEqual(cb.mock.calls.length, 1);
    assert.strictEqual(cb.mock.calls[0][0], wA.getID());
  });

  it('skips on second invocation when no further updates have arrived', async () => {
    const wA = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [wA as any];

    getAllSwapsMock.mockResolvedValueOnce([{ id: 'r1', type: 'reverse', status: 'swap.created' }]);
    getSwapStatusMock.mockResolvedValueOnce({ status: 'transaction.mempool' });

    await runArkBackgroundTask('task-rec1');
    const cb1 = jest.fn();
    reconcileArkBackgroundTaskResults(cb1);
    assert.strictEqual(cb1.mock.calls.length, 1);

    const cb2 = jest.fn();
    reconcileArkBackgroundTaskResults(cb2);
    assert.strictEqual(cb2.mock.calls.length, 0);
  });
});

describe('actionable swap notifications', () => {
  it('calls notifyArkSwapActionable with an updatedSwap (status === remoteStatus) on transition into actionable', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const swap = { id: 'r1', type: 'reverse', status: 'swap.created' };
    getAllSwapsMock.mockResolvedValue([swap]);
    getSwapStatusMock.mockResolvedValue({ status: 'transaction.confirmed' });
    resolveActionableActionMock.mockReturnValue('claim');

    await runArkBackgroundTask('task-actionable');

    assert.strictEqual(notifyArkSwapActionableMock.mock.calls.length, 1);
    const [passedSwap, , walletID, walletLabel] = notifyArkSwapActionableMock.mock.calls[0];
    // Regression guard for the SDK-non-mutation issue: the first arg must
    // carry remoteStatus, not the pre-update status. updateReverseSwapStatus
    // saves a copy and does not mutate the input, so passing `swap` here
    // would silently evaluate predicates against the old status.
    assert.strictEqual(passedSwap.status, 'transaction.confirmed');
    assert.strictEqual(passedSwap.id, 'r1');
    assert.strictEqual(walletID, w.getID());
    assert.strictEqual(typeof walletLabel, 'string');
  });

  it('clears suppression and skips notify on transition into terminal status', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    const swap = { id: 'r1', type: 'reverse', status: 'transaction.confirmed' };
    getAllSwapsMock.mockResolvedValue([swap]);
    getSwapStatusMock.mockResolvedValue({ status: 'invoice.settled' });

    await runArkBackgroundTask('task-terminal-clear');

    assert.strictEqual(suppressionClearForSwapMock.mock.calls.length, 1);
    assert.strictEqual(suppressionClearForSwapMock.mock.calls[0][0], 'r1');
    assert.strictEqual(notifyArkSwapActionableMock.mock.calls.length, 0);
  });

  it('clears the previous-action suppression on predicate flip out of actionable', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    // Run 1: swap is actionable (claim) — populates lastSeenActionMap.
    const swap1 = { id: 'r1', type: 'reverse', status: 'swap.created' };
    getAllSwapsMock.mockResolvedValueOnce([swap1]);
    getSwapStatusMock.mockResolvedValueOnce({ status: 'transaction.confirmed' });
    resolveActionableActionMock.mockReturnValueOnce('claim');
    await runArkBackgroundTask('task-flip-1');

    // Run 2: same swap, status moved to a non-terminal but no-longer-actionable
    // state (predicate flipped false). Realm reflects the prior persisted
    // status, so the swap presented to processWallet has status 'transaction.confirmed'.
    const swap2 = { id: 'r1', type: 'reverse', status: 'transaction.confirmed' };
    getAllSwapsMock.mockResolvedValueOnce([swap2]);
    getSwapStatusMock.mockResolvedValueOnce({ status: 'transaction.mempool' });
    resolveActionableActionMock.mockReturnValueOnce(null);
    notifyArkSwapActionableMock.mockClear();
    suppressionClearForSwapActionMock.mockClear();
    await runArkBackgroundTask('task-flip-2');

    assert.strictEqual(suppressionClearForSwapActionMock.mock.calls.length, 1);
    assert.strictEqual(suppressionClearForSwapActionMock.mock.calls[0][0], 'r1');
    assert.strictEqual(suppressionClearForSwapActionMock.mock.calls[0][1], 'claim');
    assert.strictEqual(notifyArkSwapActionableMock.mock.calls.length, 0);
  });

  it('re-evaluates actionable on a poll where remoteStatus === swap.status (regression guard)', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    // Realm already reflects an actionable status. The remote returns the
    // same status. Old behavior would early-return; new behavior must still
    // run the actionable evaluation because a previous wake may have failed
    // to post.
    const swap = { id: 'r1', type: 'reverse', status: 'transaction.confirmed' };
    getAllSwapsMock.mockResolvedValue([swap]);
    getSwapStatusMock.mockResolvedValue({ status: 'transaction.confirmed' });
    resolveActionableActionMock.mockReturnValue('claim');

    await runArkBackgroundTask('task-stable-actionable');

    // No persistence — status didn't change.
    assert.strictEqual(getArkTaskState().swapsUpdated, 0);
    assert.strictEqual(updateReverseSwapStatusMock.mock.calls.length, 0);
    // But notify is still invoked.
    assert.strictEqual(notifyArkSwapActionableMock.mock.calls.length, 1);
  });

  it('survives notify failure: pollSwap completes, BackgroundFetch.finish is called, run continues', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    getAllSwapsMock.mockResolvedValue([
      { id: 'r1', type: 'reverse', status: 'swap.created' },
      { id: 'r2', type: 'reverse', status: 'swap.created' },
    ]);
    getSwapStatusMock.mockResolvedValue({ status: 'transaction.confirmed' });
    resolveActionableActionMock.mockReturnValue('claim');
    notifyArkSwapActionableMock.mockRejectedValue(new Error('notify exploded'));

    await runArkBackgroundTask('task-notify-throw');

    assert.strictEqual(getArkTaskState().swapsPolled, 2);
    assert.strictEqual(notifyArkSwapActionableMock.mock.calls.length, 2);
    assert.strictEqual(finishMock.mock.calls.length, 1);
    assert.ok(getArkTaskState().lastError && getArkTaskState().lastError!.includes('notify exploded'));
  });

  it('survives suppression-write failure: pollSwap completes, subsequent polls run', async () => {
    const w = makeArkWallet(TEST_SECRET_A);
    BlueApp.getInstance().wallets = [w as any];

    getAllSwapsMock.mockResolvedValue([
      { id: 'r1', type: 'reverse', status: 'transaction.confirmed' },
      { id: 'r2', type: 'reverse', status: 'transaction.confirmed' },
    ]);
    getSwapStatusMock.mockResolvedValue({ status: 'invoice.settled' });
    suppressionClearForSwapMock.mockImplementationOnce(() => {
      throw new Error('realm closed');
    });

    await runArkBackgroundTask('task-suppression-throw');

    // Both polls still happen.
    assert.strictEqual(getArkTaskState().swapsPolled, 2);
    assert.strictEqual(finishMock.mock.calls.length, 1);
  });

  it('stopArkBackgroundTask clears the in-process lastSeenActionMap', async () => {
    backgroundTesting.lastSeenActionMap.set('ns-x:r1', 'claim');
    await stopArkBackgroundTask();
    assert.strictEqual(backgroundTesting.lastSeenActionMap.size, 0);
  });
});
