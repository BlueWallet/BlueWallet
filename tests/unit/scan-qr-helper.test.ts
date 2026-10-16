import assert from 'assert';
import type { NavigationAction } from '@react-navigation/native';

import { navigationRef } from '../../NavigationService';
import { findScannerNavigatorKey, scanQrHelper } from '../../helpers/scan-qr';

jest.mock('../../NavigationService', () => ({
  navigationRef: {
    isReady: jest.fn(),
    getRootState: jest.fn(),
    dispatch: jest.fn(),
    navigate: jest.fn(),
  },
}));

// Drawer > DetailViewStack (has ScanQRCode) > SendDetailsRoot modal (SendDetailsStack has ScanQRCode) > SendDetails
const stateWithModalStack = {
  key: 'drawer-1',
  index: 0,
  routeNames: ['DrawerRoot'],
  routes: [
    {
      key: 'DrawerRoot-1',
      name: 'DrawerRoot',
      state: {
        key: 'detail-1',
        index: 1,
        routeNames: ['WalletsList', 'WalletTransactions', 'SendDetailsRoot', 'ScanQRCode'],
        routes: [
          { key: 'WalletsList-1', name: 'WalletsList' },
          {
            key: 'SendDetailsRoot-1',
            name: 'SendDetailsRoot',
            state: {
              key: 'send-1',
              index: 0,
              routeNames: ['SendDetails', 'Confirm', 'ScanQRCode'],
              routes: [{ key: 'SendDetails-1', name: 'SendDetails' }],
            },
          },
        ],
      },
    },
  ],
};

// Drawer > DetailViewStack (has ScanQRCode) > WalletsList
const stateAtRoot = {
  key: 'drawer-1',
  index: 0,
  routeNames: ['DrawerRoot'],
  routes: [
    {
      key: 'DrawerRoot-1',
      name: 'DrawerRoot',
      state: {
        key: 'detail-1',
        index: 0,
        routeNames: ['WalletsList', 'SendDetailsRoot', 'ScanQRCode'],
        routes: [{ key: 'WalletsList-1', name: 'WalletsList' }],
      },
    },
  ],
};

// Drawer > DetailViewStack (has ScanQRCode) > Settings stack without a scanner route
const stateInStackWithoutScanner = {
  key: 'drawer-1',
  index: 0,
  routeNames: ['DrawerRoot'],
  routes: [
    {
      key: 'DrawerRoot-1',
      name: 'DrawerRoot',
      state: {
        key: 'detail-1',
        index: 1,
        routeNames: ['WalletsList', 'SettingsRoot', 'ScanQRCode'],
        routes: [
          { key: 'WalletsList-1', name: 'WalletsList' },
          {
            key: 'SettingsRoot-1',
            name: 'SettingsRoot',
            state: {
              key: 'settings-1',
              index: 0,
              routeNames: ['Settings', 'IsItMyAddress'],
              routes: [{ key: 'IsItMyAddress-1', name: 'IsItMyAddress' }],
            },
          },
        ],
      },
    },
  ],
};

describe('findScannerNavigatorKey', () => {
  it('prefers the deepest focused navigator that registers ScanQRCode', () => {
    assert.strictEqual(findScannerNavigatorKey(stateWithModalStack as any), 'send-1');
  });

  it('falls back to the outer navigator when the focused stack has no scanner', () => {
    assert.strictEqual(findScannerNavigatorKey(stateInStackWithoutScanner as any), 'detail-1');
  });

  it('uses the root detail stack when nothing is presented above it', () => {
    assert.strictEqual(findScannerNavigatorKey(stateAtRoot as any), 'detail-1');
  });

  it('returns undefined without navigation state', () => {
    assert.strictEqual(findScannerNavigatorKey(undefined), undefined);
  });
});

describe('scanQrHelper', () => {
  beforeEach(() => {
    jest.mocked(navigationRef.isReady).mockReturnValue(true);
    jest.mocked(navigationRef.dispatch).mockReset();
  });

  it('opens the scanner inside the presented modal stack instead of over it from the root', async () => {
    jest.mocked(navigationRef.getRootState).mockReturnValue(stateWithModalStack as any);
    const promise = scanQrHelper();
    await new Promise(resolve => setImmediate(resolve));
    const [action] = jest.mocked(navigationRef.dispatch).mock.calls[0] as [NavigationAction];
    assert.strictEqual(action.type, 'NAVIGATE');
    assert.strictEqual(action.target, 'send-1');
    assert.strictEqual((action.payload as any).name, 'ScanQRCode');
    assert.strictEqual((action.payload as any).params.showFileImportButton, true);
    (action.payload as any).params.onBarScanned('bitcoin:bc1qtest', false);
    assert.strictEqual(await promise, 'bitcoin:bc1qtest');
  });

  it('keeps the root stack as the target when no modal stack is focused', async () => {
    jest.mocked(navigationRef.getRootState).mockReturnValue(stateAtRoot as any);
    const promise = scanQrHelper();
    await new Promise(resolve => setImmediate(resolve));
    const [action] = jest.mocked(navigationRef.dispatch).mock.calls[0] as [NavigationAction];
    assert.strictEqual(action.target, 'detail-1');
    (action.payload as any).params.onBarScanned('zpub', false);
    assert.strictEqual(await promise, 'zpub');
  });
});
