import { navigateToWalletsList, navigationRef } from '../../NavigationService';

jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: jest.fn(),
    resetRoot: jest.fn(),
  }),
}));

describe('wallet deletion navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('replaces the entire root history with the wallet list, including nested stacks and modals', () => {
    jest.mocked(navigationRef.isReady).mockReturnValue(true);

    navigateToWalletsList();

    expect(navigationRef.resetRoot).toHaveBeenCalledWith({
      index: 0,
      routes: [
        {
          name: 'DrawerRoot',
          state: {
            routes: [
              {
                name: 'DetailViewStackScreensStack',
                state: { routes: [{ name: 'WalletsList' }] },
              },
            ],
          },
        },
      ],
    });
  });

  it('does not reset an unmounted navigator', () => {
    jest.mocked(navigationRef.isReady).mockReturnValue(false);

    navigateToWalletsList();

    expect(navigationRef.resetRoot).not.toHaveBeenCalled();
  });
});
