import assert from 'assert';

import { isChainSwapClaimable, isChainSwapRefundable, isReverseSwapClaimable, isSubmarineSwapRefundable } from '@arkade-os/boltz-swap';

import {
  ARK_SWAP_NOTIFICATION_TYPE,
  ensureArkNotificationChannel,
  notifyArkSwapActionable,
  resolveActionableAction,
  __testing__ as notificationsTesting,
} from '../../blue_modules/arkade-notifications';

// jest.mock calls are hoisted before imports at runtime, so the imports
// above receive the mocked module. Factories cannot reference outer-scope
// user variables — keep all shared mock fns inside the factory and surface
// them through the module's exports.
jest.mock('react-native-notifications', () => {
  const postLocalNotification = jest.fn();
  const setNotificationChannel = jest.fn();
  class Notification {
    payload: any;
    constructor(payload: any) {
      this.payload = payload;
    }
  }
  return {
    Notification,
    Notifications: { postLocalNotification, setNotificationChannel },
    __postLocalNotification: postLocalNotification,
    __setNotificationChannel: setNotificationChannel,
  };
});

jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn().mockResolvedValue({ status: 'granted' }),
  RESULTS: { GRANTED: 'granted', DENIED: 'denied', BLOCKED: 'blocked' },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@arkade-os/boltz-swap', () => ({
  isReverseSwapClaimable: jest.fn(),
  isSubmarineSwapRefundable: jest.fn(),
  isChainSwapClaimable: jest.fn(),
  isChainSwapRefundable: jest.fn(),
}));

const isReverseSwapClaimableMock = isReverseSwapClaimable as unknown as jest.Mock;
const isSubmarineSwapRefundableMock = isSubmarineSwapRefundable as unknown as jest.Mock;
const isChainSwapClaimableMock = isChainSwapClaimable as unknown as jest.Mock;
const isChainSwapRefundableMock = isChainSwapRefundable as unknown as jest.Mock;

const rnNotifications = jest.requireMock('react-native-notifications');
const postLocalNotificationMock = rnNotifications.__postLocalNotification as jest.Mock;
const setNotificationChannelMock = rnNotifications.__setNotificationChannel as jest.Mock;

interface SuppressionStub {
  has: jest.Mock;
  record: jest.Mock;
  clearForSwap: jest.Mock;
  clearForSwapAction: jest.Mock;
}

function makeSuppressionStub(): SuppressionStub {
  const store = new Map<string, true>();
  return {
    has: jest.fn((swapId: string, action: string) => store.has(`${swapId}:${action}`)),
    record: jest.fn((swapId: string, action: string) => {
      store.set(`${swapId}:${action}`, true);
    }),
    clearForSwap: jest.fn((swapId: string) => {
      for (const k of Array.from(store.keys())) if (k.startsWith(`${swapId}:`)) store.delete(k);
    }),
    clearForSwapAction: jest.fn((swapId: string, action: string) => {
      store.delete(`${swapId}:${action}`);
    }),
  };
}

beforeEach(() => {
  postLocalNotificationMock.mockReset();
  setNotificationChannelMock.mockReset();
  isReverseSwapClaimableMock.mockReset().mockReturnValue(false);
  isSubmarineSwapRefundableMock.mockReset().mockReturnValue(false);
  isChainSwapClaimableMock.mockReset().mockReturnValue(false);
  isChainSwapRefundableMock.mockReset().mockReturnValue(false);

  notificationsTesting.setAppStateForTest('background');
  notificationsTesting.setPermissionResultForTest('granted');
  notificationsTesting.setOptOutFlagForTest(null);
});

afterAll(() => {
  notificationsTesting.setAppStateForTest(null);
  notificationsTesting.setPermissionResultForTest(null);
  notificationsTesting.setOptOutFlagForTest(undefined);
});

describe('resolveActionableAction', () => {
  it('returns claim for reverse-claimable swaps', () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    assert.strictEqual(resolveActionableAction({ id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any), 'claim');
  });

  it('returns claim for chain-claimable swaps', () => {
    isChainSwapClaimableMock.mockReturnValue(true);
    assert.strictEqual(resolveActionableAction({ id: 'c1', type: 'chain', status: 'transaction.server.confirmed' } as any), 'claim');
  });

  it('returns refund for submarine-refundable swaps', () => {
    isSubmarineSwapRefundableMock.mockReturnValue(true);
    assert.strictEqual(resolveActionableAction({ id: 's1', type: 'submarine', status: 'transaction.lockupFailed' } as any), 'refund');
  });

  it('returns refund for chain-refundable swaps', () => {
    isChainSwapRefundableMock.mockReturnValue(true);
    assert.strictEqual(resolveActionableAction({ id: 'c2', type: 'chain', status: 'transaction.server.refundable' } as any), 'refund');
  });

  it('returns null when no predicate matches', () => {
    assert.strictEqual(resolveActionableAction({ id: 'x', type: 'reverse', status: 'swap.created' } as any), null);
  });
});

