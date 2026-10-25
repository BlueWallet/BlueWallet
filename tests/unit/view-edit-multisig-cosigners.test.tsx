import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';
import ViewEditMultisigCosigners from '../../screen/wallets/ViewEditMultisigCosigners';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockNavigateToWalletsList = jest.fn();
const mockSetParams = jest.fn();
const mockSetWalletsWithNewOrder = jest.fn();
const mockShowActionSheetWithOptions = jest.fn();
let mockPreventRemove: ((event: { data: { action: object } }) => void) | undefined;
let mockSecretIsInvalid = false;
let mockResolveFetchBalance: (() => void) | undefined;

const mockStoredWallet = { getID: () => 'wallet-id', getSecret: () => 'secret' };
const mockTempWallet = {
  setSecret: jest.fn(() => {
    if (mockSecretIsInvalid) throw new Error('invalid cosigner');
  }),
  getN: () => 0,
  getM: () => 0,
  howManySignaturesCanWeMake: () => 0,
  fetchBalance: jest.fn(() => new Promise<void>(resolve => (mockResolveFetchBalance = resolve))),
};

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
  useNavigation: () => ({ dispatch: mockDispatch, goBack: mockGoBack, navigate: jest.fn(), setParams: mockSetParams }),
  usePreventRemove: (_enabled: boolean, callback: typeof mockPreventRemove) => {
    mockPreventRemove = callback;
  },
  useRoute: () => ({ params: { walletID: 'wallet-id' } }),
}));
jest.mock('../../screen/ActionSheet', () => ({
  __esModule: true,
  default: { showActionSheetWithOptions: (...args: unknown[]) => mockShowActionSheetWithOptions(...args) },
}));
jest.mock('../../class/wallets/multisig-hd-wallet', () => ({
  MultisigHDWallet: jest.fn(() => mockTempWallet),
}));
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: [mockStoredWallet], setWalletsWithNewOrder: mockSetWalletsWithNewOrder }),
}));
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({ isElectrumDisabled: false, isPrivacyBlurEnabled: false }),
}));
jest.mock('../../hooks/useBiometrics', () => ({
  unlockWithBiometrics: jest.fn(),
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: async () => false }),
}));
jest.mock('../../hooks/useScreenProtect', () => ({
  useScreenProtect: () => ({ enableScreenProtect: jest.fn(), disableScreenProtect: jest.fn() }),
}));
jest.mock('../../NavigationService', () => ({ navigateToWalletsList: () => mockNavigateToWalletsList() }));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../../components/Alert', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../components/Badge', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/BlueCard', () => ({
  __esModule: true,
  default: ({ children }: React.PropsWithChildren) => <View>{children}</View>,
}));
jest.mock('../../components/BlueLoading', () => ({ BlueLoading: () => <Text>Loading</Text> }));
jest.mock('../../components/BlueSpacing', () => ({ BlueSpacing10: () => null, BlueSpacing20: () => null }));
jest.mock('../../components/Button', () => ({
  __esModule: true,
  default: ({ onPress, testID, title }: { onPress: () => void; testID: string; title: string }) => (
    <Pressable testID={testID} onPress={onPress}>
      <Text>{title}</Text>
    </Pressable>
  ),
}));
jest.mock('../../components/MultipleStepsListItem', () => ({
  __esModule: true,
  default: () => null,
  MultipleStepsListItemButtonType: {},
  MultipleStepsListItemDashType: {},
}));
jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    _: { cancel: 'Cancel', discard_changes: 'Discard changes', discard_changes_explain: 'Discard?', ok: 'OK', save: 'Save' },
    multisig: {
      invalid_cosigner: 'Invalid cosigner',
      manage_keys: 'Manage keys',
      signatures_required_to_spend: 'Required',
      signatures_we_can_make: 'Available',
    },
    formatString: (value: string) => value,
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockPreventRemove = undefined;
  mockResolveFetchBalance = undefined;
  mockSecretIsInvalid = false;
});

afterEach(() => jest.useRealTimers());

it('holds an in-flight save until the discard sheet closes', async () => {
  const screen = render(<ViewEditMultisigCosigners />);
  await waitFor(() => expect(screen.getByTestId('VaultCosignersSave')).toBeTruthy());

  fireEvent.press(screen.getByTestId('VaultCosignersSave'));
  await act(async () => Promise.resolve());
  await act(async () => jest.advanceTimersByTime(100));
  act(() => mockPreventRemove?.({ data: { action: { type: 'GO_BACK' } } }));
  act(() => mockResolveFetchBalance?.());
  await act(async () => Promise.resolve());

  expect(mockSetWalletsWithNewOrder).not.toHaveBeenCalled();
  const completion = mockShowActionSheetWithOptions.mock.calls[0][1];
  await act(async () => {
    completion(0);
    await jest.advanceTimersByTimeAsync(0);
  });
  await waitFor(() => expect(mockSetWalletsWithNewOrder).toHaveBeenCalledTimes(1));

  act(() => jest.advanceTimersByTime(500));
  expect(mockNavigateToWalletsList).toHaveBeenCalledTimes(1);
});

it('does not save or navigate when discard wins', async () => {
  const screen = render(<ViewEditMultisigCosigners />);
  await waitFor(() => expect(screen.getByTestId('VaultCosignersSave')).toBeTruthy());

  fireEvent.press(screen.getByTestId('VaultCosignersSave'));
  await act(async () => Promise.resolve());
  await act(async () => jest.advanceTimersByTime(100));
  act(() => mockPreventRemove?.({ data: { action: { type: 'GO_BACK' } } }));
  act(() => mockResolveFetchBalance?.());
  const completion = mockShowActionSheetWithOptions.mock.calls[0][1];
  await act(async () => completion(1));
  act(() => jest.advanceTimersByTime(500));

  expect(mockSetWalletsWithNewOrder).not.toHaveBeenCalled();
  expect(mockNavigateToWalletsList).not.toHaveBeenCalled();
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'GO_BACK' });
});

it('shows the invalid-cosigner sheet before leaving', async () => {
  mockSecretIsInvalid = true;
  render(<ViewEditMultisigCosigners />);

  await waitFor(() => expect(mockShowActionSheetWithOptions).toHaveBeenCalled());
  expect(mockShowActionSheetWithOptions.mock.calls[0][0]).toEqual(
    expect.objectContaining({ message: 'Invalid cosigner', cancelButtonIndex: 0 }),
  );
  expect(mockGoBack).not.toHaveBeenCalled();

  act(() => mockShowActionSheetWithOptions.mock.calls[0][1](0));
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});
