/**
 * Third review · the unlock screen with the real unlock service and store,
 * over the storage double, with the biometric sensor and the dialogs replaced.
 *
 * - A sensor that throws while biometrics are on keeps the app locked and the
 *   setting on: probing the sensor never writes the user's setting.
 * - The restore button restores the copy it showed, by content. If that copy
 *   changed before the restore, nothing is written and the screen says so and
 *   lists the copies there are now.
 * - If the store reads again while the user confirms, nothing is restored and
 *   the ordinary unlock opens it (fourth review).
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render as renderPlain, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { BlueApp } from '../../class/blue-app';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import { startAndDecrypt } from '../../blue_modules/start-and-decrypt';
import presentAlert from '../../components/Alert';
import UnlockWith from '../../screen/UnlockWith';
import loc from '../../loc';
import { BlueDefaultTheme } from '../../components/themes';
import { StorageDouble } from './helpers/storage-double';

const sensor: { fails: boolean; prompts: number } = { fails: false, prompts: 0 };
jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  BiometryTypes: { TouchID: 'TouchID', FaceID: 'FaceID', Biometrics: 'Biometrics' },
  default: jest.fn().mockImplementation(() => ({
    isSensorAvailable: async () => {
      if (sensor.fails) throw new Error('sensor service crashed');
      return { available: true, biometryType: 'Biometrics' };
    },
    simplePrompt: async () => {
      sensor.prompts++;
      return { success: true };
    },
  })),
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { NotificationError: 'notificationError', NotificationSuccess: 'notificationSuccess' },
}));
jest.mock('../../components/Alert', () => ({ __esModule: true, default: jest.fn(), AlertType: { Alert: 0, Toast: 1 } }));

const app = BlueApp.getInstance();
const setWalletsInitialized = jest.fn();
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    setWalletsInitialized,
    isStorageEncrypted: () => app.storageIsEncrypted(),
    startAndDecrypt,
    setItem: (key: string, value: string) => app.setItem(key, value),
  }),
}));

const WORDS = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const store = (label: string) => {
  const wallet = NeuraiHDWallet.forNetwork('mainnet', WORDS);
  wallet.setLabel(label);
  return JSON.stringify({ wallets: [JSON.stringify(wallet)], tx_metadata: {}, counterparty_metadata: {} });
};
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const render = (ui: React.ReactElement) =>
  renderPlain(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider value={BlueDefaultTheme as never}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
const settle = async () => {
  for (let i = 0; i < 10; i++) await act(() => jest.advanceTimersByTimeAsync(100));
};

describe('UnlockWith (third review)', () => {
  let disk: StorageDouble;
  beforeEach(() => {
    jest.useFakeTimers();
    sensor.fails = false;
    sensor.prompts = 0;
    setWalletsInitialized.mockClear();
    (presentAlert as jest.Mock).mockClear();
    disk = new StorageDouble();
    disk.attach(app);
    // The screen and the service share the app's singleton: each test starts locked.
    (app as unknown as { sessionLoaded: boolean }).sessionLoaded = false;
  });
  afterEach(() => {
    cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a sensor that throws keeps the app locked and the biometrics setting on, across restarts', async () => {
    disk.seed({ data: store('Mine'), data_encrypted: '' });
    disk.primary.set('Biometrics', '1');
    sensor.fails = true;

    render(<UnlockWith />);
    await settle();
    expect(setWalletsInitialized).not.toHaveBeenCalledWith(true);
    expect(app.isSessionLoaded()).toBe(false);
    expect(disk.primary.get('Biometrics')).toBe('1');
    cleanup();

    // Next start, the sensor still failing: same answer, the setting is untouched.
    render(<UnlockWith />);
    await settle();
    expect(setWalletsInitialized).not.toHaveBeenCalledWith(true);
    expect(disk.primary.get('Biometrics')).toBe('1');
    expect(disk.log.filter(entry => entry === 'primary:Biometrics')).toEqual([]);
    cleanup();

    // The sensor works again: biometrics are asked for, and the app opens.
    sensor.fails = false;
    render(<UnlockWith />);
    await settle();
    expect(sensor.prompts).toBe(1);
    expect(setWalletsInitialized).toHaveBeenCalledWith(true);
  });

  it('a wrong password says so under the field until the user types again; the right one opens', async () => {
    const encryption = require('../../blue_modules/encryption');
    disk.seed({ data: JSON.stringify([encryption.encrypt(store('Mine'), 'right-password')]), data_encrypted: '1' });

    render(<UnlockWith />);
    await settle();
    expect(screen.getByTestId('UnlockButton').props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByTestId('UnlockWrongPassword')).toBeNull();

    fireEvent.changeText(screen.getByTestId('PasswordInput'), 'wrong-password');
    expect(screen.getByTestId('UnlockButton').props.accessibilityState.disabled).toBe(false);
    fireEvent.press(screen.getByTestId('UnlockButton'));
    await settle();
    expect(screen.getByText(loc._.bad_password)).toBeTruthy();
    expect(screen.getByTestId('PasswordInput').props.value).toBe('');
    expect(screen.getByTestId('UnlockButton').props.accessibilityState.disabled).toBe(true);
    expect(setWalletsInitialized).not.toHaveBeenCalledWith(true);

    // Typing clears the notice; the field can show what is typed.
    fireEvent.changeText(screen.getByTestId('PasswordInput'), 'right-password');
    expect(screen.queryByTestId('UnlockWrongPassword')).toBeNull();
    expect(screen.getByTestId('PasswordInput').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByTestId('PasswordVisibilityToggle'));
    expect(screen.getByTestId('PasswordInput').props.secureTextEntry).toBe(false);

    fireEvent(screen.getByTestId('PasswordInput'), 'submitEditing');
    await settle();
    expect(setWalletsInitialized).toHaveBeenCalledWith(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Mine']);
  });

  it('restores the copy the button showed; if it changed, writes nothing and lists the copies again', async () => {
    disk.readFault = { data: 'missing' };
    disk.backup.set('data', store('Caches copy'));
    disk.backupFile = true;
    disk.legacy.set('data', store('Documents copy'));
    disk.legacyFile = true;
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.text === loc.settings.storage_restore_backup)?.onPress?.();
    });

    render(<UnlockWith />);
    await settle();
    expect(screen.getByTestId('StorageRestoreBackupButton-0')).toBeTruthy();
    expect(screen.getByTestId('StorageRestoreBackupButton-1')).toBeTruthy();

    // The Caches copy (first button) changes after the list was shown.
    disk.backup.set('data', store('Written later'));
    disk.readFault = {};
    fireEvent.press(screen.getByTestId('StorageRestoreBackupButton-0'));
    await settle();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(presentAlert).toHaveBeenCalledWith({ message: loc.settings.storage_restore_changed });
    expect(disk.primary.has('data')).toBe(false);
    expect(setWalletsInitialized).not.toHaveBeenCalledWith(true);

    // The list now shows what is there; the second button is still the Documents copy.
    fireEvent.press(screen.getByTestId('StorageRestoreBackupButton-1'));
    await settle();
    expect(setWalletsInitialized).toHaveBeenCalledWith(true);
    expect(disk.primary.get('data')).toContain('Documents copy');
    // The copy not chosen was kept.
    expect(disk.keptData().some(data => data.includes('Written later'))).toBe(true);
  });

  it('a damaged bucket: the confirmation says only that part is replaced, under the same password (sixth review)', async () => {
    const encryption = require('../../blue_modules/encryption');
    const healthy = encryption.encrypt(store('Second storage'), 'pw-b');
    disk.primary.set('data', JSON.stringify([encryption.encrypt(JSON.stringify({ no: 'wallets' }), 'pw-a'), healthy]));
    disk.backup.set('data', store('From backup'));
    disk.backupFile = true;
    const messages: string[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, message, buttons) => {
      messages.push(String(message));
      buttons?.find(button => button.text === loc.settings.storage_restore_backup)?.onPress?.();
    });

    render(<UnlockWith />);
    await settle();
    fireEvent.changeText(screen.getByTestId('PasswordInput'), 'pw-a');
    fireEvent(screen.getByTestId('PasswordInput'), 'submitEditing');
    await settle();
    fireEvent.press(screen.getByTestId('StorageRestoreBackupButton-0'));
    await settle();

    expect(messages).toEqual([loc.settings.storage_restore_bucket_message]);
    expect(setWalletsInitialized).toHaveBeenCalledWith(true);
    const stored = JSON.parse(disk.primary.get('data')!);
    expect(stored[1]).toBe(healthy);
    expect(encryption.decrypt(stored[0], 'pw-a')).toContain('From backup');
  });

  it('copies offered again for a damaged bucket still say a bucket is repaired (seventh review)', async () => {
    const encryption = require('../../blue_modules/encryption');
    const healthy = encryption.encrypt(store('Second storage'), 'pw-b');
    disk.primary.set('data', JSON.stringify([encryption.encrypt(JSON.stringify({ no: 'wallets' }), 'pw-a'), healthy]));
    disk.backup.set('data', store('From backup'));
    disk.backupFile = true;
    const messages: string[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, message, buttons) => {
      messages.push(String(message));
      buttons?.find(button => button.text === loc.settings.storage_restore_backup)?.onPress?.();
    });

    render(<UnlockWith />);
    await settle();
    fireEvent.changeText(screen.getByTestId('PasswordInput'), 'pw-a');
    fireEvent(screen.getByTestId('PasswordInput'), 'submitEditing');
    await settle();
    disk.backup.set('data', store('Written later')); // the copy changes while the dialog is open
    fireEvent.press(screen.getByTestId('StorageRestoreBackupButton-0'));
    await settle();
    expect(presentAlert).toHaveBeenCalledWith({ message: loc.settings.storage_restore_changed });
    fireEvent.press(screen.getByTestId('StorageRestoreBackupButton-0'));
    await settle();

    expect(messages).toEqual([loc.settings.storage_restore_bucket_message, loc.settings.storage_restore_bucket_message]);
    expect(setWalletsInitialized).toHaveBeenCalledWith(true);
    expect(JSON.parse(disk.primary.get('data')!)[1]).toBe(healthy);
  });

  it('a store that reads again while the user confirms opens as usual; nothing is restored (fourth review)', async () => {
    disk.primary.set('data', store('Newer, only in the store'));
    disk.readFault = { data: 'locked' };
    disk.backup.set('data', store('Older backup'));
    disk.backupFile = true;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find(button => button.text === loc.settings.storage_restore_backup)?.onPress?.();
    });

    render(<UnlockWith />);
    await settle();
    disk.readFault = {}; // the keystore answers again
    fireEvent.press(screen.getByTestId('StorageRestoreBackupButton-0'));
    await settle();

    expect(presentAlert).toHaveBeenCalledWith({ message: loc.settings.storage_readable_again });
    expect(setWalletsInitialized).toHaveBeenCalledWith(true);
    expect(app.wallets.map(wallet => wallet.getLabel())).toEqual(['Newer, only in the store']);
    expect(disk.primary.get('data')).toContain('Newer, only in the store');
    expect(disk.backup.get('data')).toContain('Older backup');
    expect(disk.setAside).toEqual([]);
  });
});
