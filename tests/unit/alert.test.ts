import { Alert, Platform } from 'react-native';

import presentAlert, { runAfterAlertDismissed } from '../../components/Alert';

describe('Alert dismissal lifecycle', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    global.requestAnimationFrame = callback => {
      callback(Date.now());
      return 0;
    };
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('runs queued work after the iOS dismissal delay', async () => {
    const afterDismiss = jest.fn();
    presentAlert({ message: 'Network error' });
    expect(runAfterAlertDismissed(afterDismiss)).toBe(true);

    const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
    await buttons?.[0].onPress?.();
    jest.advanceTimersByTime(399);
    expect(afterDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(afterDismiss).toHaveBeenCalledTimes(1);
  });

  it('runs queued work after an Android button dismisses the alert', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const afterDismiss = jest.fn();
    presentAlert({ message: 'Network error', options: { cancelable: false } });
    expect(runAfterAlertDismissed(afterDismiss)).toBe(true);

    const buttons = jest.mocked(Alert.alert).mock.calls[0][2];
    await buttons?.[0].onPress?.();
    jest.advanceTimersByTime(399);
    expect(afterDismiss).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(afterDismiss).toHaveBeenCalledTimes(1);
  });

  it('waits for a replacement alert to dismiss', async () => {
    const afterDismiss = jest.fn();
    presentAlert({
      message: 'First',
      buttons: [{ text: 'Next', onPress: () => presentAlert({ message: 'Second' }) }],
    });
    expect(runAfterAlertDismissed(afterDismiss)).toBe(true);

    const firstButtons = jest.mocked(Alert.alert).mock.calls[0][2];
    await firstButtons?.[0].onPress?.();
    jest.advanceTimersByTime(400);
    expect(afterDismiss).not.toHaveBeenCalled();

    const secondButtons = jest.mocked(Alert.alert).mock.calls[1][2];
    await secondButtons?.[0].onPress?.();
    jest.advanceTimersByTime(400);
    expect(afterDismiss).toHaveBeenCalledTimes(1);
  });

  it('drains the queue even when a dismissal callback throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const throwingCallback = jest.fn(() => {
      throw new Error('callback failed');
    });
    const afterDismiss = jest.fn();
    presentAlert({ message: 'First' });
    runAfterAlertDismissed(throwingCallback);
    runAfterAlertDismissed(afterDismiss);

    await jest.mocked(Alert.alert).mock.calls[0][2]?.[0].onPress?.();
    jest.advanceTimersByTime(400);
    expect(afterDismiss).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    presentAlert({ message: 'Second' });
    await jest.mocked(Alert.alert).mock.calls[1][2]?.[0].onPress?.();
    jest.advanceTimersByTime(400);
    expect(throwingCallback).toHaveBeenCalledTimes(1);
    expect(afterDismiss).toHaveBeenCalledTimes(1);
  });
});
