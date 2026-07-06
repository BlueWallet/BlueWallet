import { Keyboard } from 'react-native';

import { createImportWalletOptions } from '../../navigation/AddWalletStack';

jest.mock('../../typings/CommonToolTipActions', () => ({
  CommonToolTipActions: {
    Passphrase: { id: 'passphrase', text: 'Passphrase' },
    SearchAccount: { id: 'searchAccounts', text: 'Search accounts' },
    ClearClipboard: { id: 'clearClipboard', text: 'Clear clipboard' },
  },
}));

describe('createImportWalletOptions', () => {
  it('dismisses the keyboard before toggling ImportWallet menu state', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(jest.fn());
    const setParams = jest.fn();
    const options = createImportWalletOptions({
      barStyle: 'dark-content',
      closeImage: 1,
      colors: {
        foregroundColor: '#000',
      },
    } as any)({
      navigation: {
        getState: () => ({ index: 0 }),
        goBack: jest.fn(),
        setParams,
      },
      route: {
        params: {
          askPassphraseMenuState: false,
          searchAccountsMenuState: false,
          clearClipboardMenuState: true,
        },
      },
    });

    const menuButton = (
      options.unstable_headerRightItems as unknown as () => Array<{
        menu: { items: Array<{ onPress?: () => void }> };
      }>
    )()[0];

    menuButton.menu.items[0].onPress?.();

    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(setParams).toHaveBeenCalledWith({ askPassphraseMenuState: true });
  });
});
