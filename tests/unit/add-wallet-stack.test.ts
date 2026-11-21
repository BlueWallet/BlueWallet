import { Keyboard } from 'react-native';

import { createAddWalletOptions, createImportWalletOptions } from '../../navigation/AddWalletStack';
import type { AddWalletStackParamList } from '../../navigation/AddWalletStack';
import type { ScreenDeps } from '../../components/navigationStyle';
import { Chain } from '../../models/bitcoinUnits';

type ImportWalletDeps = ScreenDeps<AddWalletStackParamList, 'ImportWallet'>;
type AddWalletDeps = ScreenDeps<AddWalletStackParamList, 'AddWallet'>;

jest.mock('../../typings/CommonToolTipActions', () => ({
  CommonToolTipActions: {
    Passphrase: { id: 'passphrase', text: 'Passphrase' },
    Entropy: { id: 'entropy', text: 'Entropy' },
    ResetToDefault: { id: 'resetToDefault', text: 'Reset to default' },
    SearchAccount: { id: 'searchAccounts', text: 'Search accounts' },
    ClearClipboard: { id: 'clearClipboard', text: 'Clear clipboard' },
  },
}));

describe('createImportWalletOptions', () => {
  it('dismisses the keyboard before toggling ImportWallet menu state', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
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
      } as unknown as ImportWalletDeps['navigation'],
      route: {
        params: {
          askPassphraseMenuState: false,
          searchAccountsMenuState: false,
          clearClipboardMenuState: true,
        },
      } as ImportWalletDeps['route'],
    });

    const unstableItems = options.unstable_headerRightItems as unknown as
      | (() => Array<{ menu?: { items: Array<{ onPress?: () => void }> } }>)
      | undefined;

    if (unstableItems) {
      const menuButton = unstableItems()[0];
      menuButton.menu?.items[0].onPress?.();
    } else {
      const headerRightElement = (options.headerRight as unknown as () => { props: { onPressMenuItem: (id: string) => void } })();
      headerRightElement.props.onPressMenuItem('passphrase');
    }

    expect(dismissSpy).toHaveBeenCalledTimes(1);
    expect(setParams).toHaveBeenCalledWith({ askPassphraseMenuState: true });
  });
});

describe('createAddWalletOptions passphrase menu', () => {
  const theme = {
    barStyle: 'dark-content',
    closeImage: 1,
    colors: { foregroundColor: '#000' },
  } as any;

  const buildOptions = (params: AddWalletStackParamList['AddWallet']) => {
    const setParams = jest.fn();
    const options = createAddWalletOptions(theme)({
      navigation: {
        getState: () => ({ index: 0 }),
        goBack: jest.fn(),
        navigate: jest.fn(),
        setParams,
      } as unknown as AddWalletDeps['navigation'],
      route: { params } as AddWalletDeps['route'],
    });
    return { options, setParams };
  };

  // headerRight is always returned, so drive the menu through it regardless of platform
  const pressPassphraseItem = (options: ReturnType<typeof buildOptions>['options']) => {
    const headerRightElement = (options.headerRight as unknown as () => { props: { onPressMenuItem: (id: string) => void } })();
    headerRightElement.props.onPressMenuItem('passphrase');
  };

  it('turns the passphrase menu state on when it is currently off', () => {
    const { options, setParams } = buildOptions({ selectedWalletType: Chain.ONCHAIN, askPassphraseMenuState: false });

    pressPassphraseItem(options);

    expect(setParams).toHaveBeenCalledWith({ askPassphraseMenuState: true });
  });

  it('turns the passphrase menu state off when it is currently on', () => {
    const { options, setParams } = buildOptions({ selectedWalletType: Chain.ONCHAIN, askPassphraseMenuState: true });

    pressPassphraseItem(options);

    expect(setParams).toHaveBeenCalledWith({ askPassphraseMenuState: false });
  });
});
