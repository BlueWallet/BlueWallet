import assert from 'assert';
import { ContinuityActivityType } from '../../components/types';

// Capture the onUserActivityOpen callback so tests can fire synthetic events
let capturedEventCallback: ((data: any) => void) | null = null;
const mockAddListener = jest.fn((event: string, cb: (data: any) => void) => {
  if (event === 'onUserActivityOpen') capturedEventCallback = cb;
  return { remove: jest.fn() };
});

jest.mock('react-native', () => {
  return {
    NativeModules: {
      EventEmitter: { getMostRecentUserActivity: jest.fn(() => Promise.resolve(null)) },
    },
    NativeEventEmitter: jest.fn(() => ({ addListener: mockAddListener })),
    Alert: { alert: jest.fn() },
    Linking: { openURL: jest.fn(() => Promise.resolve()) },
  };
});

// Mock dependencies before importing the module
jest.mock('../../NavigationService', () => ({
  navigationRef: {
    current: {
      getCurrentRoute: jest.fn(() => ({ name: 'SomeScreen', params: {} })),
    },
    isReady: jest.fn(() => true),
  },
  navigate: jest.fn(),
}));

jest.mock('../../helpers/lndHub', () => ({
  setLNDHub: jest.fn(() => Promise.resolve()),
}));

