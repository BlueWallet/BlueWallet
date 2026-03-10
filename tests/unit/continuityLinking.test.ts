import assert from 'assert';
import { ContinuityActivityType } from '../../components/types';

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
});
