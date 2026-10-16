import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationOptions, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLayoutEffect, useMemo, useState } from 'react';

// Publish stable handlers once. Typing and focus changes must not update the route
// and cause the native search controller to be reconfigured while editing.
export function useHeaderSearch() {
  const navigation = useNavigation<
    NativeStackNavigationProp<{
      Search: {
        headerSearchBarOptions?: NativeStackNavigationOptions['headerSearchBarOptions'];
      };
    }>
  >();
  const [search, setSearch] = useState('');
  const [isSearchFocused, setSearchFocused] = useState(false);
  const headerSearchBarOptions = useMemo<NativeStackNavigationOptions['headerSearchBarOptions']>(
    () => ({
      onChangeText: event => setSearch(event.nativeEvent.text),
      onFocus: () => setSearchFocused(true),
      onBlur: () => setSearchFocused(false),
    }),
    [],
  );

  useLayoutEffect(() => {
    navigation.setParams({ headerSearchBarOptions });
  }, [navigation, headerSearchBarOptions]);

  return { search, isSearchFocused };
}
