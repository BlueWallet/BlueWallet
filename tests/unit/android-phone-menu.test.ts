import { getHeaderMenuOptions, usesHeaderMenu } from '../../components/HeaderMenu';

jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  Object.defineProperty(native.Platform, 'OS', { value: 'android', configurable: true });
  return native;
});
jest.mock('../../blue_modules/environment', () => ({ isTablet: false, isDesktop: false, isMacCatalyst: false }));

it('registers grouped screen commands on Android phones while preserving native navigation controls', () => {
  const headerRight = jest.fn();
  const actions = [{ id: 'scan_qr', text: 'Scan QR Code', onPress: jest.fn() }];
  expect(usesHeaderMenu).toBe(true);
  expect(getHeaderMenuOptions({ headerRight }, actions)).toMatchObject({ headerRight, headerMenuActions: actions });
});
