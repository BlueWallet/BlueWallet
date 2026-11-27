/**
 * The app's messages in its own style (`AppDialogHost`): what `presentAlert`,
 * `appAlert` and the Android action sheet show once the host is mounted, and
 * the system dialog before that.
 */
import React from 'react';
import { Alert, BackHandler } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import presentAlert from '../../components/Alert';
import { AppDialogHost, appAlert, isAppDialogReady } from '../../components/AppDialog';
import { BlueDefaultTheme } from '../../components/themes';
import loc from '../../loc';

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: {
    Selection: 'selection',
    NotificationSuccess: 'notificationSuccess',
    NotificationWarning: 'notificationWarning',
    NotificationError: 'notificationError',
  },
}));

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const mount = () =>
  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider value={BlueDefaultTheme as never}>
        <AppDialogHost />
      </ThemeProvider>
    </SafeAreaProvider>,
  );

/** Android's Back, as the host listens to it. */
let backHandlers: Array<() => boolean | null | undefined> = [];
const pressBack = () =>
  act(() => {
    backHandlers[backHandlers.length - 1]?.();
  });

beforeEach(() => {
  backHandlers = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
    backHandlers.push(handler);
    return { remove: () => (backHandlers = backHandlers.filter(h => h !== handler)) };
  });
});
afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('AppDialog', () => {
  it('until the host is mounted, messages use the system dialog', () => {
    const system = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    expect(isAppDialogReady()).toBe(false);
    presentAlert({ message: 'Saved before the app was ready' });
    appAlert('Title', 'Body');
    expect(system).toHaveBeenCalledTimes(2);
  });

  it('a plain message shows in the app with OK; the backdrop or Back closes it', () => {
    const system = jest.spyOn(Alert, 'alert');
    mount();
    act(() => presentAlert({ message: 'Address copied.' }));
    expect(system).not.toHaveBeenCalled();
    expect(screen.getByTestId('AppDialogTitle').props.children).toBe('Address copied.');
    expect(screen.getByTestId('AppDialogIcon-info')).toBeTruthy();
    expect(screen.getByTestId('AppDialogMain')).toBeTruthy();
    pressBack();
    expect(screen.queryByTestId('AppDialog')).toBeNull();
  });

  it('tells the tone from the call, its haptic or an "Error" title', () => {
    mount();
    act(() => presentAlert({ message: 'one', hapticFeedback: HapticFeedbackTypes.NotificationError }));
    expect(screen.getByTestId('AppDialogIcon-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('AppDialogMain'));
    act(() => presentAlert({ title: loc.errors.error, message: 'two' }));
    expect(screen.getByTestId('AppDialogIcon-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('AppDialogMain'));
    act(() => presentAlert({ tone: 'success', message: 'three' }));
    expect(screen.getByTestId('AppDialogIcon-success')).toBeTruthy();
  });

  it('a confirmation: the destructive choice first, Cancel last; Back does nothing unless it may be dismissed', () => {
    const reset = jest.fn();
    const cancel = jest.fn();
    mount();
    act(() =>
      appAlert('Reset local storage?', 'This removes all wallets.', [
        { text: 'Cancel', style: 'cancel', onPress: cancel },
        { text: 'Reset storage', style: 'destructive', onPress: reset },
      ]),
    );
    expect(screen.getByTestId('AppDialogIcon-warning')).toBeTruthy();
    expect(screen.getByText('This removes all wallets.')).toBeTruthy();
    pressBack();
    expect(screen.getByTestId('AppDialog')).toBeTruthy();
    expect(reset).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('AppDialogMain'));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(screen.queryByTestId('AppDialog')).toBeNull();
  });

  it('messages wait their turn, and a handler that shows another one queues it', () => {
    mount();
    act(() =>
      presentAlert({
        message: 'first',
        buttons: [{ text: 'Next', onPress: () => presentAlert({ message: 'third' }) }],
      }),
    );
    act(() => presentAlert({ message: 'second' }));
    expect(screen.getByTestId('AppDialogTitle').props.children).toBe('first');
    fireEvent.press(screen.getByTestId('AppDialogMain'));
    expect(screen.getByTestId('AppDialogTitle').props.children).toBe('second');
    fireEvent.press(screen.getByTestId('AppDialogMain'));
    expect(screen.getByTestId('AppDialogTitle').props.children).toBe('third');
  });

  it('a value to keep is shown apart and copied with its button', () => {
    mount();
    const txid = 'ab'.repeat(32);
    act(() =>
      presentAlert({
        tone: 'success',
        title: 'Transaction sent',
        message: 'The network has it.',
        detail: { label: 'Transaction ID', value: txid },
      }),
    );
    expect(screen.getByText('The network has it.')).toBeTruthy();
    expect(screen.getByText(txid)).toBeTruthy();
    fireEvent.press(screen.getByTestId('AppDialogCopy'));
    expect(Clipboard.setString).toHaveBeenCalledWith(txid);
  });

  it('the Android action sheet lists its choices in their order, with Cancel last', () => {
    // Jest resolves the iOS file by default; this is the Android one.
    const ActionSheet = require('../../screen/ActionSheet.ts').default as typeof import('../../screen/ActionSheet.ios').default;
    const chosen: number[] = [];
    mount();
    act(() =>
      ActionSheet.showActionSheetWithOptions(
        { title: 'Send', options: [loc._.cancel, 'Choose image', 'Scan QR'], cancelButtonIndex: 0 },
        index => chosen.push(index),
      ),
    );
    expect(screen.queryByTestId('AppDialogMain')).toBeNull();
    expect(screen.queryByTestId('AppDialogIcon-info')).toBeNull();
    expect(screen.getByTestId('AppDialogButton-0')).toBeTruthy();
    fireEvent.press(screen.getByTestId('AppDialogButton-1'));
    expect(chosen).toEqual([2]);
  });
});
