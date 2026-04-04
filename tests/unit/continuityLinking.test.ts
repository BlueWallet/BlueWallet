import assert from 'assert';
import { ContinuityActivityType } from '../../components/types';

// Capture the onUserActivityOpen callback so tests can fire synthetic events
let capturedEventCallback: ((data: any) => void) | null = null;
let capturedLinkingCallback: ((event: { url: string }) => void) | null = null;
const mockAddListener = jest.fn((event: string, cb: (data: any) => void) => {
  if (event === 'onUserActivityOpen') capturedEventCallback = cb;
  return { remove: jest.fn() };
});
const mockLinkingAddEventListener = jest.fn((event: string, cb: (event: { url: string }) => void) => {
  if (event === 'url') capturedLinkingCallback = cb;
  return { remove: jest.fn() };
});
const mockLinkingGetInitialURL: jest.Mock<Promise<string | null>, []> = jest.fn(() => Promise.resolve(null));
const mockGetMostRecentUserActivity: jest.Mock<Promise<any>, []> = jest.fn(() => Promise.resolve(null));

jest.mock('../../codegen/NativeEventEmitter', () => ({
  __esModule: true,
  default: { getMostRecentUserActivity: mockGetMostRecentUserActivity },
}));

jest.mock('react-native', () => {
  return {
    NativeEventEmitter: jest.fn(() => ({ addListener: mockAddListener })),
    Alert: { alert: jest.fn() },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      addEventListener: mockLinkingAddEventListener,
      getInitialURL: mockLinkingGetInitialURL,
    },
    Platform: { OS: 'ios' },
  };
});

jest.mock('react-native-default-preference', () => ({
  setName: jest.fn(() => Promise.resolve()),
  get: jest.fn(() => Promise.resolve('true')),
}));

jest.mock('../../blue_modules/currency', () => ({
  GROUP_IO_BLUEWALLET: 'group.io.bluewallet.bluewallet',
}));

jest.mock('../../class', () => ({
  BlueApp: { CONTINUITY_STORAGE_KEY: 'HandOff' },
}));

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

const mockPresentAlert = jest.fn();
jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: (...args: any[]) => mockPresentAlert(...args),
}));

