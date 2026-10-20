import React from 'react';
import { act, render } from '@testing-library/react-native';
import Language from '../../screen/settings/Language';
import Currency from '../../screen/settings/Currency';
import SafeAreaFlatList from '../../components/SafeAreaFlatList';
import { withRouteParamHeaderOptions } from '../../components/navigationStyle';

let mockParams: any = {};
const mockNavigation = {
  setParams: jest.fn(params => {
    mockParams = { ...mockParams, ...params };
  }),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));
jest.mock('../../components/SafeAreaFlatList', () => 'SafeAreaFlatList');
jest.mock('../../components/SettingsSection', () => ({ SettingsListItem: 'SettingsListItem' }));
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => ({ language: 'en' }) }));
jest.mock('../../components/themes', () => ({ useTheme: () => ({ colors: {} }) }));
jest.mock('../../loc/languages', () => ({
  AvailableLanguages: [
    { label: 'English', value: 'en' },
    { label: 'Spanish', value: 'es' },
    { label: 'Esperanto', value: 'eo' },
  ],
}));
jest.mock('../../models/fiatUnit', () => ({
  FiatUnit: {
    USD: { endPointKey: 'USD', country: 'United States', symbol: '$' },
    UAH: { endPointKey: 'UAH', country: 'Ukraine', symbol: '₴' },
    EUR: { endPointKey: 'EUR', country: 'Europe', symbol: '€' },
  },
  FiatUnitSource: { Kraken: 'Kraken' },
}));
jest.mock('../../blue_modules/currency', () => ({
  getPreferredCurrency: async () => null,
  mostRecentFetchedRate: async () => ({ LastUpdated: null, Rate: null }),
}));

beforeEach(() => {
  mockParams = {};
  mockNavigation.setParams.mockClear();
});

it.each([
  { name: 'Language', Component: Language, key: 'value', initial: ['en', 'es', 'eo'], first: 'e', second: 'en', narrowed: ['en'] },
  {
    name: 'Currency',
    Component: Currency,
    key: 'endPointKey',
    initial: ['USD', 'UAH', 'EUR'],
    first: 'u',
    second: 'us',
    narrowed: ['USD'],
  },
])(
  '$name filters through the applied header callbacks without changing the route',
  async ({ Component, key, initial, first, second, narrowed }) => {
    const screen = render(<Component />);
    await act(async () => {});
    const list = () => screen.UNSAFE_getByType(SafeAreaFlatList).props;
    const options = () =>
      withRouteParamHeaderOptions({ headerSearchBarOptions: true })(
        {},
        {
          route: { params: mockParams },
          navigation: mockNavigation,
          theme: {} as any,
        },
      );
    const searchBar = options().headerSearchBarOptions!;
    const routeParams = mockParams;
    expect(list().data.map((item: any) => item[key])).toEqual(initial);
    act(() => searchBar.onChangeText!({ nativeEvent: { text: first } } as any));
    expect(list().data.length).toBeGreaterThan(narrowed.length);
    act(() => searchBar.onChangeText!({ nativeEvent: { text: second } } as any));
    expect(list().data.map((item: any) => item[key])).toEqual(narrowed);
    act(() => searchBar.onChangeText!({ nativeEvent: { text: '' } } as any));
    expect(list().data.map((item: any) => item[key])).toEqual(initial);
    if (Component === Currency) {
      expect(list().ListHeaderComponent).not.toBeNull();
      act(() => searchBar.onFocus!({} as any));
      expect(list().ListHeaderComponent).toBeNull();
      act(() => searchBar.onBlur!({} as any));
      expect(list().ListHeaderComponent).not.toBeNull();
    }
    expect(mockParams).toBe(routeParams);
    expect(options().headerSearchBarOptions).toBe(searchBar);
    expect(mockNavigation.setParams).toHaveBeenCalledTimes(1);
  },
);