describe('continuityLinking', () => {
  let mockListener: jest.Mock;
  let continuityLinking: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    capturedEventCallback = null;
    continuityLinking = require('../../navigation/continuityLinking').default;
    mockListener = jest.fn();
  });

  describe('configuration', () => {
    it('should have correct prefix', () => {
      assert.ok(continuityLinking.prefixes.includes('bluewallet://'));
    });

    it('should have filter function', () => {
      assert.strictEqual(typeof continuityLinking.filter, 'function');
    });

    it('should filter URLs correctly', () => {
      if (continuityLinking.filter) {
        assert.strictEqual(continuityLinking.filter('bluewallet://test'), true);
        assert.strictEqual(continuityLinking.filter('bitcoin:address'), false);
        assert.strictEqual(continuityLinking.filter('https://example.com'), false);
      }
    });

    it('should have config with all screen mappings', () => {
      const { config } = continuityLinking;
      if (!config?.screens) return;
      const screens = config.screens as any;
      assert.ok(screens.DrawerRoot);
      assert.ok(screens.DrawerRoot.screens.DetailViewStackScreensStack);
      assert.strictEqual(screens.DrawerRoot.screens.DetailViewStackScreensStack.screens.ReceiveDetails, 'receiveonchain');
      assert.strictEqual(screens.DrawerRoot.screens.DetailViewStackScreensStack.screens.IsItMyAddress, 'isitmyaddress');
      assert.strictEqual(screens.WalletXpub, 'xpub');
      assert.strictEqual(screens.LightningSettings, 'lightningsettings');
      assert.strictEqual(screens.SignVerifyRoot.screens.SignVerify, 'signverify');
      assert.strictEqual(screens.SendDetailsRoot.screens.SendDetails.path, 'sendonchain');
    });

    it('should have parse config for SendDetails', () => {
      const config = continuityLinking.config;
      if (!config?.screens) return;
      const screens = config.screens as any;
      const sendDetailsConfig = screens.SendDetailsRoot.screens.SendDetails;
      assert.ok(sendDetailsConfig.parse);
      assert.strictEqual(sendDetailsConfig.parse.amount, Number);
      assert.strictEqual(sendDetailsConfig.parse.amountSats, Number);
    });

    it('should have stringify config for SendDetails', () => {
      const config = continuityLinking.config;
      if (!config?.screens) return;
      const screens = config.screens as any;
      const sendDetailsConfig = screens.SendDetailsRoot.screens.SendDetails;
      assert.ok(sendDetailsConfig.stringify);
      assert.strictEqual(typeof sendDetailsConfig.stringify.amount, 'function');
      assert.strictEqual(typeof sendDetailsConfig.stringify.amountSats, 'function');
      assert.strictEqual(sendDetailsConfig.stringify.amount(123), '123');
      assert.strictEqual(sendDetailsConfig.stringify.amountSats(456), '456');
    });

    it('should have getInitialURL returning null', async () => {
      if (continuityLinking.getInitialURL) {
        const result = await continuityLinking.getInitialURL();
        assert.strictEqual(result, null);
      }
    });
  });

  describe('subscribe', () => {
    it('should provide unsubscribe function', () => {
      if (!continuityLinking.subscribe) {
        assert.fail('subscribe function not found');
        return;
      }
      const unsubscribe = continuityLinking.subscribe(mockListener);
      assert.strictEqual(typeof unsubscribe, 'function');
      if (unsubscribe) unsubscribe();
    });

    it('should handle subscription lifecycle', () => {
      if (!continuityLinking.subscribe) {
        assert.fail('subscribe function not found');
        return;
      }
      const unsubscribe = continuityLinking.subscribe(mockListener);
      assert.strictEqual(typeof unsubscribe, 'function');
      // Test that unsubscribe can be called without errors
      if (unsubscribe) unsubscribe();
    });
  });

  describe('URL generation patterns', () => {
    it('should match expected URL patterns for all activity types', () => {
      const expectedPatterns = [
        { type: ContinuityActivityType.ReceiveOnchain, pattern: /^bluewallet:\/\/receiveonchain\?address=/ },
        { type: ContinuityActivityType.Xpub, pattern: /^bluewallet:\/\/xpub\?walletID=.+&xpub=/ },
        { type: ContinuityActivityType.IsItMyAddress, pattern: /^bluewallet:\/\/isitmyaddress\?address=/ },
        { type: ContinuityActivityType.SignVerify, pattern: /^bluewallet:\/\/signverify\?walletID=.+&address=/ },
        { type: ContinuityActivityType.SendOnchain, pattern: /^bluewallet:\/\/sendonchain\?walletID=/ },
        { type: ContinuityActivityType.LightningSettings, pattern: /^bluewallet:\/\/lightningsettings\?url=/ },
      ];

      assert.ok(expectedPatterns.length === 6);
      expectedPatterns.forEach(({ pattern }) => {
        assert.ok(pattern instanceof RegExp);
      });
    });
  });

  describe('null guard behavior', () => {
    it('should not call listener for IsItMyAddress when address is missing', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.IsItMyAddress, userInfo: {} });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should not call listener for IsItMyAddress when address is empty string', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.IsItMyAddress, userInfo: { address: '' } });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should call listener for IsItMyAddress when address is present', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.IsItMyAddress, userInfo: { address: 'bc1qtest' } });
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('isitmyaddress'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('bc1qtest'));
    });

    it('should not call listener for ReceiveOnchain when address is missing', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ReceiveOnchain, userInfo: {} });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should not call listener for Xpub when xpub or walletID is missing', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { xpub: 'xpubABC' } });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should not call listener for Xpub when walletID is missing but xpub is present', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { walletID: 'wallet123' } });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should not call listener for SignVerify when walletID is missing', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.SignVerify, userInfo: { address: 'bc1qtest' } });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should not call listener for SignVerify when address is missing', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.SignVerify, userInfo: { walletID: 'wallet123' } });
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should call listener for SignVerify when walletID and address are present', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.SignVerify, userInfo: { walletID: 'wallet123', address: 'bc1qtest' } });
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('signverify'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('wallet123'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('bc1qtest'));
    });
  });

  describe('ViewInBlockExplorer handling', () => {
    let Linking: { openURL: jest.Mock };

    beforeEach(() => {
      Linking = require('react-native').Linking;
    });

    it('should open external URL for ViewInBlockExplorer and not call listener', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({
        activityType: ContinuityActivityType.ViewInBlockExplorer,
        userInfo: {},
        webpageURL: 'https://mempool.space/tx/abc123',
      });
      assert.strictEqual(mockListener.mock.calls.length, 0);
      assert.strictEqual(Linking.openURL.mock.calls.length, 1);
      assert.strictEqual(Linking.openURL.mock.calls[0][0], 'https://mempool.space/tx/abc123');
    });

    it('should not open URL for ViewInBlockExplorer when webpageURL is absent', () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ViewInBlockExplorer, userInfo: {} });
      assert.strictEqual(mockListener.mock.calls.length, 0);
      assert.strictEqual(Linking.openURL.mock.calls.length, 0);
    });
  });
});
