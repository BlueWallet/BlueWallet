import { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import { BlueDefaultTheme } from '../../components/themes';

const optionsContext = {
  navigation: { getState: () => ({ index: 1 }), goBack: jest.fn() },
  route: { params: {} },
};

const resolveScreenOptions = (options: unknown): NativeStackNavigationOptions =>
  typeof options === 'function'
    ? (options as (ctx: typeof optionsContext) => NativeStackNavigationOptions)(optionsContext)
    : (options as NativeStackNavigationOptions);

describe('createSettingsScreenOptions', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../../blue_modules/environment');
  });

  it('resolves Settings without headerLargeTitle before iOS 26 on iOS', () => {
    jest.doMock('../../blue_modules/environment', () => ({
      ...jest.requireActual('../../blue_modules/environment'),
      isIOS26OrHigher: false,
    }));

    const { createSettingsScreenOptions } = require('../../navigation/helpers/getSettingsHeaderOptions');
    const options = resolveScreenOptions(createSettingsScreenOptions(BlueDefaultTheme)('Settings'));
    expect(options.headerLargeTitle).toBeUndefined();
  });

  it('resolves Settings without headerLargeTitle before iOS 26 on Android', () => {
    jest.doMock('../../blue_modules/environment', () => ({
      ...jest.requireActual('../../blue_modules/environment'),
      isIOS26OrHigher: false,
    }));
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      ...jest.requireActual('react-native/Libraries/Utilities/Platform'),
      OS: 'android',
      select: (specifics: Record<string, unknown>) => specifics.android,
    }));

    const { createSettingsScreenOptions } = require('../../navigation/helpers/getSettingsHeaderOptions');
    const options = resolveScreenOptions(createSettingsScreenOptions(BlueDefaultTheme)('Settings'));
    expect(options.headerLargeTitle).toBeUndefined();
  });

  it('enables headerLargeTitle for Settings on iOS 26 and later', () => {
    jest.doMock('../../blue_modules/environment', () => ({
      ...jest.requireActual('../../blue_modules/environment'),
      isIOS26OrHigher: true,
    }));

    const { createSettingsScreenOptions } = require('../../navigation/helpers/getSettingsHeaderOptions');
    const options = resolveScreenOptions(createSettingsScreenOptions(BlueDefaultTheme)('Settings'));
    expect(options.headerLargeTitle).toBe(true);
    expect(options.headerLargeTitleShadowVisible).toBe(true);
  });
});
