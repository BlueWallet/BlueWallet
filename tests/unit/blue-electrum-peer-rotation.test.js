import assert from 'assert';

jest.mock('electrum-client', () =>
  jest.fn().mockImplementation((_net, _tls, port, host) => ({
    host,
    port,
    status: true,
    timeLastCall: Date.now(),
    close: jest.fn(),
    initElectrum: jest.fn(async () => ['MockElectrum 1.4']),
    blockchainHeaders_subscribe: jest.fn(async () => ({ height: 1 })),
    server_ping: jest.fn(async () => true),
    request: jest.fn(async () => ''),
    onError: () => {},
  })),
);

import * as BlueElectrum from '../../blue_modules/BlueElectrum';

const ElectrumClientMock = require('electrum-client');
const DefaultPreference = require('react-native-default-preference');

describe('BlueElectrum peer rotation', () => {
  beforeEach(async () => {
    await DefaultPreference.reset();
    ElectrumClientMock.mockClear();
    BlueElectrum.forceDisconnect();
    await BlueElectrum.setDisabled(false);
    await BlueElectrum.removePreferredServer();
  });

  it('uses each hardcoded peer once per full cycle', async () => {
    for (let i = 0; i < BlueElectrum.hardcodedPeers.length; i++) {
      await BlueElectrum.connectMain();
      BlueElectrum.forceDisconnect();
    }

    const attemptedHosts = ElectrumClientMock.mock.calls
      .slice(0, BlueElectrum.hardcodedPeers.length)
      .map(call => call[3]); // constructor arg order: net, tls, port, host, protocol

    assert.strictEqual(attemptedHosts[0], 'electrum1.bluewallet.io');
    assert.strictEqual(new Set(attemptedHosts).size, BlueElectrum.hardcodedPeers.length);
    assert.ok(attemptedHosts.includes('electrum.acinq.co'));
  });
});
