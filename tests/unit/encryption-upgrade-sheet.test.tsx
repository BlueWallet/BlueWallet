/**
 * H08 · The encryption upgrade window: "later" changes nothing, keeping the
 * password upgrades as it is, and a new password needs a minimum length and a
 * matching repeat. Driven against the real store on the storage double.
 */
import React from 'react';
import { act, fireEvent, render as renderPlain, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import * as encryption from '../../blue_modules/encryption';
import { BlueApp, olderBackupCopies } from '../../class/blue-app';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import presentAlert from '../../components/Alert';
import { passwordStrength } from '../../components/settings/passwordStrength';
import { BlueDefaultTheme } from '../../components/themes';
import loc from '../../loc';
import EncryptionUpgradeSheet from '../../screen/EncryptionUpgradeSheet';
import { appOn, StorageDouble } from './helpers/storage-double';

jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { NotificationError: 'notificationError', NotificationSuccess: 'notificationSuccess' },
}));
jest.mock('../../components/Alert', () => ({ __esModule: true, default: jest.fn(), AlertType: { Alert: 0, Toast: 1 } }));

const goBack = jest.fn();
jest.mock('../../hooks/useExtendedNavigation', () => ({ useExtendedNavigation: () => ({ goBack, navigate: jest.fn() }) }));

let app: BlueApp;
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({
    upgradeEncryption: (password?: string) => app.upgradeEncryption(password),
    hasOlderBackupCopies: () => app.hasOlderBackupCopies(),
  }),
}));