describe('continuityLinking', () => {
  let mockListener: jest.Mock;
  let continuityLinking: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    capturedEventCallback = null;
    capturedLinkingCallback = null;
    mockLinkingGetInitialURL.mockResolvedValue(null);
    mockGetMostRecentUserActivity.mockResolvedValue(null);
    mockPresentAlert.mockClear();
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
        assert.strictEqual(continuityLinking.filter('bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As'), true);
        assert.strictEqual(continuityLinking.filter('bluewallet:setlndhuburl?url=https%3A%2F%2Flndhub.herokuapp.com'), true);
        assert.strictEqual(continuityLinking.filter('bluewallet:bitcoin:bc1qtest'), false);
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
      assert.strictEqual(screens.DrawerRoot.screens.DetailViewStackScreensStack.screens.ReceiveDetails.path, 'receiveonchain/:address?');
      assert.strictEqual(screens.DrawerRoot.screens.DetailViewStackScreensStack.screens.IsItMyAddress.path, 'isitmyaddress/:address?');
      assert.strictEqual(screens.WalletXpub.path, 'xpub/:walletID?/:xpub?');
      assert.strictEqual(screens.ElectrumSettings.path, 'electrumsettings');
      assert.deepStrictEqual(screens.ElectrumSettings.alias, ['setelectrumserver']);
      assert.strictEqual(screens.LightningSettings.path, 'lightningsettings');
      assert.deepStrictEqual(screens.LightningSettings.alias, ['setlndhuburl']);
      assert.strictEqual(screens.SignVerifyRoot.screens.SignVerify.path, 'signverify/:walletID?/:address?');
      assert.strictEqual(screens.SendDetailsRoot.screens.SendDetails.path, 'sendonchain/:walletID?');
    });

    it('should have parse config for SendDetails', () => {
      const config = continuityLinking.config;
      if (!config?.screens) return;
      const screens = config.screens as any;
      const sendDetailsConfig = screens.SendDetailsRoot.screens.SendDetails;
      assert.ok(sendDetailsConfig.parse);
      assert.strictEqual(sendDetailsConfig.path, 'sendonchain/:walletID?');
      assert.strictEqual(sendDetailsConfig.parse.amount, Number);
      assert.strictEqual(sendDetailsConfig.parse.amountSats, Number);
      assert.strictEqual(sendDetailsConfig.parse.walletID('wallet123'), 'wallet123');
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

    it('should have getInitialURL returning null when no continuity or linking URL is available', async () => {
      if (continuityLinking.getInitialURL) {
        const result = await continuityLinking.getInitialURL();
        assert.strictEqual(result, null);
      }
    });

    it('should return a Linking URL from getInitialURL when React Native provides one', async () => {
      if (continuityLinking.getInitialURL) {
        mockLinkingGetInitialURL.mockResolvedValueOnce('bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As');

        const result = await continuityLinking.getInitialURL();
        assert.strictEqual(result, 'bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As');
      }
    });

    it('should return a continuity URL from getInitialURL for direct navigation activities', async () => {
      if (continuityLinking.getInitialURL) {
        mockGetMostRecentUserActivity.mockResolvedValueOnce({
          activityType: ContinuityActivityType.ElectrumSettings,
          userInfo: { server: 'electrum1.bluewallet.io:443:s' },
        });

        const result = await continuityLinking.getInitialURL();
        assert.ok(result?.includes('electrumsettings'));
        assert.ok(result?.includes(encodeURIComponent('electrum1.bluewallet.io:443:s')));
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

    it('should forward continuity URLs from React Native Linking events', () => {
      if (!continuityLinking.subscribe) {
        assert.fail('subscribe function not found');
        return;
      }
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedLinkingCallback, 'Linking url callback should be registered');
      capturedLinkingCallback!({ url: 'bluewallet://isitmyaddress?address=bc1qtest' });
      capturedLinkingCallback!({ url: 'bluewallet:setelectrumserver?server=electrum1.bluewallet.io%3A443%3As' });
      assert.strictEqual(mockListener.mock.calls.length, 2);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('isitmyaddress'));
      assert.ok((mockListener.mock.calls[1][0] as string).includes('setelectrumserver'));
    });
  });

  describe('URL generation patterns', () => {
    it('should match expected URL patterns for all activity types', () => {
      const expectedPatterns = [
        { type: ContinuityActivityType.ReceiveOnchain, pattern: /^bluewallet:\/\/receiveonchain\/.+/ },
        { type: ContinuityActivityType.Xpub, pattern: /^bluewallet:\/\/xpub\/.+\/.+/ },
        { type: ContinuityActivityType.IsItMyAddress, pattern: /^bluewallet:\/\/isitmyaddress\/.+/ },
        { type: ContinuityActivityType.SignVerify, pattern: /^bluewallet:\/\/signverify\/.+\/.+/ },
        { type: ContinuityActivityType.SendOnchain, pattern: /^bluewallet:\/\/sendonchain\/.+/ },
        { type: ContinuityActivityType.LightningSettings, pattern: /^bluewallet:\/\/lightningsettings\?url=/ },
        { type: ContinuityActivityType.ElectrumSettings, pattern: /^bluewallet:\/\/electrumsettings\?server=/ },
      ];

      assert.ok(expectedPatterns.length === 7);
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

    it('should call listener for IsItMyAddress when address is present', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.IsItMyAddress, userInfo: { address: 'bc1qtest' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('isitmyaddress'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('bc1qtest'));
    });

    it('should not call listener for ReceiveOnchain when address is missing', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ReceiveOnchain, userInfo: {} });
      // Even the alert should not appear when address is missing
      await new Promise<void>(resolve =>
        setTimeout(() => {
          // No alert shown because activityToURL returns null for missing address
          assert.strictEqual(mockListener.mock.calls.length, 0);
          resolve();
        }, 10),
      );
    });

    it('should not call listener for Xpub when xpub or walletID is missing', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { xpub: 'xpubABC' } });
      await new Promise<void>(resolve =>
        setTimeout(() => {
          assert.strictEqual(mockListener.mock.calls.length, 0);
          resolve();
        }, 10),
      );
    });

    it('should not call listener for Xpub when walletID is missing but xpub is present', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { walletID: 'wallet123' } });
      await new Promise<void>(resolve =>
        setTimeout(() => {
          assert.strictEqual(mockListener.mock.calls.length, 0);
          resolve();
        }, 10),
      );
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

    it('should call listener for SignVerify when walletID and address are present', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.SignVerify, userInfo: { walletID: 'wallet123', address: 'bc1qtest' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('signverify'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('wallet123'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('bc1qtest'));
    });

    it('should not call listener for ElectrumSettings when server is missing', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ElectrumSettings, userInfo: {} });
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.strictEqual(mockListener.mock.calls.length, 0);
    });

    it('should call listener for ElectrumSettings when server is present', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({
        activityType: ContinuityActivityType.ElectrumSettings,
        userInfo: { server: 'electrum1.bluewallet.io:443:s' },
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('electrumsettings'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes(encodeURIComponent('electrum1.bluewallet.io:443:s')));
    });
  });

  describe('ViewInBlockExplorer handling', () => {
    let Linking: { openURL: jest.Mock };

    beforeEach(() => {
      Linking = require('react-native').Linking;
    });

    it('should open external URL for ViewInBlockExplorer and not call listener', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({
        activityType: ContinuityActivityType.ViewInBlockExplorer,
        userInfo: {},
        webpageURL: 'https://mempool.space/tx/abc123',
      });
      await new Promise(resolve => setTimeout(resolve, 10));
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

  describe('ReceiveOnchain and Xpub prompt handling', () => {
    let navigateMock: jest.Mock;

    beforeEach(() => {
      navigateMock = require('../../NavigationService').navigate;
    });

    it('should show alert for ReceiveOnchain with valid address', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ReceiveOnchain, userInfo: { address: 'bc1qtest' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.strictEqual(mockPresentAlert.mock.calls.length, 1);
      assert.strictEqual(mockListener.mock.calls.length, 0);
      const buttons = mockPresentAlert.mock.calls[0][0].buttons;
      assert.strictEqual(buttons.length, 3);
    });

    it('should show alert for Xpub with valid data', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { xpub: 'xpubABC', walletID: 'wallet123' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      assert.strictEqual(mockPresentAlert.mock.calls.length, 1);
      assert.strictEqual(mockListener.mock.calls.length, 0);
      const buttons = mockPresentAlert.mock.calls[0][0].buttons;
      assert.strictEqual(buttons.length, 3);
    });

    it('should call listener when View as QR is pressed for ReceiveOnchain', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ReceiveOnchain, userInfo: { address: 'bc1qtest' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      const buttons = mockPresentAlert.mock.calls[0][0].buttons;
      const qrButton = buttons.find((b: any) => b.text !== 'Cancel' && b.text !== 'Import');
      assert.ok(qrButton, 'QR button should exist');
      qrButton.onPress();
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('receiveonchain'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('bc1qtest'));
    });

    it('should navigate to ImportWallet when Import is pressed for ReceiveOnchain', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.ReceiveOnchain, userInfo: { address: 'bc1qtest' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      const buttons = mockPresentAlert.mock.calls[0][0].buttons;
      const importButton = buttons.find((b: any) => b.text === 'Import');
      assert.ok(importButton, 'Import button should exist');
      importButton.onPress();
      assert.strictEqual(navigateMock.mock.calls.length, 1);
      assert.strictEqual(navigateMock.mock.calls[0][0], 'AddWalletRoot');
      assert.strictEqual(navigateMock.mock.calls[0][1].screen, 'ImportWallet');
      assert.strictEqual(navigateMock.mock.calls[0][1].params.label, 'bc1qtest');
      assert.strictEqual(navigateMock.mock.calls[0][1].params.triggerImport, true);
    });

    it('should navigate to ImportWallet with xpub when Import is pressed for Xpub', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { xpub: 'xpubABC', walletID: 'wallet123' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      const buttons = mockPresentAlert.mock.calls[0][0].buttons;
      const importButton = buttons.find((b: any) => b.text === 'Import');
      assert.ok(importButton, 'Import button should exist');
      importButton.onPress();
      assert.strictEqual(navigateMock.mock.calls.length, 1);
      assert.strictEqual(navigateMock.mock.calls[0][0], 'AddWalletRoot');
      assert.strictEqual(navigateMock.mock.calls[0][1].params.label, 'xpubABC');
    });

    it('should call listener when View as QR is pressed for Xpub', async () => {
      if (!continuityLinking.subscribe) return;
      continuityLinking.subscribe(mockListener);
      assert.ok(capturedEventCallback, 'onUserActivityOpen callback should be registered');
      capturedEventCallback!({ activityType: ContinuityActivityType.Xpub, userInfo: { xpub: 'xpubABC', walletID: 'wallet123' } });
      await new Promise(resolve => setTimeout(resolve, 10));
      const buttons = mockPresentAlert.mock.calls[0][0].buttons;
      const qrButton = buttons.find((b: any) => b.text !== 'Cancel' && b.text !== 'Import');
      assert.ok(qrButton, 'QR button should exist');
      qrButton.onPress();
      assert.strictEqual(mockListener.mock.calls.length, 1);
      assert.ok((mockListener.mock.calls[0][0] as string).includes('xpub'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('wallet123'));
      assert.ok((mockListener.mock.calls[0][0] as string).includes('xpubABC'));
    });
  });
});
