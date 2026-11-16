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
  });

  it('resolves Settings without headerLargeTitle on iOS', () => {
    const { createSettingsScreenOptions } = require('../../navigation/helpers/getSettingsHeaderOptions');
    const options = resolveScreenOptions(createSettingsScreenOptions(BlueDefaultTheme)('Settings'));
    expect(options.headerLargeTitle).toBeUndefined();
  });

  it('resolves Settings without headerLargeTitle on Android', () => {
    jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
      ...jest.requireActual('react-native/Libraries/Utilities/Platform'),
      OS: 'android',
      select: (specifics: Record<string, unknown>) => specifics.android,
    }));

    const { createSettingsScreenOptions } = require('../../navigation/helpers/getSettingsHeaderOptions');
    const options = resolveScreenOptions(createSettingsScreenOptions(BlueDefaultTheme)('Settings'));
    expect(options.headerLargeTitle).toBeUndefined();
  });
});