describe('notifyArkSwapActionable', () => {
  it('posts a notification with the expected payload for a reverse-claimable swap', async () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable(
      { id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any,
      suppression as any,
      'wallet-id-A',
      'My Wallet',
    );

    assert.strictEqual(postLocalNotificationMock.mock.calls.length, 1);
    const notif = postLocalNotificationMock.mock.calls[0][0];
    assert.strictEqual(notif.payload.type, ARK_SWAP_NOTIFICATION_TYPE);
    assert.strictEqual(notif.payload.walletID, 'wallet-id-A');
    assert.strictEqual(notif.payload.swapId, 'r1');
    assert.strictEqual(notif.payload.action, 'claim');
    // Regression guard: namespace is intentionally absent from the OS payload
    // so the persistent notification record never carries a stable per-wallet
    // handle outside the encryption boundary.
    assert.strictEqual(Object.prototype.hasOwnProperty.call(notif.payload, 'namespace'), false);

    assert.strictEqual(suppression.record.mock.calls.length, 1);
    assert.strictEqual(suppression.record.mock.calls[0][0], 'r1');
    assert.strictEqual(suppression.record.mock.calls[0][1], 'claim');
  });

  it('posts with action=refund for a submarine-refundable swap', async () => {
    isSubmarineSwapRefundableMock.mockReturnValue(true);
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable(
      { id: 's1', type: 'submarine', status: 'transaction.lockupFailed' } as any,
      suppression as any,
      'wallet-id-B',
      'Wallet B',
    );

    const notif = postLocalNotificationMock.mock.calls[0][0];
    assert.strictEqual(notif.payload.action, 'refund');
    assert.strictEqual(suppression.record.mock.calls[0][1], 'refund');
  });

  it('routes chain-claimable predicates to claim', async () => {
    isChainSwapClaimableMock.mockReturnValue(true);
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable(
      { id: 'c1', type: 'chain', status: 'transaction.server.confirmed' } as any,
      suppression as any,
      'wallet-id-C',
      'Wallet C',
    );

    assert.strictEqual(postLocalNotificationMock.mock.calls[0][0].payload.action, 'claim');
  });

  it('routes chain-refundable predicates to refund', async () => {
    isChainSwapRefundableMock.mockReturnValue(true);
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable(
      { id: 'c2', type: 'chain', status: 'transaction.server.refundable' } as any,
      suppression as any,
      'wallet-id-C',
      'Wallet C',
    );

    assert.strictEqual(postLocalNotificationMock.mock.calls[0][0].payload.action, 'refund');
  });

  it('does not post when suppression already recorded for this swap+action', async () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    const suppression = makeSuppressionStub();
    suppression.has.mockImplementation(() => true);

    await notifyArkSwapActionable({ id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any, suppression as any, 'w', 'L');

    assert.strictEqual(postLocalNotificationMock.mock.calls.length, 0);
    assert.strictEqual(suppression.record.mock.calls.length, 0);
  });

  it('does not post when AppState is active', async () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    notificationsTesting.setAppStateForTest('active');
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable({ id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any, suppression as any, 'w', 'L');

    assert.strictEqual(postLocalNotificationMock.mock.calls.length, 0);
    assert.strictEqual(suppression.record.mock.calls.length, 0);
  });

  it('does not post when no predicate matches', async () => {
    const suppression = makeSuppressionStub();
    await notifyArkSwapActionable({ id: 'r1', type: 'reverse', status: 'swap.created' } as any, suppression as any, 'w', 'L');
    assert.strictEqual(postLocalNotificationMock.mock.calls.length, 0);
    assert.strictEqual(suppression.record.mock.calls.length, 0);
  });

  it('skips post AND suppression when OS permission is denied', async () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    notificationsTesting.setPermissionResultForTest('denied');
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable({ id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any, suppression as any, 'w', 'L');

    assert.strictEqual(postLocalNotificationMock.mock.calls.length, 0);
    assert.strictEqual(suppression.record.mock.calls.length, 0);
  });

  it('skips post AND suppression when app-level opt-out flag is set', async () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    notificationsTesting.setOptOutFlagForTest('true');
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable({ id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any, suppression as any, 'w', 'L');

    assert.strictEqual(postLocalNotificationMock.mock.calls.length, 0);
    assert.strictEqual(suppression.record.mock.calls.length, 0);
  });

  it('does not write suppression when postLocalNotification throws', async () => {
    isReverseSwapClaimableMock.mockReturnValue(true);
    postLocalNotificationMock.mockImplementation(() => {
      throw new Error('post failed');
    });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const suppression = makeSuppressionStub();

    await notifyArkSwapActionable({ id: 'r1', type: 'reverse', status: 'transaction.confirmed' } as any, suppression as any, 'w', 'L');

    assert.strictEqual(suppression.record.mock.calls.length, 0);
    warnSpy.mockRestore();
  });
});

describe('ensureArkNotificationChannel', () => {
  it('calls setNotificationChannel at most once across multiple invocations', () => {
    // The module-level channelEnsured guard was set true by the import above.
    // Reset and re-invoke to assert the guard suppresses the second call.
    notificationsTesting.resetChannel();
    setNotificationChannelMock.mockClear();

    // The mocked Platform defaults to ios in the harness; force android.
    const ReactNative = require('react-native');
    const originalOS = ReactNative.Platform.OS;
    ReactNative.Platform.OS = 'android';

    try {
      ensureArkNotificationChannel();
      ensureArkNotificationChannel();
      ensureArkNotificationChannel();
      assert.strictEqual(setNotificationChannelMock.mock.calls.length, 1);
    } finally {
      ReactNative.Platform.OS = originalOS;
    }
  });
});
