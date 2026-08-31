import assert from 'assert';

import {
  majorTomToGroundControl,
  setCustomElectrumPushNotificationsEnabled,
} from '../../blue_modules/notifications';
import { isCustomElectrumServerConfigured } from '../../blue_modules/BlueElectrum';
import { fetch } from '../../util/fetch';

jest.mock('../../blue_modules/BlueElectrum', () => ({
  isCustomElectrumServerConfigured: jest.fn(),
}));

jest.mock('../../util/fetch', () => ({
  fetch: jest.fn(),
}));

jest.mock('react-native-notifications', () => ({
  Notifications: {},
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map<string, string>();
  return {
    getItem: jest.fn((key: string) => Promise.resolve(storage.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      storage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      storage.delete(key);
      return Promise.resolve();
    }),
    __storage: storage,
  };
});

const isCustomElectrumServerConfiguredMock = isCustomElectrumServerConfigured as jest.Mock;
const fetchMock = fetch as jest.Mock;
const notificationsStorage = jest.requireMock('@react-native-async-storage/async-storage').__storage as Map<string, string>;

describe('Ground Control registration privacy', () => {
  beforeEach(() => {
    notificationsStorage.clear();
    notificationsStorage.set('PUSH_TOKEN', JSON.stringify({ token: 'push-token', os: 'ios' }));
    isCustomElectrumServerConfiguredMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('') });
  });

  it('does not send addresses or transaction IDs for a custom Electrum server without explicit consent', async () => {
    isCustomElectrumServerConfiguredMock.mockResolvedValue(true);

    await majorTomToGroundControl(['bc1qaddress'], [], ['transaction-id']);

    assert.strictEqual(fetchMock.mock.calls.length, 0);
  });

  it('sends registration data for a custom Electrum server only after explicit consent', async () => {
    isCustomElectrumServerConfiguredMock.mockResolvedValue(true);
    await setCustomElectrumPushNotificationsEnabled(true);

    await majorTomToGroundControl(['bc1qaddress'], [], ['transaction-id']);

    assert.strictEqual(fetchMock.mock.calls.length, 1);
    const [, options] = fetchMock.mock.calls[0];
    assert.deepStrictEqual(JSON.parse(options.body), {
      addresses: ['bc1qaddress'],
      hashes: [],
      txids: ['transaction-id'],
      token: 'push-token',
      os: 'ios',
    });
  });

  it('preserves push registrations when no custom Electrum server is configured', async () => {
    isCustomElectrumServerConfiguredMock.mockResolvedValue(false);

    await majorTomToGroundControl(['bc1qaddress'], [], ['transaction-id']);

    assert.strictEqual(fetchMock.mock.calls.length, 1);
  });
});
