import React from 'react';
import { Text } from 'react-native';
import { act, render } from '@testing-library/react-native';
import { useHeaderSearch } from '../../hooks/useHeaderSearch';
import { withRouteParamHeaderOptions } from '../../components/navigationStyle';

let mockParams: any;
const mockSetParams = jest.fn(params => {
  mockParams = { ...mockParams, ...params };
});
const mockNavigation = { setParams: mockSetParams };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

function SearchScreen() {
  const { search, isSearchFocused } = useHeaderSearch();
  return <Text testID="state">{JSON.stringify({ search, isSearchFocused })}</Text>;
}

it('keeps the applied search options stable across typing, clearing, focus and blur', () => {
  mockParams = {};
  mockSetParams.mockClear();
  const screen = render(<SearchScreen />);
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
  const initialParams = mockParams;
  for (const text of ['b', 'bt', '']) {
    act(() => searchBar.onChangeText!({ nativeEvent: { text } } as any));
    expect(JSON.parse(screen.getByTestId('state').props.children).search).toBe(text);
    expect(options().headerSearchBarOptions).toBe(searchBar);
    expect(mockParams).toBe(initialParams);
  }
  act(() => searchBar.onFocus!({} as any));
  expect(JSON.parse(screen.getByTestId('state').props.children).isSearchFocused).toBe(true);
  act(() => searchBar.onBlur!({} as any));
  expect(JSON.parse(screen.getByTestId('state').props.children).isSearchFocused).toBe(false);
  expect(options().headerSearchBarOptions).toBe(searchBar);
  expect(mockSetParams).toHaveBeenCalledTimes(1);
});

it('applies false back visibility and transaction titles from route params', () => {
  const options = withRouteParamHeaderOptions({
    headerBackVisible: true,
    statusBarStyle: true,
    headerTitle: true,
  })(
    { headerBackVisible: true },
    {
      route: {
        params: {
          headerBackVisible: false,
          statusBarStyle: 'light',
          headerTitle: 'Pending',
        },
      },
      navigation: mockNavigation,
      theme: {} as any,
    },
  );
  expect(options).toMatchObject({
    headerBackVisible: false,
    statusBarStyle: 'light',
    headerTitle: 'Pending',
  });
});
