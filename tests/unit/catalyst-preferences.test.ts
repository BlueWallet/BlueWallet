import { NativeModules } from 'react-native';
import DeviceInfo from 'react-native-device-info';

jest.mock('react-native-device-info', () => ({ getBundleId: jest.fn() }));

describe('Catalyst E2E preference isolation', () => {
  it('delegates non-enumerable native methods and always uses the isolated domain', async () => {
    jest.mocked(DeviceInfo.getBundleId).mockReturnValue('io.bluewallet.bluewallet.e2e');
    const get = jest.fn().mockResolvedValue('127.0.0.1');
    const set = jest.fn().mockResolvedValue(undefined);
    const setName = jest.fn().mockResolvedValue(undefined);
    NativeModules.RNDefaultPreference = Object.defineProperties(
      {},
      {
        get: { value: get },
        set: { value: set },
        setName: { value: setName },
      },
    );
    let preferences: typeof import('../e2e-appium/preferences').default;
    jest.isolateModules(() => {
      preferences = require('../e2e-appium/preferences').default;
    });
    await preferences!.setName();
    expect(setName).not.toHaveBeenCalled();
    expect(await preferences!.getName()).toBe('io.bluewallet.bluewallet.e2e');
    expect(await preferences!.get('electrum_host')).toBe('127.0.0.1');
    expect(get).toHaveBeenCalledWith('electrum_host');
    await preferences!.set('electrum_tcp_port', '50001');
    expect(set).toHaveBeenCalledWith('electrum_tcp_port', '50001');
  });

  it('refuses to load for an unrelated bundle', () => {
    jest.mocked(DeviceInfo.getBundleId).mockReturnValue('io.bluewallet.unrelated');
    expect(() => jest.isolateModules(() => require('../e2e-appium/preferences'))).toThrow('unrelated app');
  });
});
