import { getHeaderMenuOptions, usesHeaderMenu } from '../../components/HeaderMenu';

jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  Object.defineProperty(native.Platform, 'OS', { value: 'android', configurable: true });
  return native;
});
jest.mock('../../blue_modules/environment', () => ({ isTablet: false, isDesktop: false, isMacCatalyst: false }));

it('registers grouped screen commands on Android phones and removes duplicate right-header controls', () => {
  const headerRight = jest.fn();
  const actions = [{ id: 'scan_qr', text: 'Scan QR Code', onPress: jest.fn() }];
  expect(usesHeaderMenu).toBe(true);
  const options = getHeaderMenuOptions({ headerRight, unstable_headerRightItems: () => [] }, actions);
  expect(options.headerRight).toBeUndefined();
  expect(options.unstable_headerRightItems).toBeUndefined();
  expect(options.headerMenuActions).toEqual(actions);
});

it('keeps the modal Close button and its menu command on Android', () => {
  const navigationStyle = require('../../components/navigationStyle').default;
  const close = jest.fn();
  const options = navigationStyle({ onCloseButtonPressed: close })({ colors: {}, barStyle: 'dark-content' })({
    navigation: { getState: () => ({ index: 0 }), goBack: jest.fn() },
    route: { params: { presentation: 'modal' } },
  });
  expect(options.headerRight).toBeDefined();
  expect(options.headerMenuCloseAction.id).toBe('NavigationCloseButton');
  options.headerMenuCloseAction.onPress();
  expect(close).toHaveBeenCalledTimes(1);
});
