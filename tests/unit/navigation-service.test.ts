import { getCurrentWalletID, navigationRef } from '../../NavigationService';

const mockState = (state: unknown) => {
  jest.spyOn(navigationRef, 'isReady').mockReturnValue(true);
  jest.spyOn(navigationRef, 'getRootState').mockReturnValue(state as ReturnType<typeof navigationRef.getRootState>);
};

describe('getCurrentWalletID', () => {
  afterEach(() => jest.restoreAllMocks());

  it('takes the nearest wallet in the focused stack, even under a scanner', () => {
    mockState({
      index: 1,
      routes: [
        { name: 'DrawerRoot', state: { index: 0, routes: [{ name: 'WalletTransactions', params: { walletID: 'behind' } }] } },
        {
          name: 'SendDetailsRoot',
          params: { screen: 'SendDetails', params: { walletID: 'stale' } },
          state: {
            index: 2,
            routes: [
              { name: 'SendDetails', params: { walletID: 'first' } },
              { name: 'SendDetails', params: { walletID: 'draft' } },
              { name: 'ScanQRCode', params: { showFileImportButton: true } },
              { name: 'SendDetails', params: { walletID: 'popped' } },
            ],
          },
        },
      ],
    });
    expect(getCurrentWalletID()).toBe('draft');
  });

  it('returns nothing when the focused stack has no wallet or navigation is not ready', () => {
    mockState({ index: 0, routes: [{ name: 'DrawerRoot', state: { index: 0, routes: [{ name: 'WalletsList' }] } }] });
    expect(getCurrentWalletID()).toBeUndefined();

    jest.spyOn(navigationRef, 'isReady').mockReturnValue(false);
    expect(getCurrentWalletID()).toBeUndefined();
  });
});
