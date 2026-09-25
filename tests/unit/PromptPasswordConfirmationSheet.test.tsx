import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { StackActions } from '@react-navigation/native';

import PromptPasswordConfirmationSheet from '../../screen/PromptPasswordConfirmationSheet';
import { MODAL_TYPES } from '../../screen/PromptPasswordConfirmationSheet.types';

jest.spyOn(Animated, 'timing').mockImplementation(
  () =>
    ({
      start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
      stop: () => {},
      reset: () => {},
    }) as any,
);
jest.spyOn(Animated, 'sequence').mockImplementation(
  () =>
    ({
      start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
      stop: () => {},
      reset: () => {},
    }) as any,
);

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, dispatch: mockDispatch }),
    useRoute: () => mockUseRoute(),
  };
});

const mockEncryptStorage = jest.fn();
const mockDecryptStorage = jest.fn();
const mockSaveToDisk = jest.fn();
const mockCreateFakeStorage = jest.fn();
const mockResetWallets = jest.fn();
const mockIsPasswordInUse = jest.fn();

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    encryptStorage: mockEncryptStorage,
    decryptStorage: mockDecryptStorage,
    saveToDisk: mockSaveToDisk,
    cachedPassword: 'cached-pw',
    isPasswordInUse: mockIsPasswordInUse,
    createFakeStorage: mockCreateFakeStorage,
    resetWallets: mockResetWallets,
  }),
}));

const mockAlert = jest.fn();
jest.mock('../../components/Alert', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockAlert(...args),
}));

jest.mock('../../components/themes', () => ({
  useTheme: () => ({
    colors: {
      elevated: '#fff',
      inputBackgroundColor: '#eee',
      formBorder: '#ccc',
      foregroundColor: '#000',
      buttonAlternativeTextColor: '#333',
      successColor: '#0a0',
    },
  }),
}));

jest.mock('../../components/SecondButton', () => {
  const { Pressable, Text } = require('react-native');
  const ReactLocal = require('react');
  return {
    SecondButton: ({ title, onPress, testID, disabled }: any) =>
      ReactLocal.createElement(
        Pressable,
        { testID, onPress, disabled, accessibilityState: { disabled } },
        ReactLocal.createElement(Text, null, title),
      ),
  };
});

const mockHaptic = jest.fn();
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockHaptic(...args),
  HapticFeedbackTypes: {
    NotificationError: 'NotificationError',
    NotificationSuccess: 'NotificationSuccess',
  },
}));

const setRoute = (params: Record<string, unknown>) => {
  mockUseRoute.mockReturnValue({ params, key: 'k', name: 'PromptPasswordConfirmationSheet' });
};

const resetAllMocks = () => {
  mockGoBack.mockReset();
  mockDispatch.mockReset();
  mockEncryptStorage.mockReset().mockResolvedValue(undefined);
  mockDecryptStorage.mockReset().mockResolvedValue(undefined);
  mockSaveToDisk.mockReset().mockResolvedValue(undefined);
  mockCreateFakeStorage.mockReset().mockResolvedValue(undefined);
  mockResetWallets.mockReset();
  mockIsPasswordInUse.mockReset().mockResolvedValue(false);
  mockAlert.mockReset();
  mockHaptic.mockReset();
};