const WORDS_A = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const WORDS_B = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const bucket = (words: string, label: string) => {
  const wallet = NeuraiHDWallet.forNetwork('mainnet', words);
  wallet.setLabel(label);
  return JSON.stringify({ wallets: [JSON.stringify(wallet)], tx_metadata: {}, counterparty_metadata: {} });
};
const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const show = () =>
  renderPlain(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider value={BlueDefaultTheme as never}>
        <EncryptionUpgradeSheet />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
const settle = () => act(async () => new Promise(resolve => setTimeout(resolve, 120)));
const formats = (disk: StorageDouble) => (JSON.parse(disk.primary.get('data')!) as string[]).map(encryption.bucketFormat);

async function openLegacy(...buckets: Array<[string, string, string]>) {
  const data = JSON.stringify(buckets.map(([words, label, password]) => encryption.encrypt(bucket(words, label), password)));
  const disk = new StorageDouble().seed({ data, data_encrypted: '1' });
  app = appOn(disk);
  await app.loadFromDisk(buckets[0][2]);
  return disk;
}

describe('EncryptionUpgradeSheet (H08)', () => {
  beforeEach(() => {
    goBack.mockClear();
    (presentAlert as jest.Mock).mockClear();
  });

  it('"later" closes the window and writes nothing', async () => {
    const disk = await openLegacy([WORDS_A, 'Savings', 'pw-a']);
    const before = disk.primary.get('data');
    show();
    fireEvent.press(screen.getByTestId('EncryptionUpgradeLater'));
    expect(goBack).toHaveBeenCalled();
    expect(disk.primary.get('data')).toBe(before);
  });

  it('keeping the password upgrades the store as it is', async () => {
    const disk = await openLegacy([WORDS_A, 'Savings', 'pw-a']);
    show();
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNow'));
    fireEvent.press(screen.getByTestId('EncryptionUpgradeKeep'));
    await settle();
    expect(formats(disk)).toEqual(['nw2']);
    expect(await appOn(disk).loadFromDisk('pw-a')).toBe(true);
    expect(presentAlert).toHaveBeenCalledWith({
      tone: 'success',
      title: loc.settings.encryption_upgrade_done,
      message: loc.settings.encryption_upgrade_done_text,
    });
    expect(goBack).toHaveBeenCalled();
  });

  it('says older recovery copies keep the old encryption, only when the phone has any', async () => {
    const disk = await openLegacy([WORDS_A, 'Savings', 'pw-a']);
    const first = show();
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNow'));
    await settle();
    expect(screen.queryByTestId('EncryptionUpgradeOlderCopies')).toBeNull();
    first.unmount();

    disk.kept.set('/test-cache/keyvalue.realm.kept-1', { data: new Map([['data', 'older']]), savedAt: 1 });
    show();
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNow'));
    await settle();
    expect(screen.getByText(loc.settings.encryption_upgrade_older_copies)).toBeTruthy();
  });

  it('a new password must be long enough and repeated the same before it is used', async () => {
    const disk = await openLegacy([WORDS_A, 'Savings', 'pw-a']);
    show();
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNow'));
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNew'));
    const save = () => screen.getByTestId('EncryptionUpgradeSave');

    fireEvent.changeText(screen.getByTestId('EncryptionUpgradePassword'), 'short');
    fireEvent.changeText(screen.getByTestId('EncryptionUpgradeConfirm'), 'short');
    expect(save().props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('EncryptionUpgradeStrength').props.children).toBe(loc.settings.password_strength_weak);

    fireEvent.changeText(screen.getByTestId('EncryptionUpgradePassword'), 'river candle orbit 42');
    expect(screen.getByText(loc.settings.encryption_upgrade_mismatch)).toBeTruthy();
    expect(save().props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('EncryptionUpgradeStrength').props.children).toBe(loc.settings.password_strength_strong);

    fireEvent.changeText(screen.getByTestId('EncryptionUpgradeConfirm'), 'river candle orbit 42');
    expect(save().props.accessibilityState.disabled).toBe(false);
    fireEvent.press(save());
    await settle();

    expect(formats(disk)).toEqual(['nw2']);
    expect(await appOn(disk).loadFromDisk('pw-a')).toBe(false);
    expect(await appOn(disk).loadFromDisk('river candle orbit 42')).toBe(true);
    expect(goBack).toHaveBeenCalled();
  });

  it('a new password that opens another storage is refused with a notice, and the window stays', async () => {
    const disk = await openLegacy([WORDS_A, 'Real', 'pw-a-1234'], [WORDS_B, 'Second', 'pw-b-1234']);
    const before = disk.primary.get('data');
    show();
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNow'));
    fireEvent.press(screen.getByTestId('EncryptionUpgradeNew'));
    fireEvent.changeText(screen.getByTestId('EncryptionUpgradePassword'), 'pw-b-1234');
    fireEvent.changeText(screen.getByTestId('EncryptionUpgradeConfirm'), 'pw-b-1234');
    fireEvent.press(screen.getByTestId('EncryptionUpgradeSave'));
    await settle();

    expect(presentAlert).toHaveBeenCalledWith({ tone: 'warning', message: loc.settings.encryption_upgrade_in_use });
    expect(disk.primary.get('data')).toBe(before);
    expect(goBack).not.toHaveBeenCalled();
  });
});

describe('older backup copies (H08 notice)', () => {
  it('counts copies set aside and the old Documents copy, not the backup in use, side files or reset files', () => {
    const listing = [
      { place: 'caches', name: 'keyvalue.realm' },
      { place: 'caches', name: 'keyvalue.realm.lock' },
      { place: 'caches', name: 'keyvalue.realm.kept-1795000000' },
      { place: 'caches', name: 'keyvalue.realm.kept-1795000000.management' },
      { place: 'documents', name: 'keyvalue.realm' },
      { place: 'documents', name: 'keyvalue.realm.superseded-17' },
      { place: 'documents', name: 'keyvalue.realm.stale-abc' },
      { place: 'documents', name: 'keyvalue.realm.kept-2.reset-99' },
      { place: 'documents', name: 'photo.jpg' },
    ] as const;
    expect(olderBackupCopies(listing)).toEqual([
      'keyvalue.realm.kept-1795000000',
      'keyvalue.realm',
      'keyvalue.realm.superseded-17',
      'keyvalue.realm.stale-abc',
    ]);
    expect(olderBackupCopies([{ place: 'caches', name: 'keyvalue.realm' }])).toEqual([]);
  });
});

describe('password strength (H08 meter)', () => {
  it.each([
    ['', 'weak'],
    ['12345678', 'weak'],
    ['aaaaaaaaaaaaaaaaaaaa', 'weak'],
    ['abcdefgh', 'weak'],
    ['Abcdef1!', 'fair'],
    ['lowercaseonly', 'fair'],
    ['Mountain7river', 'strong'],
    ['four plain words here', 'strong'],
  ] as const)('%p reads as %s', (password, strength) => {
    expect(passwordStrength(password)).toBe(strength);
  });
});
