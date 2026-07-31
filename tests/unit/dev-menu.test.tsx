import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Alert, DevSettings, Platform } from 'react-native';

import DevMenu, { RECEIVE_DETAILS_MOCKED_VALUE, ReceiveDetailsMockScenario, registerReceiveDetailsDevMenu } from '../../components/DevMenu';

const mockAddWallet = jest.fn();

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ wallets: [], addWallet: mockAddWallet }),
}));

describe('DevMenu Receive Details scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes mocked scenario options only while ReceiveDetails is registered', () => {
    const addMenuItem = jest.spyOn(DevSettings, 'addMenuItem');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const scenarioHandler = jest.fn<void, [ReceiveDetailsMockScenario, typeof RECEIVE_DETAILS_MOCKED_VALUE]>();
    const unregister = registerReceiveDetailsDevMenu(scenarioHandler);

    render(<DevMenu />);

    const launcher = addMenuItem.mock.calls.find(([title]) => title === 'Receive Details Mock Scenarios')?.[1];
    expect(launcher).toBeDefined();
    act(() => launcher?.());

    if (Platform.OS === 'android') {
      const rootButtons = alert.mock.calls.at(-1)?.[2];
      act(() => rootButtons?.find(button => button.text === 'Payment states…')?.onPress?.());
      const paymentButtons = alert.mock.calls.at(-1)?.[2];
      act(() => paymentButtons?.find(button => button.text === 'Confirmed')?.onPress?.());
    } else {
      const buttons = alert.mock.calls.at(-1)?.[2];
      act(() => buttons?.find(button => button.text === 'Confirmed')?.onPress?.());
    }

    expect(scenarioHandler).toHaveBeenCalledWith('confirmed', 'mocked');

    unregister();
    alert.mockClear();
    act(() => launcher?.());
    expect(alert).not.toHaveBeenCalled();
  });
});