describe('PromptPasswordConfirmationSheet (render)', () => {
  beforeEach(resetAllMocks);
  afterAll(() => {
    jest.restoreAllMocks();
  });
  it('renders the enter-password form by default', () => {
    setRoute({ modalType: MODAL_TYPES.ENTER_PASSWORD, returnTo: 'EncryptStorage' });
    const { getByTestId, queryByTestId } = render(<PromptPasswordConfirmationSheet />);
    expect(getByTestId('PasswordInput')).toBeTruthy();
    expect(queryByTestId('ConfirmPasswordInput')).toBeNull();
    expect(getByTestId('OKButton')).toBeTruthy();
  });

  it('shows the explanation step for CREATE_PASSWORD and transitions to the form on I Understand', () => {
    setRoute({ modalType: MODAL_TYPES.CREATE_PASSWORD, returnTo: 'EncryptStorage' });
    const { getByTestId, queryByTestId } = render(<PromptPasswordConfirmationSheet />);

    expect(getByTestId('IUnderstandButton')).toBeTruthy();
    expect(queryByTestId('PasswordInput')).toBeNull();

    act(() => {
      fireEvent.press(getByTestId('IUnderstandButton'));
    });

    expect(getByTestId('PasswordInput')).toBeTruthy();
    expect(getByTestId('ConfirmPasswordInput')).toBeTruthy();
  });

  it('disables the OK button while the password is empty', () => {
    setRoute({ modalType: MODAL_TYPES.ENTER_PASSWORD, returnTo: 'EncryptStorage' });
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    const okButton = getByTestId('OKButton');
    expect(okButton.props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(getByTestId('PasswordInput'), 'something');
    expect(getByTestId('OKButton').props.accessibilityState?.disabled).toBe(false);
  });

  it('decrypts and pops to top on successful ENTER_PASSWORD submit', async () => {
    setRoute({ modalType: MODAL_TYPES.ENTER_PASSWORD, returnTo: 'EncryptStorage' });
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    fireEvent.changeText(getByTestId('PasswordInput'), 'hunter2');
    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    expect(mockDecryptStorage).toHaveBeenCalledWith('hunter2');
    expect(mockSaveToDisk).toHaveBeenCalled();
    expect(mockHaptic).toHaveBeenCalledWith('NotificationSuccess');
    expect(mockDispatch).toHaveBeenCalledWith(StackActions.popToTop());
  });

  it('encrypts and goes back on successful CREATE_PASSWORD submit', async () => {
    setRoute({ modalType: MODAL_TYPES.CREATE_PASSWORD, returnTo: 'EncryptStorage' });
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    act(() => {
      fireEvent.press(getByTestId('IUnderstandButton'));
    });

    fireEvent.changeText(getByTestId('PasswordInput'), 'matching');
    fireEvent.changeText(getByTestId('ConfirmPasswordInput'), 'matching');

    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    expect(mockEncryptStorage).toHaveBeenCalledWith('matching');
    expect(mockSaveToDisk).toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shakes and alerts when CREATE_PASSWORD confirmation does not match', async () => {
    setRoute({ modalType: MODAL_TYPES.CREATE_PASSWORD, returnTo: 'EncryptStorage' });
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    act(() => {
      fireEvent.press(getByTestId('IUnderstandButton'));
    });

    fireEvent.changeText(getByTestId('PasswordInput'), 'abc');
    fireEvent.changeText(getByTestId('ConfirmPasswordInput'), 'xyz');

    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    expect(mockEncryptStorage).not.toHaveBeenCalled();
    expect(mockHaptic).toHaveBeenCalledWith('NotificationError');
    expect(mockAlert).toHaveBeenCalledWith({ message: 'Passwords do not match.' });
  });

  it('rejects CREATE_FAKE_STORAGE when password is already in use', async () => {
    setRoute({ modalType: MODAL_TYPES.CREATE_FAKE_STORAGE, returnTo: 'PlausibleDeniability' });
    mockIsPasswordInUse.mockResolvedValue(true);
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    fireEvent.changeText(getByTestId('PasswordInput'), 'newpw');
    fireEvent.changeText(getByTestId('ConfirmPasswordInput'), 'newpw');

    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
    expect(mockCreateFakeStorage).not.toHaveBeenCalled();
    expect(mockResetWallets).not.toHaveBeenCalled();
  });

  it('rejects CREATE_FAKE_STORAGE when password equals cachedPassword without querying isPasswordInUse', async () => {
    setRoute({ modalType: MODAL_TYPES.CREATE_FAKE_STORAGE, returnTo: 'PlausibleDeniability' });
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    fireEvent.changeText(getByTestId('PasswordInput'), 'cached-pw');
    fireEvent.changeText(getByTestId('ConfirmPasswordInput'), 'cached-pw');

    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
    expect(mockIsPasswordInUse).not.toHaveBeenCalled();
    expect(mockCreateFakeStorage).not.toHaveBeenCalled();
  });

  it('creates fake storage and pops to top on success', async () => {
    setRoute({ modalType: MODAL_TYPES.CREATE_FAKE_STORAGE, returnTo: 'PlausibleDeniability' });
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    fireEvent.changeText(getByTestId('PasswordInput'), 'fresh');
    fireEvent.changeText(getByTestId('ConfirmPasswordInput'), 'fresh');

    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    expect(mockCreateFakeStorage).toHaveBeenCalledWith('fresh');
    expect(mockResetWallets).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(StackActions.popToTop());
  });

  it('surfaces thrown errors via presentAlert', async () => {
    setRoute({ modalType: MODAL_TYPES.ENTER_PASSWORD, returnTo: 'EncryptStorage' });
    mockDecryptStorage.mockRejectedValue(new Error('boom'));
    const { getByTestId } = render(<PromptPasswordConfirmationSheet />);

    fireEvent.changeText(getByTestId('PasswordInput'), 'whatever');
    await act(async () => {
      fireEvent.press(getByTestId('OKButton'));
    });

    expect(mockAlert).toHaveBeenCalledWith({ message: 'boom' });
    expect(mockHaptic).toHaveBeenCalledWith('NotificationError');
  });
});
