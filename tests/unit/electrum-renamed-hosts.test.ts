import DefaultPreference from 'react-native-default-preference';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { GROUP_IO_BLUEWALLET } from '../../blue_modules/currency';

const mockHosts: string[] = [];
jest.mock('electrum-client', () =>
  jest.fn().mockImplementation((_net, _tls, _port, host) => {
    mockHosts.push(host);
    return { initElectrum: () => Promise.reject(new Error('no network in unit tests')), close: () => {} };
  }),
);

afterAll(() => BlueElectrum.forceDisconnect());

it.each([
  ['mainnet.foundationdevices.com', 'mainnet-0.foundation.xyz'],
  ['electrum1.bluewallet.io', 'electrum2.bluewallet.io'],
  ['Electrum3.BlueWallet.io', 'electrum2.bluewallet.io'],
])('preferred server saved as %s is moved to %s, the name its certificate is issued for', async (oldHost, newHost) => {
  mockHosts.length = 0;
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(BlueElectrum.ELECTRUM_HOST, oldHost);
  await DefaultPreference.set(BlueElectrum.ELECTRUM_SSL_PORT, '50002');

  await BlueElectrum.ensureConnected();

  expect(mockHosts.length).toBeGreaterThan(0);
  expect(mockHosts.every(host => host === newHost)).toBe(true);
  expect(await DefaultPreference.get(BlueElectrum.ELECTRUM_HOST)).toBe(newHost);
  expect(await DefaultPreference.get(BlueElectrum.ELECTRUM_SSL_PORT)).toBe('50002');
});
